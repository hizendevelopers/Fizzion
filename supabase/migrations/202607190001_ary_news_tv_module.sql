alter table if exists public.tv_channels
  add column if not exists name_en text,
  add column if not exists country_code text default 'PK',
  add column if not exists monitoring_market text default 'Iraq',
  add column if not exists source_verification_state text default 'pending_authorization',
  add column if not exists default_timezone text default 'Asia/Baghdad',
  add column if not exists source_timezone text default 'Asia/Baghdad',
  add column if not exists display_timezone text default 'Asia/Baghdad',
  add column if not exists source_authorization_status text default 'pending_authorization',
  add column if not exists is_active boolean not null default true,
  add column if not exists last_heartbeat_at timestamptz,
  add column if not exists current_source_health text default 'awaiting_authorized_feed',
  add column if not exists current_video_resolution text,
  add column if not exists current_audio_codec text,
  add column if not exists current_video_codec text,
  add column if not exists current_bitrate_kbps integer,
  add column if not exists current_frame_rate numeric(8,3),
  add column if not exists stream_latency_ms integer,
  add column if not exists recording_gap_duration_ms bigint default 0,
  add column if not exists notes text,
  add column if not exists deleted_at timestamptz;

update public.tv_channels
set
  name_en = coalesce(name_en, name),
  default_timezone = coalesce(default_timezone, 'Asia/Baghdad'),
  display_timezone = coalesce(display_timezone, 'Asia/Baghdad'),
  source_timezone = coalesce(source_timezone, 'Asia/Baghdad'),
  monitoring_market = coalesce(monitoring_market, 'Iraq'),
  source_verification_state = coalesce(source_verification_state, 'pending_authorization'),
  source_authorization_status = coalesce(source_authorization_status, 'pending_authorization')
where true;

alter table if exists public.tv_sources
  add column if not exists authorization_status text default 'pending_authorization',
  add column if not exists verification_status text default 'pending_authorization',
  add column if not exists secret_reference text,
  add column if not exists expected_schedule text,
  add column if not exists source_timezone text default 'Asia/Baghdad',
  add column if not exists priority integer not null default 100,
  add column if not exists is_primary boolean not null default false,
  add column if not exists last_heartbeat_at timestamptz,
  add column if not exists last_success_at timestamptz;

update public.tv_sources
set
  authorization_status = coalesce(authorization_status, 'pending_authorization'),
  verification_status = coalesce(verification_status, 'pending_authorization'),
  source_timezone = coalesce(source_timezone, 'Asia/Baghdad')
where true;

create table if not exists public.tv_source_authorizations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  source_id uuid not null references public.tv_sources(id) on delete cascade,
  agreement_reference text,
  territory text not null default 'Iraq',
  permitted_monitoring boolean not null default false,
  permitted_recording boolean not null default false,
  permitted_clipping boolean not null default false,
  permitted_internal_playback boolean not null default false,
  permitted_download boolean not null default false,
  valid_from date,
  valid_until date,
  document_storage_key text,
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  status text not null default 'pending',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tv_recorder_sessions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  channel_id uuid not null references public.tv_channels(id) on delete cascade,
  source_id uuid not null references public.tv_sources(id) on delete cascade,
  worker_id text,
  started_at timestamptz not null default now(),
  stopped_at timestamptz,
  status text not null default 'idle',
  restart_count integer not null default 0,
  stop_reason text,
  last_heartbeat_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tv_channel_detection_settings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  channel_id uuid not null references public.tv_channels(id) on delete cascade,
  logo_templates jsonb not null default '[]'::jsonb,
  logo_region jsonb not null default '{}'::jsonb,
  ticker_region jsonb not null default '{}'::jsonb,
  lower_third_region jsonb not null default '{}'::jsonb,
  clock_region jsonb not null default '{}'::jsonb,
  bumper_templates jsonb not null default '[]'::jsonb,
  promo_templates jsonb not null default '[]'::jsonb,
  threshold_settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (channel_id)
);

alter table if exists public.tv_recording_files
  add column if not exists recorder_session_id uuid references public.tv_recorder_sessions(id) on delete set null,
  add column if not exists source_end_time timestamptz,
  add column if not exists start_time_utc timestamptz,
  add column if not exists end_time_utc timestamptz,
  add column if not exists duration_ms bigint,
  add column if not exists thumbnail_manifest_key text,
  add column if not exists container_format text,
  add column if not exists width integer,
  add column if not exists height integer,
  add column if not exists frame_rate numeric(10,4),
  add column if not exists bitrate bigint,
  add column if not exists audio_sample_rate integer,
  add column if not exists validation_status text default 'pending',
  add column if not exists source_provenance jsonb not null default '{}'::jsonb;

