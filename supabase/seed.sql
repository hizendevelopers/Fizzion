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
  ('source.upload', 'Source upload', 'Upload and manage partner source files'),
  ('tv.source.manage', 'TV source management', 'Manage TV channel sources, authorizations, and detection settings'),
  ('tv.recording.control', 'TV recording control', 'Start and stop authorized TV recording sessions'),
  ('tv.review.execute', 'TV review execution', 'Approve, reject, and correct TV advertisement review items')
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

with orgs as (
  select id, slug from public.organizations
)
insert into public.brands (
  organization_id,
  name,
  name_ar,
  parent_company,
  category,
  competitor_group,
  website_domains,
  ocr_keywords,
  speech_keywords,
  is_active
)
select
  orgs.id,
  brand.name,
  brand.name_ar,
  brand.parent_company,
  'Beverage',
  brand.competitor_group,
  brand.website_domains,
  brand.ocr_keywords,
  brand.speech_keywords,
  true
from orgs
cross join (
  values
    ('Coca-Cola', 'Coca-Cola', 'The Coca-Cola Company', 'cola', array['coca-cola.com'], array['coca cola', 'coca-cola'], array['coca cola', 'coca-cola']),
    ('Pepsi', 'Pepsi', 'PepsiCo', 'cola', array['pepsi.com'], array['pepsi'], array['pepsi'])
) as brand(name, name_ar, parent_company, competitor_group, website_domains, ocr_keywords, speech_keywords)
on conflict (organization_id, name) do update set
  name_ar = excluded.name_ar,
  parent_company = excluded.parent_company,
  category = excluded.category,
  competitor_group = excluded.competitor_group,
  website_domains = excluded.website_domains,
  ocr_keywords = excluded.ocr_keywords,
  speech_keywords = excluded.speech_keywords,
  is_active = excluded.is_active;

with orgs as (
  select id from public.organizations
),
partner_upsert as (
  insert into public.tv_source_partners (organization_id, name, contact_name, contact_email, source_contract_ref, sla_notes)
  select
    orgs.id,
    'Authorized Feed Pending / Sandbox Lab',
    'Hizen Ops',
    'ops@hizen.example',
    'ARY-SANDBOX-PENDING',
    'Used only for deterministic sandbox fixtures and manual upload testing until an authorized ARY News source is approved.'
  from orgs
  on conflict do nothing
  returning id, organization_id
)
insert into public.tv_channels (
  organization_id,
  name,
  name_en,
  name_ar,
  slug,
  country_code,
  monitoring_market,
  category,
  source_type,
  source_verification_state,
  source_authorization_status,
  recording_status,
  expected_schedule,
  retention_days,
  source_timezone,
  default_timezone,
  display_timezone,
  current_source_health,
  is_active,
  notes
)
select
  orgs.id,
  'ARY News',
  'ARY News',
  'ARY News',
  'ary-news',
  'PK',
  'Iraq',
  'News',
  'sandbox_fixture',
  'pending_authorization',
  'pending_authorization',
  'inactive',
  '24/7 expected when an authorized linear feed is approved',
  30,
  'Asia/Karachi',
  'Asia/Baghdad',
  'Asia/Baghdad',
  'awaiting_authorized_feed',
  true,
  'Recording is disabled until an authorized broadcast source and monitoring approval are configured. Sandbox and manual upload remain available for deterministic testing.'
from orgs
on conflict (organization_id, slug) do update set
  name = excluded.name,
  name_en = excluded.name_en,
  name_ar = excluded.name_ar,
  country_code = excluded.country_code,
  monitoring_market = excluded.monitoring_market,
  category = excluded.category,
  source_type = excluded.source_type,
  source_verification_state = excluded.source_verification_state,
  source_authorization_status = excluded.source_authorization_status,
  recording_status = excluded.recording_status,
  expected_schedule = excluded.expected_schedule,
  retention_days = excluded.retention_days,
  source_timezone = excluded.source_timezone,
  default_timezone = excluded.default_timezone,
  display_timezone = excluded.display_timezone,
  current_source_health = excluded.current_source_health,
  is_active = excluded.is_active,
  notes = excluded.notes;

with channels as (
  select id, organization_id from public.tv_channels where slug = 'ary-news'
),
partners as (
  select tsp.id, tsp.organization_id
  from public.tv_source_partners tsp
  where tsp.name = 'Authorized Feed Pending / Sandbox Lab'
)
insert into public.tv_sources (
  organization_id,
  channel_id,
  source_partner_id,
  source_type,
  connection_details,
  authorization_status,
  verification_status,
  secret_reference,
  expected_schedule,
  source_timezone,
  priority,
  is_primary,
  is_active
)
select
  channels.organization_id,
  channels.id,
  partners.id,
  'sandbox_fixture',
  jsonb_build_object(
    'label', 'Synthetic or licensed test fixture — not live ARY News production monitoring.',
    'supports_manual_upload', true,
    'supports_partner_upload', true
  ),
  'pending_authorization',
  'awaiting_authorized_feed',
  'sandbox/fizzion/tv/ary-news',
  '24/7 expected after authorization',
  'Asia/Karachi',
  100,
  true,
  true
from channels
join partners on partners.organization_id = channels.organization_id
on conflict do nothing;

with sources as (
  select s.id, s.organization_id, s.channel_id
  from public.tv_sources s
  join public.tv_channels c on c.id = s.channel_id
  where c.slug = 'ary-news' and s.is_primary = true
)
insert into public.tv_source_authorizations (
  organization_id,
  source_id,
  agreement_reference,
  territory,
  permitted_monitoring,
  permitted_recording,
  permitted_clipping,
  permitted_internal_playback,
  permitted_download,
  valid_from,
  status,
  notes
)
select
  sources.organization_id,
  sources.id,
  'ARY-AWAITING-AUTH',
  'Iraq',
  false,
  false,
  false,
  false,
  false,
  current_date,
  'pending',
  'Awaiting authorized ARY News linear feed approval. Until then, only sandbox fixtures and manual upload flows may be used.'
from sources
on conflict do nothing;

with channels as (
  select id, organization_id from public.tv_channels where slug = 'ary-news'
)
insert into public.tv_channel_detection_settings (
  organization_id,
  channel_id,
  logo_templates,
  threshold_settings
)
select
  channels.organization_id,
  channels.id,
  '[]'::jsonb,
  jsonb_build_object(
    'auto_confirm_min', 0.90,
    'review_min', 0.65,
    'default_pre_context_ms', 5000,
    'default_post_context_ms', 5000,
    'boundary_crossing_enabled', true
  )
from channels
on conflict (channel_id) do update set
  threshold_settings = excluded.threshold_settings;
