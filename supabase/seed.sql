insert into public.organizations (slug, name, name_ar, market)
values
  ('coca_cola_iraq', 'Coca-Cola Iraq', 'كوكاكولا العراق', 'Iraq'),
  ('hizen', 'Hizen', 'هايزن', 'Iraq')
on conflict (slug) do update set
  name = excluded.name,
  name_ar = excluded.name_ar,
  market = excluded.market;

insert into public.permissions (key, name, description)
values
  ('platform.manage', 'Platform management', 'Manage platform-wide settings and integrations'),
  ('org.manage', 'Organization management', 'Manage organization settings and members'),
  ('review.manage', 'Review workflow', 'Review and correct detections'),
  ('report.export', 'Report export', 'Create and export reports'),
  ('ooh.manage', 'OOH management', 'Manage OOH inventory and assignments'),
  ('source.upload', 'Source upload', 'Upload and manage partner source files')
on conflict (key) do update set
  name = excluded.name,
  description = excluded.description;

with orgs as (
  select id, slug from public.organizations
)
insert into public.roles (organization_id, slug, name, description, is_system)
select
  orgs.id,
  role.slug,
  role.name,
  role.description,
  true
from orgs
cross join (
  values
    ('hizen_super_admin', 'Hizen Super Admin', 'Manage the complete platform'),
    ('coca_cola_admin', 'Coca-Cola Admin', 'Manage Coca-Cola users, reports, dashboards, and alerts'),
    ('analyst', 'Analyst', 'Review data, compare brands, and export reports'),
    ('media_reviewer', 'Media Reviewer', 'Review unidentified detections and boundary corrections'),
    ('ooh_manager', 'OOH Manager', 'Manage OOH locations, assignments, and verification'),
    ('viewer', 'Viewer', 'View approved dashboards and reports'),
    ('partner_uploader', 'Partner Uploader', 'Upload assigned recordings without analytics access')
) as role(slug, name, description)
on conflict (organization_id, slug) do update set
  name = excluded.name,
  description = excluded.description,
  is_system = excluded.is_system;

insert into public.social_platforms (key, name, oauth_supported, public_monitoring_supported)
values
  ('instagram', 'Instagram', true, true),
  ('facebook', 'Facebook', true, true),
  ('tiktok', 'TikTok', true, true),
  ('youtube', 'YouTube', true, true),
  ('x', 'X', true, true)
on conflict (key) do update set
  name = excluded.name,
  oauth_supported = excluded.oauth_supported,
  public_monitoring_supported = excluded.public_monitoring_supported;

insert into public.data_retention_policies (organization_id, data_domain, retention_days, legal_hold, notes)
select id, policy.data_domain, policy.retention_days, false, policy.notes
from public.organizations
cross join (
  values
    ('tv_raw_recordings', 30, 'Suggested default raw TV retention'),
    ('tv_extracted_clips', 365, 'Suggested default occurrence clip retention'),
    ('website_screenshots', 365, 'Suggested default website screenshot retention'),
    ('social_raw_payloads', 90, 'Suggested default raw social payload retention'),
    ('audit_logs', 365, 'Minimum 12 month audit log retention')
) as policy(data_domain, retention_days, notes)
on conflict (organization_id, data_domain) do update set
  retention_days = excluded.retention_days,
  notes = excluded.notes;