update public.tv_recording_files
set
  start_time_utc = coalesce(start_time_utc, source_timestamp),
  end_time_utc = coalesce(end_time_utc, source_timestamp + make_interval(secs => coalesce(duration_seconds, 0))),
  duration_ms = coalesce(duration_ms, round(coalesce(duration_seconds, 0) * 1000)),
  validation_status = coalesce(validation_status, integrity_status),
  container_format = coalesce(container_format, media_metadata ->> 'container'),
  width = coalesce(width, nullif(media_metadata ->> 'width', '')::integer),
  height = coalesce(height, nullif(media_metadata ->> 'height', '')::integer),
  frame_rate = coalesce(frame_rate, nullif(media_metadata ->> 'frame_rate', '')::numeric),
  bitrate = coalesce(bitrate, nullif(media_metadata ->> 'bitrate', '')::bigint)
where true;

alter table if exists public.tv_processing_jobs
  add column if not exists channel_id uuid references public.tv_channels(id) on delete set null,
  add column if not exists error_code text,
  add column if not exists worker_version text,
  add column if not exists model_version text;

alter table if exists public.tv_ad_breaks
  add column if not exists channel_id uuid references public.tv_channels(id) on delete set null,
  add column if not exists duration_ms bigint,
  add column if not exists detection_status text default 'pending',
  add column if not exists reviewer_status text default 'pending';

update public.tv_ad_breaks
set
  duration_ms = coalesce(duration_ms, greatest(0, extract(epoch from (break_end_at - break_start_at)) * 1000)),
  detection_status = coalesce(detection_status, 'detected'),
  reviewer_status = coalesce(reviewer_status, 'pending')
where true;

alter table if exists public.tv_ad_occurrences
  add column if not exists exact_start_time_utc timestamptz,
  add column if not exists exact_end_time_utc timestamptz,
  add column if not exists exact_duration_ms bigint,
  add column if not exists display_timezone text default 'Asia/Baghdad',
  add column if not exists classification text default 'commercial',
  add column if not exists review_status text default 'pending',
  add column if not exists first_detection_method text,
  add column if not exists is_first_seen boolean not null default false,
  add column if not exists source_provenance jsonb not null default '{}'::jsonb,
  add column if not exists deleted_at timestamptz;

update public.tv_ad_occurrences
set
  exact_start_time_utc = coalesce(exact_start_time_utc, started_at),
  exact_end_time_utc = coalesce(exact_end_time_utc, ended_at),
  exact_duration_ms = coalesce(exact_duration_ms, round(duration_seconds * 1000)),
  review_status = coalesce(review_status, reviewer_status),
  classification = coalesce(classification, content_type),
  display_timezone = coalesce(display_timezone, 'Asia/Baghdad')
where true;

create table if not exists public.tv_ad_occurrence_sources (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  occurrence_id uuid not null references public.tv_ad_occurrences(id) on delete cascade,
  recording_file_id uuid not null references public.tv_recording_files(id) on delete cascade,
  source_offset_start_ms bigint not null default 0,
  source_offset_end_ms bigint not null default 0,
  sequence_order integer not null default 1,
  created_at timestamptz not null default now(),
  unique (occurrence_id, recording_file_id, sequence_order)
);

alter table if exists public.tv_ad_occurrence_clips
  add column if not exists proxy_storage_key text,
  add column if not exists thumbnail_storage_key text,
  add column if not exists context_start_time_utc timestamptz,
  add column if not exists exact_ad_start_offset_ms bigint,
  add column if not exists exact_ad_end_offset_ms bigint,
  add column if not exists context_end_time_utc timestamptz,
  add column if not exists pre_context_ms bigint,
  add column if not exists post_context_ms bigint,
  add column if not exists context_status text default 'full',
  add column if not exists clip_duration_ms bigint,
  add column if not exists generation_status text default 'pending',
  add column if not exists generated_at timestamptz;

update public.tv_ad_occurrence_clips
set
  context_start_time_utc = coalesce(context_start_time_utc, clip_started_at),
  context_end_time_utc = coalesce(context_end_time_utc, clip_ended_at),
  pre_context_ms = coalesce(pre_context_ms, pre_context_seconds * 1000),
  post_context_ms = coalesce(post_context_ms, post_context_seconds * 1000),
  clip_duration_ms = coalesce(clip_duration_ms, greatest(0, extract(epoch from (clip_ended_at - clip_started_at)) * 1000)),
  generation_status = coalesce(generation_status, 'generated'),
  generated_at = coalesce(generated_at, created_at)
where true;

alter table if exists public.tv_detection_evidence
  add column if not exists detected_value text,
  add column if not exists structured_result jsonb not null default '{}'::jsonb,
  add column if not exists model_version text;

update public.tv_detection_evidence
set structured_result = coalesce(structured_result, payload)
where true;

alter table if exists public.tv_review_actions
  alter column reviewer_user_id drop not null,
  add column if not exists previous_values jsonb not null default '{}'::jsonb,
  add column if not exists new_values jsonb not null default '{}'::jsonb;

