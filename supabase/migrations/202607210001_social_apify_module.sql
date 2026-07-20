-- ============================================================
-- Social Intelligence Apify Scraper Module
-- Adds tables for scraped profile data, content metrics, 
-- and enhanced sync tracking for Apify-based scraping.
-- ============================================================

-- Social Profiles: Normalized account profile snapshots from scrapers
create table if not exists public.social_profiles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  connection_id uuid not null references public.social_connections(id) on delete cascade,
  display_name text,
  username text,
  profile_url text,
  profile_image_url text,
  cover_image_url text,
  bio text,
  category text,
  verified boolean default false,
  followers bigint,
  following bigint,
  total_posts bigint,
  total_likes bigint,
  total_views bigint,
  reach bigint,
  impressions bigint,
  engagements bigint,
  engagement_rate numeric(8,4),
  raw_data_json jsonb not null default '{}'::jsonb,
  captured_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enhanced social content metrics table for per-content metric snapshots
create table if not exists public.social_content_metrics (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  social_content_id uuid not null references public.social_posts(id) on delete cascade,
  captured_at timestamptz not null default now(),
  views bigint,
  reach bigint,
  impressions bigint,
  likes bigint,
  comments bigint,
  shares bigint,
  saves bigint,
  reactions bigint,
  engagements bigint,
  engagement_rate numeric(8,4),
  watch_time_seconds numeric(18,4),
  average_watch_time_seconds numeric(18,4),
  completion_rate numeric(8,4),
  raw_metrics_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Add columns to social_sync_jobs for Apify-specific tracking
alter table if exists public.social_sync_jobs
  add column if not exists actor_id text,
  add column if not exists apify_run_id text,
  add column if not exists dataset_id text,
  add column if not exists job_type text not null default 'initial_import',
  add column if not exists retry_count integer not null default 0;

-- Add columns to social_connections for Apify tracking
alter table if exists public.social_connections
  add column if not exists input_value text,
  add column if not exists normalized_url text,
  add column if not exists external_account_id text,
  add column if not exists display_name text,
  add column if not exists username text,
  add column if not exists profile_image_url text,
  add column if not exists connection_status text not null default 'pending',
  add column if not exists sync_status text not null default 'idle',
  add column if not exists apify_actor_id text,
  add column if not exists latest_apify_run_id text,
  add column if not exists latest_dataset_id text,
  add column if not exists last_synced_at timestamptz,
  add column if not exists last_successful_sync_at timestamptz,
  add column if not exists next_sync_at timestamptz,
  add column if not exists last_error text,
  add column if not exists settings_json jsonb not null default '{}'::jsonb;

-- Enforce deduplication for connection + external content identity
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.social_posts'::regclass
      AND conname = 'social_posts_social_account_id_provider_post_id_key'
  ) THEN
    ALTER TABLE public.social_posts
      ADD CONSTRAINT social_posts_social_account_id_provider_post_id_key
      UNIQUE (social_account_id, provider_post_id);
  END IF;
END
$$;

-- Indexes for new tables
create index if not exists idx_social_profiles_connection
  on public.social_profiles (connection_id, captured_at desc);
create index if not exists idx_social_profiles_org
  on public.social_profiles (organization_id, captured_at desc);
create index if not exists idx_social_content_metrics_content
  on public.social_content_metrics (social_content_id, captured_at desc);
create index if not exists idx_social_content_metrics_org
  on public.social_content_metrics (organization_id, captured_at desc);
create index if not exists idx_social_sync_jobs_apify_run
  on public.social_sync_jobs (apify_run_id);
create index if not exists idx_social_sync_jobs_actor_status
  on public.social_sync_jobs (actor_id, status, created_at desc);
create index if not exists idx_social_connections_sync_status
  on public.social_connections (connection_status, sync_status, next_sync_at);

-- RLS for social_profiles
alter table public.social_profiles enable row level security;
drop policy if exists social_profiles_select on public.social_profiles;
drop policy if exists social_profiles_insert on public.social_profiles;
drop policy if exists social_profiles_update on public.social_profiles;
drop policy if exists social_profiles_delete on public.social_profiles;
create policy social_profiles_select on public.social_profiles
  for select using (public.is_org_member(organization_id) or public.is_hizen_super_admin());
create policy social_profiles_insert on public.social_profiles
  for insert with check (public.is_org_member(organization_id) or public.is_hizen_super_admin());
create policy social_profiles_update on public.social_profiles
  for update using (public.is_org_member(organization_id) or public.is_hizen_super_admin())
  with check (public.is_org_member(organization_id) or public.is_hizen_super_admin());
create policy social_profiles_delete on public.social_profiles
  for delete using (public.is_org_member(organization_id) or public.is_hizen_super_admin());

-- RLS for social_content_metrics
alter table public.social_content_metrics enable row level security;
drop policy if exists social_content_metrics_select on public.social_content_metrics;
drop policy if exists social_content_metrics_insert on public.social_content_metrics;
drop policy if exists social_content_metrics_update on public.social_content_metrics;
drop policy if exists social_content_metrics_delete on public.social_content_metrics;
create policy social_content_metrics_select on public.social_content_metrics
  for select using (public.is_org_member(organization_id) or public.is_hizen_super_admin());
create policy social_content_metrics_insert on public.social_content_metrics
  for insert with check (public.is_org_member(organization_id) or public.is_hizen_super_admin());
create policy social_content_metrics_update on public.social_content_metrics
  for update using (public.is_org_member(organization_id) or public.is_hizen_super_admin())
  with check (public.is_org_member(organization_id) or public.is_hizen_super_admin());
create policy social_content_metrics_delete on public.social_content_metrics
  for delete using (public.is_org_member(organization_id) or public.is_hizen_super_admin());

-- Triggers
drop trigger if exists social_profiles_set_updated_at on public.social_profiles;
create trigger social_profiles_set_updated_at
  before update on public.social_profiles
  for each row execute function public.set_updated_at();
