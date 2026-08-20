-- Seeds the one organization this deployment serves, a small fixed set
-- of roles, and the permissions they carry. Idempotent (safe to re-run).

insert into public.organizations (slug, name, name_ar, market, timezone)
values ('coca-cola-iraq', 'Coca-Cola Iraq', 'كوكا كولا العراق', 'Iraq', 'Asia/Baghdad')
on conflict (slug) do nothing;

insert into public.permissions (key, name, description)
values
  ('admin.manage', 'Manage administration', 'Manage users, roles, sources, and system settings.'),
  ('content.write', 'Create and edit content', 'Create, edit, import, and run scans/scrapes across modules.'),
  ('content.read', 'View content', 'View dashboards, records, and reports across modules.')
on conflict (key) do nothing;

insert into public.roles (organization_id, slug, name, description, is_system)
select o.id, r.slug, r.name, r.description, true
from public.organizations o
cross join (
  values
    ('admin', 'Administrator', 'Full access, including user and role management.'),
    ('editor', 'Editor', 'Can create, edit, import, and run scans across modules.'),
    ('viewer', 'Viewer', 'Read-only access to dashboards and records.')
) as r(slug, name, description)
where o.slug = 'coca-cola-iraq'
on conflict (organization_id, slug) do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.organizations o on o.id = r.organization_id and o.slug = 'coca-cola-iraq'
join public.permissions p on
  (r.slug = 'admin' and p.key in ('admin.manage', 'content.write', 'content.read'))
  or (r.slug = 'editor' and p.key in ('content.write', 'content.read'))
  or (r.slug = 'viewer' and p.key = 'content.read')
on conflict (role_id, permission_id) do nothing;