create table if not exists public.creative_fingerprints (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  creative_asset_id uuid not null references public.creative_assets(id) on delete cascade,
  fingerprint_type text not null,
  fingerprint_value text not null,
  sample_offset_ms bigint,
  provider text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_tv_channels_org_slug_active on public.tv_channels (organization_id, slug, is_active);
create index if not exists idx_tv_sources_org_channel_primary on public.tv_sources (organization_id, channel_id, is_primary, is_active);
create index if not exists idx_tv_source_authorizations_org_status on public.tv_source_authorizations (organization_id, status, valid_until);
create index if not exists idx_tv_recorder_sessions_org_channel_status on public.tv_recorder_sessions (organization_id, channel_id, status, started_at desc);
create index if not exists idx_tv_ad_occurrences_exact_start on public.tv_ad_occurrences (organization_id, channel_id, exact_start_time_utc desc);
create index if not exists idx_tv_ad_occurrences_review_status on public.tv_ad_occurrences (organization_id, review_status, exact_start_time_utc desc);
create index if not exists idx_tv_ad_occurrence_sources_occurrence on public.tv_ad_occurrence_sources (occurrence_id, sequence_order);
create index if not exists idx_creative_fingerprints_asset_type on public.creative_fingerprints (creative_asset_id, fingerprint_type);

alter table public.tv_source_authorizations enable row level security;
alter table public.tv_recorder_sessions enable row level security;
alter table public.tv_channel_detection_settings enable row level security;
alter table public.tv_ad_occurrence_sources enable row level security;
alter table public.creative_fingerprints enable row level security;

create policy tv_source_authorizations_select on public.tv_source_authorizations
for select using (public.is_org_member(organization_id) or public.is_hizen_super_admin());
create policy tv_source_authorizations_insert on public.tv_source_authorizations
for insert with check (public.is_org_member(organization_id) or public.is_hizen_super_admin());
create policy tv_source_authorizations_update on public.tv_source_authorizations
for update using (public.is_org_member(organization_id) or public.is_hizen_super_admin())
with check (public.is_org_member(organization_id) or public.is_hizen_super_admin());
create policy tv_source_authorizations_delete on public.tv_source_authorizations
for delete using (public.is_org_member(organization_id) or public.is_hizen_super_admin());

create policy tv_recorder_sessions_select on public.tv_recorder_sessions
for select using (public.is_org_member(organization_id) or public.is_hizen_super_admin());
create policy tv_recorder_sessions_insert on public.tv_recorder_sessions
for insert with check (public.is_org_member(organization_id) or public.is_hizen_super_admin());
create policy tv_recorder_sessions_update on public.tv_recorder_sessions
for update using (public.is_org_member(organization_id) or public.is_hizen_super_admin())
with check (public.is_org_member(organization_id) or public.is_hizen_super_admin());
create policy tv_recorder_sessions_delete on public.tv_recorder_sessions
for delete using (public.is_org_member(organization_id) or public.is_hizen_super_admin());

create policy tv_channel_detection_settings_select on public.tv_channel_detection_settings
for select using (public.is_org_member(organization_id) or public.is_hizen_super_admin());
create policy tv_channel_detection_settings_insert on public.tv_channel_detection_settings
for insert with check (public.is_org_member(organization_id) or public.is_hizen_super_admin());
create policy tv_channel_detection_settings_update on public.tv_channel_detection_settings
for update using (public.is_org_member(organization_id) or public.is_hizen_super_admin())
with check (public.is_org_member(organization_id) or public.is_hizen_super_admin());
create policy tv_channel_detection_settings_delete on public.tv_channel_detection_settings
for delete using (public.is_org_member(organization_id) or public.is_hizen_super_admin());

create policy tv_ad_occurrence_sources_select on public.tv_ad_occurrence_sources
for select using (public.is_org_member(organization_id) or public.is_hizen_super_admin());
create policy tv_ad_occurrence_sources_insert on public.tv_ad_occurrence_sources
for insert with check (public.is_org_member(organization_id) or public.is_hizen_super_admin());
create policy tv_ad_occurrence_sources_update on public.tv_ad_occurrence_sources
for update using (public.is_org_member(organization_id) or public.is_hizen_super_admin())
with check (public.is_org_member(organization_id) or public.is_hizen_super_admin());
create policy tv_ad_occurrence_sources_delete on public.tv_ad_occurrence_sources
for delete using (public.is_org_member(organization_id) or public.is_hizen_super_admin());

create policy creative_fingerprints_select on public.creative_fingerprints
for select using (public.is_org_member(organization_id) or public.is_hizen_super_admin());
create policy creative_fingerprints_insert on public.creative_fingerprints
for insert with check (public.is_org_member(organization_id) or public.is_hizen_super_admin());
create policy creative_fingerprints_update on public.creative_fingerprints
for update using (public.is_org_member(organization_id) or public.is_hizen_super_admin())
with check (public.is_org_member(organization_id) or public.is_hizen_super_admin());
create policy creative_fingerprints_delete on public.creative_fingerprints
for delete using (public.is_org_member(organization_id) or public.is_hizen_super_admin());

create trigger tv_source_authorizations_set_updated_at
before update on public.tv_source_authorizations
for each row execute function public.set_updated_at();

create trigger tv_recorder_sessions_set_updated_at
before update on public.tv_recorder_sessions
for each row execute function public.set_updated_at();

create trigger tv_channel_detection_settings_set_updated_at
before update on public.tv_channel_detection_settings
for each row execute function public.set_updated_at();
