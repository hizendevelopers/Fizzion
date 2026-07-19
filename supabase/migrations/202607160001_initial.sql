create extension if not exists pgcrypto;
create extension if not exists pg_trgm;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  name_ar text,
  market text default 'Iraq',
  timezone text default 'Asia/Baghdad',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.roles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  slug text not null,
  name text not null,
  description text,
  is_system boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, slug)
);

create table if not exists public.permissions (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  preferred_locale text default 'en',
  preferred_timezone text default 'Asia/Baghdad',
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role_id uuid references public.roles(id) on delete set null,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create table if not exists public.role_permissions (
  id uuid primary key default gen_random_uuid(),
  role_id uuid not null references public.roles(id) on delete cascade,
  permission_id uuid not null references public.permissions(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (role_id, permission_id)
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  actor_user_id uuid,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete set null,
  locale text not null default 'en',
  timezone text not null default 'Asia/Baghdad',
  dashboard_layout jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.saved_views (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  module_key text not null,
  name text not null,
  filters jsonb not null default '{}'::jsonb,
  is_shared boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  recipient_user_id uuid references auth.users(id) on delete cascade,
  title text not null,
  body text not null,
  severity text not null default 'info',
  status text not null default 'unread',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.brands (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  name_ar text,
  parent_company text,
  category text,
  logo_storage_key text,
  website_domains text[] not null default '{}',
  social_handles jsonb not null default '{}'::jsonb,
  ocr_keywords text[] not null default '{}',
  speech_keywords text[] not null default '{}',
  competitor_group text,
  is_active boolean not null default true,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, name)
);

create table if not exists public.brand_aliases (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  brand_id uuid not null references public.brands(id) on delete cascade,
  alias text not null,
  locale text not null default 'en',
  created_at timestamptz not null default now(),
  unique (brand_id, alias)
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  brand_id uuid not null references public.brands(id) on delete cascade,
  name text not null,
  name_ar text,
  category text,
  is_active boolean not null default true,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (brand_id, name)
);

create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  brand_id uuid references public.brands(id) on delete set null,
  product_id uuid references public.products(id) on delete set null,
  name text not null,
  market text default 'Iraq',
  agency text,
  start_date date,
  end_date date,
  objective text,
  media_types text[] not null default '{}',
  keywords text[] not null default '{}',
  hashtags text[] not null default '{}',
  expected_creatives text[] not null default '{}',
  status text not null default 'draft',
  budget_amount numeric(14,2),
  budget_currency text,
  notes text,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, name)
);

create table if not exists public.campaign_brands (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  brand_id uuid not null references public.brands(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (campaign_id, brand_id)
);

create table if not exists public.creative_assets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  brand_id uuid references public.brands(id) on delete set null,
  product_id uuid references public.products(id) on delete set null,
  campaign_id uuid references public.campaigns(id) on delete set null,
  media_type text not null,
  name text not null,
  language text,
  duration_seconds numeric(10,2),
  dimensions text,
  aspect_ratio text,
  first_seen_at timestamptz,
  last_seen_at timestamptz,
  total_occurrences bigint not null default 0,
  approval_state text not null default 'pending',
  ai_description text,
  ocr_text text,
  transcript text,
  audio_fingerprint text,
  visual_embedding_ref text,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.creative_variants (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  creative_asset_id uuid not null references public.creative_assets(id) on delete cascade,
  media_type text not null,
  variant_name text not null,
  storage_key text,
  checksum_sha256 text,
  duration_seconds numeric(10,2),
  dimensions text,
  aspect_ratio text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.creative_embeddings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  creative_asset_id uuid not null references public.creative_assets(id) on delete cascade,
  provider text not null,
  model text not null,
  embedding_ref text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.creative_tags (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  creative_asset_id uuid not null references public.creative_assets(id) on delete cascade,
  tag text not null,
  created_at timestamptz not null default now(),
  unique (creative_asset_id, tag)
);

create table if not exists public.tv_source_partners (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  contact_name text,
  contact_email text,
  source_contract_ref text,
  sla_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tv_channels (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  name_ar text,
  slug text not null,
  logo_storage_key text,
  category text,
  source_type text,
  recording_status text default 'inactive',
  retention_days integer default 30,
  expected_schedule text,
  technical_metadata jsonb not null default '{}'::jsonb,
  monitoring_health text default 'idle',
  last_successful_file_at timestamptz,
  last_processed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, slug)
);

create table if not exists public.tv_sources (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  channel_id uuid not null references public.tv_channels(id) on delete cascade,
  source_partner_id uuid references public.tv_source_partners(id) on delete set null,
  source_type text not null,
  connection_details jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tv_recording_files (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  channel_id uuid not null references public.tv_channels(id) on delete cascade,
  tv_source_id uuid references public.tv_sources(id) on delete set null,
  source_partner_id uuid references public.tv_source_partners(id) on delete set null,
  storage_key text not null,
  proxy_storage_key text,
  filename text not null,
  source_timestamp timestamptz not null,
  source_timezone text not null default 'Asia/Baghdad',
  duration_seconds numeric(10,2),
  file_size_bytes bigint,
  checksum_sha256 text not null,
  upload_mode text not null,
  media_metadata jsonb not null default '{}'::jsonb,
  integrity_status text not null default 'pending',
  processing_status text not null default 'received',
  duplicate_of_id uuid references public.tv_recording_files(id) on delete set null,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (channel_id, checksum_sha256)
);

create table if not exists public.tv_recording_gaps (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  channel_id uuid not null references public.tv_channels(id) on delete cascade,
  started_at timestamptz not null,
  ended_at timestamptz not null,
  expected_source text,
  severity text not null default 'warning',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tv_processing_jobs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  recording_file_id uuid not null references public.tv_recording_files(id) on delete cascade,
  job_type text not null,
  status text not null default 'queued',
  attempts integer not null default 0,
  queue_name text,
  started_at timestamptz,
  completed_at timestamptz,
  error_message text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tv_ad_breaks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  recording_file_id uuid not null references public.tv_recording_files(id) on delete cascade,
  break_start_at timestamptz not null,
  break_end_at timestamptz not null,
  confidence numeric(5,2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tv_ad_occurrences (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  channel_id uuid not null references public.tv_channels(id) on delete cascade,
  recording_file_id uuid not null references public.tv_recording_files(id) on delete cascade,
  ad_break_id uuid references public.tv_ad_breaks(id) on delete set null,
  creative_variant_id uuid references public.creative_variants(id) on delete set null,
  brand_id uuid references public.brands(id) on delete set null,
  product_id uuid references public.products(id) on delete set null,
  campaign_id uuid references public.campaigns(id) on delete set null,
  started_at timestamptz not null,
  ended_at timestamptz not null,
  duration_seconds numeric(10,2) not null,
  confidence_score numeric(5,2),
  reviewer_status text not null default 'pending',
  content_type text not null default 'commercial',
  detection_summary text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tv_ad_occurrence_clips (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  occurrence_id uuid not null references public.tv_ad_occurrences(id) on delete cascade,
  storage_key text not null,
  clip_started_at timestamptz not null,
  clip_ended_at timestamptz not null,
  pre_context_seconds integer not null default 5,
  post_context_seconds integer not null default 5,
  checksum_sha256 text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tv_detection_evidence (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  occurrence_id uuid not null references public.tv_ad_occurrences(id) on delete cascade,
  evidence_type text not null,
  provider text,
  score numeric(8,4),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.tv_review_actions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  occurrence_id uuid not null references public.tv_ad_occurrences(id) on delete cascade,
  reviewer_user_id uuid not null references auth.users(id) on delete cascade,
  action_type text not null,
  notes text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.social_platforms (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  oauth_supported boolean not null default false,
  public_monitoring_supported boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.social_accounts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  platform_id uuid not null references public.social_platforms(id) on delete restrict,
  brand_id uuid references public.brands(id) on delete set null,
  campaign_id uuid references public.campaigns(id) on delete set null,
  handle text not null,
  normalized_url text,
  display_name text,
  bio text,
  profile_image_url text,
  website_url text,
  country text,
  is_verified boolean,
  connection_type text not null,
  last_synchronized_at timestamptz,
  connection_health text not null default 'pending',
  metrics_availability jsonb not null default '{}'::jsonb,
  data_source text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, platform_id, handle)
);

create table if not exists public.social_connections (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  social_account_id uuid not null references public.social_accounts(id) on delete cascade,
  connection_type text not null,
  status text not null default 'pending',
  provider_account_id text,
  granted_scopes text[] not null default '{}',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.social_oauth_tokens (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  connection_id uuid not null references public.social_connections(id) on delete cascade,
  access_token_encrypted text not null,
  refresh_token_encrypted text,
  expires_at timestamptz,
  scopes text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.social_account_snapshots (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  social_account_id uuid not null references public.social_accounts(id) on delete cascade,
  captured_at timestamptz not null,
  follower_count bigint,
  following_count bigint,
  content_count bigint,
  engagement_rate numeric(8,4),
  raw_summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.social_posts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  social_account_id uuid not null references public.social_accounts(id) on delete cascade,
  creative_variant_id uuid references public.creative_variants(id) on delete set null,
  campaign_id uuid references public.campaigns(id) on delete set null,
  provider_post_id text not null,
  content_type text not null,
  caption text,
  hashtags text[] not null default '{}',
  mentions text[] not null default '{}',
  language text,
  published_at timestamptz not null,
  permalink text,
  is_paid boolean,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (social_account_id, provider_post_id)
);

create table if not exists public.social_post_media (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  social_post_id uuid not null references public.social_posts(id) on delete cascade,
  media_type text not null,
  source_url text,
  storage_key text,
  thumbnail_url text,
  duration_seconds numeric(10,2),
  width integer,
  height integer,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.social_post_metrics (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  social_post_id uuid not null references public.social_posts(id) on delete cascade,
  metric_name text not null,
  metric_value numeric(18,4),
  availability text not null default 'available',
  source_definition text,
  captured_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists public.social_account_metrics (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  social_account_id uuid not null references public.social_accounts(id) on delete cascade,
  metric_name text not null,
  metric_value numeric(18,4),
  availability text not null default 'available',
  source_definition text,
  captured_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists public.social_sync_jobs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  social_account_id uuid not null references public.social_accounts(id) on delete cascade,
  connection_id uuid references public.social_connections(id) on delete set null,
  sync_mode text not null,
  status text not null default 'queued',
  started_at timestamptz,
  completed_at timestamptz,
  error_message text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.social_raw_payloads (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  sync_job_id uuid not null references public.social_sync_jobs(id) on delete cascade,
  payload_type text not null,
  provider_version text,
  payload jsonb not null,
  retrieved_at timestamptz not null,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.websites (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  domain text not null,
  country text default 'Iraq',
  priority integer default 100,
  is_active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, domain)
);

create table if not exists public.website_pages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  website_id uuid not null references public.websites(id) on delete cascade,
  url text not null,
  page_type text,
  title text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (website_id, url)
);

create table if not exists public.website_browser_profiles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  region_code text not null default 'IQ',
  language text not null default 'ar-IQ',
  device_type text not null default 'desktop',
  viewport_width integer not null default 1440,
  viewport_height integer not null default 1024,
  user_agent text,
  consent_state text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.website_crawl_configs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  website_id uuid not null references public.websites(id) on delete cascade,
  browser_profile_id uuid references public.website_browser_profiles(id) on delete set null,
  interval_minutes integer not null default 15,
  crawl_depth integer not null default 2,
  max_pages integer not null default 10,
  homepage_enabled boolean not null default true,
  section_pages_enabled boolean not null default true,
  article_pages_enabled boolean not null default true,
  mobile_enabled boolean not null default true,
  desktop_enabled boolean not null default true,
  url_patterns text[] not null default '{}',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.website_crawl_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  website_id uuid not null references public.websites(id) on delete cascade,
  crawl_config_id uuid references public.website_crawl_configs(id) on delete set null,
  browser_profile_id uuid references public.website_browser_profiles(id) on delete set null,
  started_at timestamptz not null,
  completed_at timestamptz,
  status text not null default 'queued',
  crawl_location text,
  proxy_region text,
  pages_crawled integer default 0,
  ads_detected integer default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.website_crawl_errors (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  crawl_run_id uuid not null references public.website_crawl_runs(id) on delete cascade,
  page_url text,
  error_type text not null,
  message text not null,
  screenshot_storage_key text,
  created_at timestamptz not null default now()
);

create table if not exists public.website_ad_creatives (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  brand_id uuid references public.brands(id) on delete set null,
  product_id uuid references public.products(id) on delete set null,
  campaign_id uuid references public.campaigns(id) on delete set null,
  creative_variant_id uuid references public.creative_variants(id) on delete set null,
  creative_hash text,
  ocr_text text,
  landing_domain text,
  dimensions text,
  metadata jsonb not null default '{}'::jsonb,
  first_seen_at timestamptz,
  last_seen_at timestamptz,
  occurrence_count bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.website_ad_occurrences (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  website_id uuid not null references public.websites(id) on delete cascade,
  page_id uuid references public.website_pages(id) on delete set null,
  crawl_run_id uuid not null references public.website_crawl_runs(id) on delete cascade,
  website_ad_creative_id uuid references public.website_ad_creatives(id) on delete set null,
  brand_id uuid references public.brands(id) on delete set null,
  product_id uuid references public.products(id) on delete set null,
  campaign_id uuid references public.campaigns(id) on delete set null,
  captured_at timestamptz not null,
  page_url text not null,
  page_title text,
  viewport text,
  page_position text,
  ad_format text,
  landing_domain text,
  destination_url text,
  confidence numeric(5,2),
  detection_method text,
  first_seen_at timestamptz,
  last_seen_at timestamptz,
  occurrence_count integer default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.website_ad_screenshots (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  occurrence_id uuid not null references public.website_ad_occurrences(id) on delete cascade,
  screenshot_type text not null,
  storage_key text not null,
  width integer,
  height integer,
  created_at timestamptz not null default now()
);

create table if not exists public.ooh_vendors (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  contact_name text,
  contact_email text,
  contact_phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, name)
);

create table if not exists public.ooh_locations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  location_name text not null,
  location_name_ar text,
  latitude numeric(10,7) not null,
  longitude numeric(10,7) not null,
  city text not null,
  district text,
  address text,
  landmark text,
  estimated_visibility text,
  status text not null default 'active',
  availability text not null default 'available',
  notes text,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ooh_media_units (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  location_id uuid not null references public.ooh_locations(id) on delete cascade,
  vendor_id uuid references public.ooh_vendors(id) on delete set null,
  media_owner text,
  media_type text not null,
  dimensions text,
  orientation text,
  illumination text,
  traffic_direction text,
  contract_reference text,
  installation_date date,
  removal_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ooh_creatives (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  creative_asset_id uuid references public.creative_assets(id) on delete set null,
  storage_key text,
  proof_storage_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ooh_campaign_assignments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  media_unit_id uuid not null references public.ooh_media_units(id) on delete cascade,
  brand_id uuid references public.brands(id) on delete set null,
  product_id uuid references public.products(id) on delete set null,
  campaign_id uuid references public.campaigns(id) on delete set null,
  ooh_creative_id uuid references public.ooh_creatives(id) on delete set null,
  vendor_id uuid references public.ooh_vendors(id) on delete set null,
  booking_status text not null default 'planned',
  start_date date,
  end_date date,
  cost_amount numeric(14,2),
  cost_currency text,
  internal_comments text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ooh_photos (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  assignment_id uuid not null references public.ooh_campaign_assignments(id) on delete cascade,
  photo_type text not null,
  storage_key text not null,
  captured_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.ooh_verification_visits (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  assignment_id uuid not null references public.ooh_campaign_assignments(id) on delete cascade,
  visited_at timestamptz not null,
  visitor_user_id uuid,
  latitude numeric(10,7),
  longitude numeric(10,7),
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  report_type text not null,
  config jsonb not null default '{}'::jsonb,
  schedule_expression text,
  is_active boolean not null default true,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.report_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  report_id uuid not null references public.reports(id) on delete cascade,
  requested_by uuid,
  status text not null default 'queued',
  format text not null,
  progress integer not null default 0,
  started_at timestamptz,
  completed_at timestamptz,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.exports (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  report_run_id uuid references public.report_runs(id) on delete cascade,
  storage_key text not null,
  format text not null,
  expires_at timestamptz,
  downloaded_by uuid,
  downloaded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.alert_rules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  alert_type text not null,
  severity text not null default 'warning',
  channel_config jsonb not null default '{}'::jsonb,
  conditions jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.alerts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  alert_rule_id uuid references public.alert_rules(id) on delete set null,
  assigned_to uuid,
  title text not null,
  body text not null,
  severity text not null,
  status text not null default 'open',
  resolution_notes text,
  payload jsonb not null default '{}'::jsonb,
  acknowledged_at timestamptz,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.processing_jobs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  job_type text not null,
  domain text not null,
  status text not null default 'queued',
  queue_name text,
  external_job_id text,
  attempts integer not null default 0,
  payload jsonb not null default '{}'::jsonb,
  started_at timestamptz,
  completed_at timestamptz,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.integration_health (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  integration_key text not null,
  status text not null default 'unknown',
  last_checked_at timestamptz,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, integration_key)
);

create table if not exists public.data_retention_policies (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  data_domain text not null,
  retention_days integer,
  legal_hold boolean not null default false,
  notes text,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, data_domain)
);

create or replace function public.is_org_member(target_org_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.organization_members om
    where om.organization_id = target_org_id
      and om.user_id = auth.uid()
      and om.status = 'active'
  );
$$;

create or replace function public.is_hizen_super_admin()
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.organization_members om
    join public.roles r on r.id = om.role_id
    join public.organizations o on o.id = om.organization_id
    where om.user_id = auth.uid()
      and om.status = 'active'
      and o.slug = 'hizen'
      and r.slug = 'hizen_super_admin'
  );
$$;

create index if not exists idx_brands_org_name on public.brands (organization_id, name);
create index if not exists idx_campaigns_org_dates on public.campaigns (organization_id, start_date, end_date);
create index if not exists idx_creative_assets_org_media on public.creative_assets (organization_id, media_type, brand_id);
create index if not exists idx_tv_occurrences_org_channel_time on public.tv_ad_occurrences (organization_id, channel_id, started_at desc);
create index if not exists idx_tv_recording_files_org_channel_time on public.tv_recording_files (organization_id, channel_id, source_timestamp desc);
create index if not exists idx_social_posts_org_account_time on public.social_posts (organization_id, social_account_id, published_at desc);
create index if not exists idx_social_post_metrics_post_metric on public.social_post_metrics (social_post_id, metric_name, captured_at desc);
create index if not exists idx_website_occurrences_org_site_time on public.website_ad_occurrences (organization_id, website_id, captured_at desc);
create index if not exists idx_ooh_locations_org_city on public.ooh_locations (organization_id, city, district);
create index if not exists idx_alerts_org_status_created on public.alerts (organization_id, status, created_at desc);
create index if not exists idx_processing_jobs_org_domain_status on public.processing_jobs (organization_id, domain, status);
create index if not exists idx_audit_logs_org_created on public.audit_logs (organization_id, created_at desc);
create index if not exists idx_brand_aliases_alias on public.brand_aliases using gin (alias gin_trgm_ops);
create index if not exists idx_creative_assets_transcript on public.creative_assets using gin (transcript gin_trgm_ops);
create index if not exists idx_social_posts_caption on public.social_posts using gin (caption gin_trgm_ops);
create index if not exists idx_website_pages_url on public.website_pages using gin (url gin_trgm_ops);

do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'organizations','roles','permissions','profiles','organization_members','role_permissions','audit_logs','user_preferences',
    'saved_views','notifications','brands','brand_aliases','products','campaigns','campaign_brands','creative_assets',
    'creative_variants','creative_embeddings','creative_tags','tv_source_partners','tv_channels','tv_sources',
    'tv_recording_files','tv_recording_gaps','tv_processing_jobs','tv_ad_breaks','tv_ad_occurrences',
    'tv_ad_occurrence_clips','tv_detection_evidence','tv_review_actions','social_platforms','social_accounts',
    'social_connections','social_oauth_tokens','social_account_snapshots','social_posts','social_post_media',
    'social_post_metrics','social_account_metrics','social_sync_jobs','social_raw_payloads','websites',
    'website_pages','website_browser_profiles','website_crawl_configs','website_crawl_runs','website_crawl_errors',
    'website_ad_creatives','website_ad_occurrences','website_ad_screenshots','ooh_vendors','ooh_locations',
    'ooh_media_units','ooh_creatives','ooh_campaign_assignments','ooh_photos','ooh_verification_visits',
    'reports','report_runs','exports','alert_rules','alerts','processing_jobs','integration_health',
    'data_retention_policies'
  ]
  loop
    execute format('alter table public.%I enable row level security', tbl);
  end loop;
end $$;

create policy organizations_select on public.organizations
for select using (public.is_org_member(id) or public.is_hizen_super_admin());

create policy organizations_modify on public.organizations
for all using (public.is_hizen_super_admin())
with check (public.is_hizen_super_admin());

create policy profiles_select on public.profiles
for select using (id = auth.uid() or public.is_hizen_super_admin());

create policy profiles_modify on public.profiles
for all using (id = auth.uid() or public.is_hizen_super_admin())
with check (id = auth.uid() or public.is_hizen_super_admin());

create policy user_preferences_select on public.user_preferences
for select using (user_id = auth.uid() or public.is_hizen_super_admin());

create policy user_preferences_modify on public.user_preferences
for all using (user_id = auth.uid() or public.is_hizen_super_admin())
with check (user_id = auth.uid() or public.is_hizen_super_admin());

create policy notifications_select on public.notifications
for select using (
  public.is_org_member(organization_id)
  and (recipient_user_id is null or recipient_user_id = auth.uid() or public.is_hizen_super_admin())
);

create policy notifications_modify on public.notifications
for all using (
  recipient_user_id = auth.uid()
  or public.is_hizen_super_admin()
)
with check (
  public.is_org_member(organization_id)
  or public.is_hizen_super_admin()
);

do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'roles','organization_members','audit_logs','saved_views',
    'brands','brand_aliases','products','campaigns','campaign_brands','creative_assets',
    'creative_variants','creative_embeddings','creative_tags','tv_source_partners','tv_channels',
    'tv_sources','tv_recording_files','tv_recording_gaps','tv_processing_jobs','tv_ad_breaks',
    'tv_ad_occurrences','tv_ad_occurrence_clips','tv_detection_evidence','tv_review_actions',
    'social_accounts','social_connections','social_oauth_tokens','social_account_snapshots','social_posts',
    'social_post_media','social_post_metrics','social_account_metrics','social_sync_jobs','social_raw_payloads',
    'websites','website_pages','website_browser_profiles','website_crawl_configs','website_crawl_runs',
    'website_crawl_errors','website_ad_creatives','website_ad_occurrences','website_ad_screenshots',
    'ooh_vendors','ooh_locations','ooh_media_units','ooh_creatives','ooh_campaign_assignments',
    'ooh_photos','ooh_verification_visits','reports','report_runs','exports','alert_rules','alerts',
    'processing_jobs','integration_health','data_retention_policies'
  ]
  loop
    execute format(
      'create policy %I on public.%I for select using (public.is_org_member(organization_id) or public.is_hizen_super_admin())',
      tbl || '_select',
      tbl
    );
    execute format(
      'create policy %I on public.%I for insert with check (public.is_org_member(organization_id) or public.is_hizen_super_admin())',
      tbl || '_insert',
      tbl
    );
    execute format(
      'create policy %I on public.%I for update using (public.is_org_member(organization_id) or public.is_hizen_super_admin()) with check (public.is_org_member(organization_id) or public.is_hizen_super_admin())',
      tbl || '_update',
      tbl
    );
    execute format(
      'create policy %I on public.%I for delete using (public.is_org_member(organization_id) or public.is_hizen_super_admin())',
      tbl || '_delete',
      tbl
    );
  end loop;
end $$;

create policy permissions_select on public.permissions
for select using (auth.uid() is not null);

create policy permissions_modify on public.permissions
for all using (public.is_hizen_super_admin())
with check (public.is_hizen_super_admin());

create policy role_permissions_select on public.role_permissions
for select using (
  public.is_hizen_super_admin()
  or exists (
    select 1
    from public.roles r
    where r.id = role_permissions.role_id
      and public.is_org_member(r.organization_id)
  )
);

create policy role_permissions_modify on public.role_permissions
for all using (public.is_hizen_super_admin())
with check (public.is_hizen_super_admin());

create policy social_platforms_select on public.social_platforms
for select using (auth.uid() is not null);

create policy social_platforms_modify on public.social_platforms
for all using (public.is_hizen_super_admin())
with check (public.is_hizen_super_admin());

do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'organizations','roles','permissions','profiles','organization_members','audit_logs','user_preferences','saved_views',
    'notifications','brands','products','campaigns','creative_assets','creative_variants','tv_source_partners',
    'tv_channels','tv_sources','tv_recording_files','tv_recording_gaps','tv_processing_jobs','tv_ad_breaks',
    'tv_ad_occurrences','social_accounts','social_connections','social_oauth_tokens','social_account_snapshots',
    'social_posts','social_sync_jobs','websites','website_pages','website_browser_profiles','website_crawl_configs',
    'website_crawl_runs','website_ad_creatives','website_ad_occurrences','ooh_vendors','ooh_locations',
    'ooh_media_units','ooh_creatives','ooh_campaign_assignments','reports','report_runs','exports',
    'alert_rules','alerts','processing_jobs','integration_health','data_retention_policies'
  ]
  loop
    execute format(
      'create trigger %I before update on public.%I for each row execute function public.set_updated_at()',
      tbl || '_set_updated_at',
      tbl
    );
  end loop;
end $$;
