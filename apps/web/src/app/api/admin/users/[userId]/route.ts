import { NextResponse } from "next/server";

import { authErrorResponse, requireAdmin } from "@/lib/auth/session";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { updateMemberSchema } from "@/lib/admin-schemas";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    const { user, membership } = await requireAdmin();
    const { userId } = await params;
    const admin = getSupabaseAdminClient();

    const body = await request.json().catch(() => null);
    const parsed = updateMemberSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          error: { code: "INVALID_UPDATE", message: parsed.error.issues[0]?.message ?? "Invalid update payload." },
        },
        { status: 400 },
      );
    }

    if (userId === user.id && parsed.data.status === "inactive") {
      return NextResponse.json(
        { ok: false, error: { code: "CANNOT_DEACTIVATE_SELF", message: "You cannot deactivate your own account." } },
        { status: 400 },
      );
    }

    const patch: Record<string, unknown> = {};

    if (parsed.data.roleSlug) {
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
      patch.role_id = roleId;
    }

    if (parsed.data.status) {
      patch.status = parsed.data.status;
    }

    if (Object.keys(patch).length === 0) {
      return NextResponse.json(
        { ok: false, error: { code: "NO_CHANGES", message: "Nothing to update." } },
        { status: 400 },
      );
    }

    const updateRes = await admin
      .from("organization_members")
      .update(patch)
      .eq("organization_id", membership.organizationId)
      .eq("user_id", userId)
      .select("id")
      .maybeSingle();

    if (updateRes.error) {
      throw new Error(updateRes.error.message);
    }

    if (!updateRes.data) {
      return NextResponse.json(
        { ok: false, error: { code: "MEMBER_NOT_FOUND", message: "That member was not found in your organization." } },
        { status: 404 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return authErrorResponse(error);
  }
}

/** Deactivates a member (soft-disable, not a hard delete). */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    const { user, membership } = await requireAdmin();
    const { userId } = await params;

    if (userId === user.id) {
      return NextResponse.json(
        { ok: false, error: { code: "CANNOT_DEACTIVATE_SELF", message: "You cannot deactivate your own account." } },
        { status: 400 },
      );
    }

    const admin = getSupabaseAdminClient();
    const updateRes = await admin
      .from("organization_members")
      .update({ status: "inactive" })
      .eq("organization_id", membership.organizationId)
      .eq("user_id", userId)
      .select("id")
      .maybeSingle();

    if (updateRes.error) {
      throw new Error(updateRes.error.message);
    }

    if (!updateRes.data) {
      return NextResponse.json(
        { ok: false, error: { code: "MEMBER_NOT_FOUND", message: "That member was not found in your organization." } },
        { status: 404 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return authErrorResponse(error);
  }
}
