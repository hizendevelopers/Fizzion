import { NextResponse } from "next/server";

import { createSupabaseRequestClient, getSupabaseAdminClient } from "@/lib/supabase/server";

export type SessionUser = {
  id: string;
  email: string | null;
};

export type OrgMembership = {
  organizationId: string;
  roleId: string | null;
  roleSlug: string | null;
  permissions: string[];
  status: string;
};

export class AuthError extends Error {
  status: number;
  code: string;

  constructor(code: string, message: string, status = 401) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

/** Returns the signed-in user for the current request, or null. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const supabase = await createSupabaseRequestClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    return null;
  }

  return { id: data.user.id, email: data.user.email ?? null };
}

/** Returns the signed-in user, or throws a 401 AuthError. */
export async function requireSessionUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) {
    throw new AuthError("UNAUTHENTICATED", "Sign in required.", 401);
  }
  return user;
}

/**
 * Looks up the caller's active organization membership, role slug, and
 * flattened permission keys. Uses the service-role client because the
 * lookup itself needs to succeed before we know whether the caller is
 * allowed to do anything — RLS on these tables still protects direct
 * anon/browser access.
 */
export async function getOrgMembership(userId: string): Promise<OrgMembership | null> {
  const admin = getSupabaseAdminClient();

  const memberRes = await admin
    .from("organization_members")
    .select("organization_id, role_id, status")
    .eq("user_id", userId)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  const memberRow = memberRes.data as
    | { organization_id: string; role_id: string | null; status: string }
    | null;

  if (!memberRow) {
    return null;
  }

  let roleSlug: string | null = null;
  let permissions: string[] = [];

  if (memberRow.role_id) {
    const roleRes = await admin
      .from("roles")
      .select("slug")
      .eq("id", memberRow.role_id)
      .maybeSingle();
    roleSlug = (roleRes.data as { slug: string } | null)?.slug ?? null;

    const permRes = await admin
      .from("role_permissions")
      .select("permissions(key)")
      .eq("role_id", memberRow.role_id);

    permissions = ((permRes.data ?? []) as unknown as Array<{ permissions: { key: string } | null }>)
      .map((row) => row.permissions?.key)
      .filter((key): key is string => Boolean(key));
  }

  return {
    organizationId: memberRow.organization_id,
    roleId: memberRow.role_id,
    roleSlug,
    permissions,
    status: memberRow.status,
  };
}

export async function requireOrgMembership(userId: string): Promise<OrgMembership> {
  const membership = await getOrgMembership(userId);
  if (!membership) {
    throw new AuthError(
      "NO_ORGANIZATION_MEMBERSHIP",
      "This account is not attached to an organization yet. Ask an administrator to invite you.",
      403,
    );
  }
  return membership;
}

function hasAdminAccess(membership: OrgMembership) {
  return membership.roleSlug === "admin" || membership.permissions.includes("admin.manage");
}

/** Throws unless the signed-in caller has the `admin` role. */
export async function requireAdmin(): Promise<{ user: SessionUser; membership: OrgMembership }> {
  const user = await requireSessionUser();
  const membership = await requireOrgMembership(user.id);
  if (!hasAdminAccess(membership)) {
    throw new AuthError("FORBIDDEN", "Administrator access is required for this action.", 403);
  }
  return { user, membership };
}

/** Convenience wrapper: signed-in + belongs to an organization. */
export async function requireMembership(): Promise<{ user: SessionUser; membership: OrgMembership }> {
  const user = await requireSessionUser();
  const membership = await requireOrgMembership(user.id);
  return { user, membership };
}

/** Converts an AuthError (or unknown error) into a JSON API response. */
export function authErrorResponse(error: unknown) {
  if (error instanceof AuthError) {
    return NextResponse.json(
      { ok: false, error: { code: error.code, message: error.message } },
      { status: error.status },
    );
  }

  return NextResponse.json(
    {
      ok: false,
      error: {
        code: "INTERNAL_ERROR",
        message: error instanceof Error ? error.message : "An unexpected error occurred.",
      },
    },
    { status: 500 },
  );
}
