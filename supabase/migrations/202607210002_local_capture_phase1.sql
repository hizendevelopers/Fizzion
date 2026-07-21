create table if not exists public.capture_devices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  device_name text not null,
  device_type text not null default 'windows_laptop',
  operating_system text not null default 'Windows',
  agent_version text,
  assigned_channel_id uuid references public.tv_channels(id) on delete set null,
  registration_status text not null default 'pending_approval',
  current_status text not null default 'initializing',
  local_timezone text not null default 'Asia/Baghdad',
  capture_folder text,
  total_disk_bytes bigint,
  available_disk_bytes bigint,
  obs_detected boolean not null default false,
  chrome_detected boolean not null default false,
  last_heartbeat_at timestamptz,
  last_seen_ip inet,
  metadata jsonb not null default '{}'::jsonb,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.capture_device_tokens (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  device_id uuid not null references public.capture_devices(id) on delete cascade,
  token_hash text not null,
  token_type text not null default 'access',
  expires_at timestamptz not null,
  last_used_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.capture_device_heartbeats (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  device_id uuid not null references public.capture_devices(id) on delete cascade,
  status text not null,
  obs_running boolean not null default false,
  chrome_running boolean not null default false,
  disk_free_bytes bigint,
  pending_files integer not null default 0,
  current_upload_id uuid,
  payload jsonb not null default '{}'::jsonb,
  recorded_at timestamptz not null default now()
);

create table if not exists public.tv_upload_sessions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  device_id uuid not null references public.capture_devices(id) on delete cascade,
  channel_id uuid not null references public.tv_channels(id) on delete cascade,
  filename text not null,
  file_size_bytes bigint not null,
  sha256 text not null,
  multipart_upload_reference text,
  storage_key text,
  status text not null default 'initialized',
  uploaded_bytes bigint not null default 0,
  expires_at timestamptz not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

alter table if exists public.tv_recording_files
  add column if not exists capture_device_id uuid references public.capture_devices(id) on delete set null,
  add column if not exists source_start_time timestamptz,
  add column if not exists source_type text,
  add column if not exists timestamp_confidence text default 'unknown',
  add column if not exists quality_summary jsonb not null default '{}'::jsonb;

update public.tv_recording_files
set
  capture_device_id = capture_device_id,
  source_start_time = coalesce(source_start_time, start_time_utc, source_timestamp),
  source_type = coalesce(source_type, upload_mode),
  timestamp_confidence = coalesce(timestamp_confidence, 'source_metadata'),
  quality_summary = coalesce(quality_summary, '{}'::jsonb)
where true;

alter table if exists public.tv_processing_jobs
  add column if not exists capture_device_id uuid references public.capture_devices(id) on delete set null;

create index if not exists idx_capture_devices_org_status on public.capture_devices (organization_id, registration_status, current_status);
create index if not exists idx_capture_devices_channel on public.capture_devices (assigned_channel_id, last_heartbeat_at desc);
create unique index if not exists idx_capture_device_tokens_hash_type on public.capture_device_tokens (token_hash, token_type) where revoked_at is null;
create index if not exists idx_capture_device_tokens_device on public.capture_device_tokens (device_id, token_type, expires_at desc);
create index if not exists idx_capture_device_heartbeats_device_time on public.capture_device_heartbeats (device_id, recorded_at desc);
create unique index if not exists idx_tv_upload_sessions_device_sha on public.tv_upload_sessions (device_id, sha256);
create index if not exists idx_tv_upload_sessions_channel_status on public.tv_upload_sessions (channel_id, status, created_at desc);
create index if not exists idx_tv_recording_files_capture_device on public.tv_recording_files (capture_device_id, start_time_utc desc);
create index if not exists idx_tv_processing_jobs_capture_device on public.tv_processing_jobs (capture_device_id, created_at desc);

alter table public.capture_devices enable row level security;
alter table public.capture_device_tokens enable row level security;
alter table public.capture_device_heartbeats enable row level security;
alter table public.tv_upload_sessions enable row level security;

create policy capture_devices_select on public.capture_devices
for select using (public.is_org_member(organization_id) or public.is_hizen_super_admin());
create policy capture_devices_insert on public.capture_devices
for insert with check (public.is_org_member(organization_id) or public.is_hizen_super_admin());
create policy capture_devices_update on public.capture_devices
for update using (public.is_org_member(organization_id) or public.is_hizen_super_admin())
with check (public.is_org_member(organization_id) or public.is_hizen_super_admin());
create policy capture_devices_delete on public.capture_devices
for delete using (public.is_org_member(organization_id) or public.is_hizen_super_admin());

create policy capture_device_tokens_select on public.capture_device_tokens
for select using (public.is_org_member(organization_id) or public.is_hizen_super_admin());
create policy capture_device_tokens_insert on public.capture_device_tokens
for insert with check (public.is_org_member(organization_id) or public.is_hizen_super_admin());
create policy capture_device_tokens_update on public.capture_device_tokens
for update using (public.is_org_member(organization_id) or public.is_hizen_super_admin())
with check (public.is_org_member(organization_id) or public.is_hizen_super_admin());
create policy capture_device_tokens_delete on public.capture_device_tokens
for delete using (public.is_org_member(organization_id) or public.is_hizen_super_admin());

create policy capture_device_heartbeats_select on public.capture_device_heartbeats
for select using (public.is_org_member(organization_id) or public.is_hizen_super_admin());
create policy capture_device_heartbeats_insert on public.capture_device_heartbeats
for insert with check (public.is_org_member(organization_id) or public.is_hizen_super_admin());
create policy capture_device_heartbeats_update on public.capture_device_heartbeats
for update using (public.is_org_member(organization_id) or public.is_hizen_super_admin())
with check (public.is_org_member(organization_id) or public.is_hizen_super_admin());
create policy capture_device_heartbeats_delete on public.capture_device_heartbeats
for delete using (public.is_org_member(organization_id) or public.is_hizen_super_admin());

create policy tv_upload_sessions_select on public.tv_upload_sessions
for select using (public.is_org_member(organization_id) or public.is_hizen_super_admin());
create policy tv_upload_sessions_insert on public.tv_upload_sessions
for insert with check (public.is_org_member(organization_id) or public.is_hizen_super_admin());
create policy tv_upload_sessions_update on public.tv_upload_sessions
for update using (public.is_org_member(organization_id) or public.is_hizen_super_admin())
with check (public.is_org_member(organization_id) or public.is_hizen_super_admin());
create policy tv_upload_sessions_delete on public.tv_upload_sessions
for delete using (public.is_org_member(organization_id) or public.is_hizen_super_admin());

create trigger capture_devices_set_updated_at
before update on public.capture_devices
for each row execute function public.set_updated_at();
