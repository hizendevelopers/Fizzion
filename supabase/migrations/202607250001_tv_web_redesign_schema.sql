-- TV & Web Redesign: Schema extensions
-- Enhances existing tables and adds new entities for the TV and Web intelligence pages

-- ============================================================
-- 1. Extend brands table with slug, color, logo_url
-- ============================================================
alter table if exists public.brands
  add column if not exists slug text,
  add column if not exists logo_url text,
  add column if not exists is_dummy_brand boolean not null default false;

create index if not exists idx_brands_slug on public.brands (organization_id, slug);

-- ============================================================
-- 2. Extend campaigns table with medium field
-- ============================================================
alter table if exists public.campaigns
  add column if not exists medium text;

create index if not exists idx_campaigns_medium on public.campaigns (organization_id, medium);

-- ============================================================
-- 3. Extend tv_channels with genre, language, daypart metadata
-- ============================================================
alter table if exists public.tv_channels
  add column if not exists country text default 'IQ',
  add column if not exists primary_language text default 'Arabic',
  add column if not exists genre text default 'General';

-- ============================================================
-- 4. Campaign-Channel bridge for TV campaigns
-- ============================================================
create table if not exists public.tv_campaign_channels (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  channel_id uuid not null references public.tv_channels(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (campaign_id, channel_id)
);

alter table public.tv_campaign_channels enable row level security;

drop policy if exists tv_campaign_channels_select on public.tv_campaign_channels;
create policy tv_campaign_channels_select on public.tv_campaign_channels
for select using (public.is_org_member(organization_id) or public.is_hizen_super_admin());

drop policy if exists tv_campaign_channels_insert on public.tv_campaign_channels;
create policy tv_campaign_channels_insert on public.tv_campaign_channels
for insert with check (public.is_org_member(organization_id) or public.is_hizen_super_admin());

drop policy if exists tv_campaign_channels_update on public.tv_campaign_channels;
create policy tv_campaign_channels_update on public.tv_campaign_channels
for update using (public.is_org_member(organization_id) or public.is_hizen_super_admin())
with check (public.is_org_member(organization_id) or public.is_hizen_super_admin());

drop policy if exists tv_campaign_channels_delete on public.tv_campaign_channels;
create policy tv_campaign_channels_delete on public.tv_campaign_channels
for delete using (public.is_org_member(organization_id) or public.is_hizen_super_admin());

-- ============================================================
-- 5. TV Ad Detections (simplified analytics-focused table)
-- ============================================================
create table if not exists public.tv_ad_detections (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  channel_id uuid not null references public.tv_channels(id) on delete cascade,
  campaign_id uuid references public.campaigns(id) on delete set null,
  brand_id uuid references public.brands(id) on delete set null,
  detected_at timestamptz not null default now(),
  genre text default 'News',
  language text default 'Arabic',
  daypart text default 'Afternoon',
  duration_seconds numeric(10,2) default 30,
  copy_name text,
  cost numeric(14,2) default 0,
  currency text not null default 'USD',
  sov_percentage numeric(5,2) default 0,
  creative_url text,
  confidence_score numeric(5,2) default 0,
  review_status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.tv_ad_detections enable row level security;

drop policy if exists tv_ad_detections_select on public.tv_ad_detections;
create policy tv_ad_detections_select on public.tv_ad_detections
for select using (public.is_org_member(organization_id) or public.is_hizen_super_admin());

drop policy if exists tv_ad_detections_insert on public.tv_ad_detections;
create policy tv_ad_detections_insert on public.tv_ad_detections
for insert with check (public.is_org_member(organization_id) or public.is_hizen_super_admin());

drop policy if exists tv_ad_detections_update on public.tv_ad_detections;
create policy tv_ad_detections_update on public.tv_ad_detections
for update using (public.is_org_member(organization_id) or public.is_hizen_super_admin())
with check (public.is_org_member(organization_id) or public.is_hizen_super_admin());

drop policy if exists tv_ad_detections_delete on public.tv_ad_detections;
create policy tv_ad_detections_delete on public.tv_ad_detections
for delete using (public.is_org_member(organization_id) or public.is_hizen_super_admin());

create index if not exists idx_tv_ad_detections_org_channel on public.tv_ad_detections (organization_id, channel_id);
create index if not exists idx_tv_ad_detections_org_brand on public.tv_ad_detections (organization_id, brand_id);
create index if not exists idx_tv_ad_detections_org_date on public.tv_ad_detections (organization_id, detected_at desc);
create index if not exists idx_tv_ad_detections_org_campaign on public.tv_ad_detections (organization_id, campaign_id);

drop trigger if exists tv_ad_detections_set_updated_at on public.tv_ad_detections;
create trigger tv_ad_detections_set_updated_at
before update on public.tv_ad_detections
for each row execute function public.set_updated_at();

-- ============================================================
-- 6. Campaign-Website bridge for Web campaigns
-- ============================================================
create table if not exists public.web_campaign_websites (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  website_id uuid not null references public.websites(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (campaign_id, website_id)
);

alter table public.web_campaign_websites enable row level security;

drop policy if exists web_campaign_websites_select on public.web_campaign_websites;
create policy web_campaign_websites_select on public.web_campaign_websites
for select using (public.is_org_member(organization_id) or public.is_hizen_super_admin());

drop policy if exists web_campaign_websites_insert on public.web_campaign_websites;
create policy web_campaign_websites_insert on public.web_campaign_websites
for insert with check (public.is_org_member(organization_id) or public.is_hizen_super_admin());

drop policy if exists web_campaign_websites_update on public.web_campaign_websites;
create policy web_campaign_websites_update on public.web_campaign_websites
for update using (public.is_org_member(organization_id) or public.is_hizen_super_admin())
with check (public.is_org_member(organization_id) or public.is_hizen_super_admin());

drop policy if exists web_campaign_websites_delete on public.web_campaign_websites;
create policy web_campaign_websites_delete on public.web_campaign_websites
for delete using (public.is_org_member(organization_id) or public.is_hizen_super_admin());

-- ============================================================
-- 7. Web Screenshots (for monitoring)
-- ============================================================
create table if not exists public.web_screenshots (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  website_id uuid not null references public.websites(id) on delete cascade,
  page_url text not null,
  screenshot_url text,
  captured_at timestamptz not null default now(),
  viewport_width integer default 1440,
  viewport_height integer default 900,
  status text not null default 'pending',
  failure_reason text,
  checksum text,
  created_at timestamptz not null default now()
);

alter table public.web_screenshots enable row level security;

drop policy if exists web_screenshots_select on public.web_screenshots;
create policy web_screenshots_select on public.web_screenshots
for select using (public.is_org_member(organization_id) or public.is_hizen_super_admin());

drop policy if exists web_screenshots_insert on public.web_screenshots;
create policy web_screenshots_insert on public.web_screenshots
for insert with check (public.is_org_member(organization_id) or public.is_hizen_super_admin());

drop policy if exists web_screenshots_update on public.web_screenshots;
create policy web_screenshots_update on public.web_screenshots
for update using (public.is_org_member(organization_id) or public.is_hizen_super_admin())
with check (public.is_org_member(organization_id) or public.is_hizen_super_admin());

drop policy if exists web_screenshots_delete on public.web_screenshots;
create policy web_screenshots_delete on public.web_screenshots
for delete using (public.is_org_member(organization_id) or public.is_hizen_super_admin());

create index if not exists idx_web_screenshots_org_website on public.web_screenshots (organization_id, website_id);
create index if not exists idx_web_screenshots_org_date on public.web_screenshots (organization_id, captured_at desc);

-- ============================================================
-- 8. Web Ad Detections (from screenshots)
-- ============================================================
create table if not exists public.web_ad_detections (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  screenshot_id uuid references public.web_screenshots(id) on delete set null,
  website_id uuid not null references public.websites(id) on delete cascade,
  campaign_id uuid references public.campaigns(id) on delete set null,
  brand_id uuid references public.brands(id) on delete set null,
  ad_format text default 'Display Banner',
  position text,
  destination_url text,
  confidence_score numeric(5,2) default 0,
  review_status text not null default 'pending',
  spend_amount numeric(14,2) default 0,
  currency text not null default 'USD',
  detected_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.web_ad_detections enable row level security;

drop policy if exists web_ad_detections_select on public.web_ad_detections;
create policy web_ad_detections_select on public.web_ad_detections
for select using (public.is_org_member(organization_id) or public.is_hizen_super_admin());

drop policy if exists web_ad_detections_insert on public.web_ad_detections;
create policy web_ad_detections_insert on public.web_ad_detections
for insert with check (public.is_org_member(organization_id) or public.is_hizen_super_admin());

drop policy if exists web_ad_detections_update on public.web_ad_detections;
create policy web_ad_detections_update on public.web_ad_detections
for update using (public.is_org_member(organization_id) or public.is_hizen_super_admin())
with check (public.is_org_member(organization_id) or public.is_hizen_super_admin());

drop policy if exists web_ad_detections_delete on public.web_ad_detections;
create policy web_ad_detections_delete on public.web_ad_detections
for delete using (public.is_org_member(organization_id) or public.is_hizen_super_admin());

create index if not exists idx_web_ad_detections_org_website on public.web_ad_detections (organization_id, website_id);
create index if not exists idx_web_ad_detections_org_brand on public.web_ad_detections (organization_id, brand_id);
create index if not exists idx_web_ad_detections_org_date on public.web_ad_detections (organization_id, detected_at desc);

drop trigger if exists web_ad_detections_set_updated_at on public.web_ad_detections;
create trigger web_ad_detections_set_updated_at
before update on public.web_ad_detections
for each row execute function public.set_updated_at();

-- ============================================================
-- 9. Web Scan Jobs (for screenshot bot)
-- ============================================================
create table if not exists public.web_scan_jobs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  website_id uuid not null references public.websites(id) on delete cascade,
  status text not null default 'queued',
  scheduled_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  retry_count integer not null default 0,
  max_retries integer not null default 3,
  failure_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.web_scan_jobs enable row level security;

drop policy if exists web_scan_jobs_select on public.web_scan_jobs;
create policy web_scan_jobs_select on public.web_scan_jobs
for select using (public.is_org_member(organization_id) or public.is_hizen_super_admin());

drop policy if exists web_scan_jobs_insert on public.web_scan_jobs;
create policy web_scan_jobs_insert on public.web_scan_jobs
for insert with check (public.is_org_member(organization_id) or public.is_hizen_super_admin());

drop policy if exists web_scan_jobs_update on public.web_scan_jobs;
create policy web_scan_jobs_update on public.web_scan_jobs
for update using (public.is_org_member(organization_id) or public.is_hizen_super_admin())
with check (public.is_org_member(organization_id) or public.is_hizen_super_admin());

drop policy if exists web_scan_jobs_delete on public.web_scan_jobs;
create policy web_scan_jobs_delete on public.web_scan_jobs
for delete using (public.is_org_member(organization_id) or public.is_hizen_super_admin());

create index if not exists idx_web_scan_jobs_org_status on public.web_scan_jobs (organization_id, status);
create index if not exists idx_web_scan_jobs_org_website on public.web_scan_jobs (organization_id, website_id);

drop trigger if exists web_scan_jobs_set_updated_at on public.web_scan_jobs;
create trigger web_scan_jobs_set_updated_at
before update on public.web_scan_jobs
for each row execute function public.set_updated_at();

-- ============================================================
-- 10. Extend websites table with monitoring fields
-- ============================================================
alter table if exists public.websites
  add column if not exists homepage_url text,
  add column if not exists logo_url text,
  add column if not exists primary_language text default 'Arabic',
  add column if not exists category text default 'News',
  add column if not exists monitoring_enabled boolean not null default false,
  add column if not exists screenshot_enabled boolean not null default false,
  add column if not exists scan_interval_minutes integer default 60,
  add column if not exists last_successful_scan_at timestamptz,
  add column if not exists last_failed_scan_at timestamptz;

