/**
 * One-time bootstrap: invites the very first admin user for the seeded
 * "coca-cola-iraq" organization. Later users are invited through the
 * Admin > Users page in the app (which requires an existing admin).
 *
 * Requires the 202608110001_auth_rbac_and_rls.sql and
 * 202608110002_auth_rbac_seed.sql migrations to already be applied.
 *
 * Usage:
 *   npx tsx scripts/invite-first-admin.ts someone@example.com
 */
import { getSupabaseAdminClient } from "@/lib/supabase/server";

async function main() {
  const email = process.argv[2]?.trim();
  if (!email) {
    console.error("Usage: npx tsx scripts/invite-first-admin.ts <email>");
    process.exit(1);
  }

  const admin = getSupabaseAdminClient();

  const orgRes = await admin
    .from("organizations")
    .select("id")
    .eq("slug", "coca-cola-iraq")
    .maybeSingle();

  const organizationId = (orgRes.data as { id: string } | null)?.id;
  if (!organizationId) {
    throw new Error(
      "No organization found for slug 'coca-cola-iraq'. Apply 202608110002_auth_rbac_seed.sql first.",
    );
  }

  const roleRes = await admin
    .from("roles")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("slug", "admin")
    .maybeSingle();

  const adminRoleId = (roleRes.data as { id: string } | null)?.id;
  if (!adminRoleId) {
    throw new Error("No 'admin' role found. Apply 202608110002_auth_rbac_seed.sql first.");
  }

  const baseUrl = (process.env.APP_BASE_URL ?? "http://localhost:3000").replace(/\/+$/, "");
  const redirectTo = `${baseUrl}/auth/callback?next=/set-password`;

  const inviteRes = await admin.auth.admin.inviteUserByEmail(email, { redirectTo });
  if (inviteRes.error || !inviteRes.data.user) {
    throw new Error(`Invite failed: ${inviteRes.error?.message ?? "unknown error"}`);
  }

  const userId = inviteRes.data.user.id;

  const memberRes = await admin
    .from("organization_members")
    .upsert(
      {
        organization_id: organizationId,
        user_id: userId,
        role_id: adminRoleId,
        status: "active",
      },
      { onConflict: "organization_id,user_id" },
    )
    .select("id")
    .maybeSingle();

  if (memberRes.error) {
    throw new Error(`Could not create organization membership: ${memberRes.error.message}`);
  }

  console.log(`Invited ${email} as an admin of coca-cola-iraq. Check their inbox for the invite email.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
