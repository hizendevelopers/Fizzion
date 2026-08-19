import Link from "next/link";

import { requireAdmin } from "@/lib/auth/session";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

type RoleRow = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  role_permissions: Array<{ permissions: { key: string; name: string } | null }>;
};

export default async function AdminRolesPage() {
  const { membership } = await requireAdmin();
  const admin = getSupabaseAdminClient();

  const rolesRes = await admin
    .from("roles")
    .select("id, slug, name, description, role_permissions(permissions(key, name))")
    .eq("organization_id", membership.organizationId)
    .order("name", { ascending: true });

  const roles = (rolesRes.data ?? []) as unknown as RoleRow[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">Roles</h1>
        <p className="mt-2 max-w-2xl text-sm leading-7 text-muted-foreground">
          Fixed roles and what each one can do. Assign roles to people from{" "}
          <Link className="font-medium text-brand-red" href="/admin/users">
            Users
          </Link>
          .
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {roles.map((role) => (
          <section
            className="rounded-[1.6rem] border border-[#E4E7EC] bg-white/92 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.08)]"
            key={role.id}
          >
            <h2 className="text-base font-semibold text-foreground">{role.name}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{role.description}</p>
            <ul className="mt-4 space-y-2">
              {role.role_permissions.map((entry, index) =>
                entry.permissions ? (
                  <li className="rounded-xl border border-[#E4E7EC] bg-white px-3 py-2 text-sm text-foreground" key={index}>
                    {entry.permissions.name}
                  </li>
                ) : null,
              )}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
