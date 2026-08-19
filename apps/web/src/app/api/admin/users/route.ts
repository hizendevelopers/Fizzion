import { NextResponse } from "next/server";

import { authErrorResponse, requireAdmin } from "@/lib/auth/session";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { getAppBaseUrl } from "@/lib/app-origin";
import { inviteMemberSchema } from "@/lib/admin-schemas";

type MemberRow = {
  id: string;
  organization_id: string;
  user_id: string;
  status: string;
  created_at: string;
  roles: { id: string; slug: string; name: string } | null;
};

export async function GET() {
  try {
    const { membership } = await requireAdmin();
    const admin = getSupabaseAdminClient();

    const membersRes = await admin
      .from("organization_members")
      .select("id, organization_id, user_id, status, created_at, roles(id, slug, name)")
      .eq("organization_id", membership.organizationId)
      .order("created_at", { ascending: true });

    if (membersRes.error) {
      throw new Error(membersRes.error.message);
    }

    const members = (membersRes.data ?? []) as unknown as MemberRow[];
    const userIds = new Set(members.map((member) => member.user_id));

    // The Admin Auth API doesn't support "get many users by id" directly,
    // so we page through listUsers() and keep only the ones we need.
    // Fine for an internal team; would need a different approach at
    // large scale.
    const emailByUserId = new Map<string, string | null>();
    let page = 1;
    const perPage = 200;
    while (userIds.size > emailByUserId.size) {
      const listRes = await admin.auth.admin.listUsers({ page, perPage });
      if (listRes.error || listRes.data.users.length === 0) break;
      for (const user of listRes.data.users) {
        if (userIds.has(user.id)) {
          emailByUserId.set(user.id, user.email ?? null);
        }
      }
      if (listRes.data.users.length < perPage) break;
      page += 1;
    }

    return NextResponse.json({
      ok: true,
      members: members.map((member) => ({
        id: member.id,
        userId: member.user_id,
        email: emailByUserId.get(member.user_id) ?? null,
        status: member.status,
        roleSlug: member.roles?.slug ?? null,
        roleName: member.roles?.name ?? null,
        createdAt: member.created_at,
      })),
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const { membership } = await requireAdmin();
    const admin = getSupabaseAdminClient();

    const body = await request.json().catch(() => null);
    const parsed = inviteMemberSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          error: { code: "INVALID_INVITE", message: parsed.error.issues[0]?.message ?? "Invalid invite payload." },
        },
        { status: 400 },
      );
    }

    const roleRes = await admin
      .from("roles")
      .select("id")
      .eq("organization_id", membership.organizationId)
      .eq("slug", parsed.data.roleSlug)
      .maybeSingle();

    const roleId = (roleRes.data as { id: string } | null)?.id;
    if (!roleId) {
      return NextResponse.json(
        { ok: false, error: { code: "ROLE_NOT_FOUND", message: "That role does not exist for this organization." } },
        { status: 400 },
      );
    }

    const baseUrl = await getAppBaseUrl();
    const inviteRes = await admin.auth.admin.inviteUserByEmail(parsed.data.email, {
      redirectTo: `${baseUrl}/auth/callback?next=/set-password`,
    });

    if (inviteRes.error || !inviteRes.data.user) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "INVITE_FAILED",
            message: inviteRes.error?.message ?? "Could not send the invite email.",
          },
        },
        { status: 502 },
      );
    }

    const memberRes = await admin
      .from("organization_members")
      .upsert(
        {
          organization_id: membership.organizationId,
          user_id: inviteRes.data.user.id,
          role_id: roleId,
          status: "invited",
        },
        { onConflict: "organization_id,user_id" },
      )
      .select("id")
      .maybeSingle();

    if (memberRes.error) {
      throw new Error(memberRes.error.message);
    }

    return NextResponse.json({ ok: true, invitedEmail: parsed.data.email });
  } catch (error) {
    return authErrorResponse(error);
  }
}
