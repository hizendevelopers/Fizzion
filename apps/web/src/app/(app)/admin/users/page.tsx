import { AdminUsersClient } from "@/components/app/admin-users-client";
import { requireAdmin } from "@/lib/auth/session";

export default async function AdminUsersPage() {
  // Defense in depth: middleware already blocks non-admins from /admin/*,
  // but this route also touches the invite/role-management API directly.
  const { user } = await requireAdmin();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">Users</h1>
        <p className="mt-2 max-w-2xl text-sm leading-7 text-muted-foreground">
          Invite teammates, change their role, or deactivate access.
        </p>
      </div>
      <AdminUsersClient currentUserId={user.id} />
    </div>
  );
}
