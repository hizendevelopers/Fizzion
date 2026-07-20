alter table if exists public.social_connections
  add column if not exists user_id uuid references auth.users(id) on delete set null,
  add column if not exists external_account_id text,
  add column if not exists account_name text,
  add column if not exists username text,
  add column if not exists account_type text,
  add column if not exists profile_image_url text,
  add column if not exists public_profile_url text,
  add column if not exists connection_status text not null default 'pending',
  add column if not exists sync_status text not null default 'idle',
  add column if not exists last_synced_at timestamptz,
  add column if not exists last_successful_sync_at timestamptz,
  add column if not exists next_sync_at timestamptz,
  add column if not exists token_status text not null default 'valid',
  add column if not exists sandbox_mode boolean not null default false,
  add column if not exists account_metadata jsonb not null default '{}'::jsonb;

create unique index if not exists idx_social_connections_org_provider_external_account
  on public.social_connections (organization_id, connection_type, provider_account_id);

create unique index if not exists idx_social_connections_org_provider_external_account_v2
  on public.social_connections (organization_id, connection_type, external_account_id);

alter table if exists public.social_oauth_tokens
  add column if not exists token_type text,
  add column if not exists provider_user_id text,
  add column if not exists encryption_version text not null default 'v1',
  add column if not exists scope_hash text,
  add column if not exists revoked_at timestamptz;

alter table if exists public.social_accounts
  add column if not exists platform_account_kind text,
  add column if not exists discovery_status text not null default 'discovered',
  add column if not exists public_profile_data jsonb not null default '{}'::jsonb,
  add column if not exists last_profile_refresh_at timestamptz;

alter table if exists public.social_account_snapshots
  add column if not exists likes bigint,
  add column if not exists comments bigint,
  add column if not exists shares bigint,
  add column if not exists saves bigint,
  add column if not exists watch_time_seconds numeric(18,4),
  add column if not exists normalized_metrics jsonb not null default '{}'::jsonb;

alter table if exists public.social_posts
  add column if not exists title text,
  add column if not exists description text,
  add column if not exists tagged_accounts text[] not null default '{}',
  add column if not exists collaborators text[] not null default '{}',
  add column if not exists location_name text,
  add column if not exists paid_status text,
  add column if not exists processing_status text not null default 'ready',
  add column if not exists content_status text,
  add column if not exists raw_payload_json jsonb not null default '{}'::jsonb;

alter table if exists public.social_post_media
  add column if not exists alt_text text,
  add column if not exists preview_embed_html text;

alter table if exists public.social_post_metrics
  add column if not exists unique_viewers numeric(18,4),
  add column if not exists watch_time_seconds numeric(18,4),
  add column if not exists average_watch_time_seconds numeric(18,4),
  add column if not exists completion_rate numeric(8,4),
  add column if not exists profile_visits numeric(18,4),
  add column if not exists website_clicks numeric(18,4),
  add column if not exists normalized_metrics jsonb not null default '{}'::jsonb,
  add column if not exists raw_metrics_json jsonb not null default '{}'::jsonb;

alter table if exists public.social_account_metrics
  add column if not exists unique_viewers numeric(18,4),
  add column if not exists watch_time_seconds numeric(18,4),
  add column if not exists average_watch_time_seconds numeric(18,4),
  add column if not exists completion_rate numeric(8,4),
  add column if not exists profile_visits numeric(18,4),
  add column if not exists website_clicks numeric(18,4),
  add column if not exists normalized_metrics jsonb not null default '{}'::jsonb,
  add column if not exists raw_metrics_json jsonb not null default '{}'::jsonb;

alter table if exists public.social_sync_jobs
  add column if not exists records_processed integer not null default 0,
  add column if not exists next_cursor text,
  add column if not exists error_code text,
  add column if not exists metadata_json jsonb not null default '{}'::jsonb,
  add column if not exists provider text,
  add column if not exists connection_id uuid references public.social_connections(id) on delete set null;

create table if not exists public.social_comments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  social_post_id uuid not null references public.social_posts(id) on delete cascade,
  external_comment_id text not null,
  parent_comment_id uuid references public.social_comments(id) on delete cascade,
  author_external_id text,
  author_name text,
  author_avatar_url text,
  comment_text text not null,
  comment_likes bigint,
  replies_count integer not null default 0,
  sentiment text not null default 'neutral',
  is_spam_like boolean not null default false,
  published_at timestamptz not null,
  raw_payload_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (social_post_id, external_comment_id)
);

create table if not exists public.social_webhook_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  provider text not null,
  external_event_id text not null,
  connection_id uuid references public.social_connections(id) on delete set null,
  event_type text not null,
  payload_json jsonb not null,
  processing_status text not null default 'pending',
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (provider, external_event_id)
);

create table if not exists public.social_oauth_states (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  provider text not null,
  state_token text not null unique,
  redirect_uri text,
  verifier text,
  mode text not null default 'live',
  expires_at timestamptz not null,
  used_at timestamptz,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_social_comments_post_published
  on public.social_comments (social_post_id, published_at desc);
create index if not exists idx_social_comments_org_sentiment
  on public.social_comments (organization_id, sentiment, published_at desc);
create index if not exists idx_social_webhook_events_provider_status
  on public.social_webhook_events (provider, processing_status, received_at desc);
create index if not exists idx_social_sync_jobs_connection_status
  on public.social_sync_jobs (connection_id, status, created_at desc);
create index if not exists idx_social_account_snapshots_account_captured
  on public.social_account_snapshots (social_account_id, captured_at desc);
create index if not exists idx_social_connections_user_status
  on public.social_connections (user_id, connection_status, updated_at desc);
create index if not exists idx_social_posts_connection_published
  on public.social_posts (social_account_id, published_at desc);

alter table public.social_comments enable row level security;
alter table public.social_webhook_events enable row level security;
alter table public.social_oauth_states enable row level security;

create policy social_comments_select on public.social_comments
for select using (public.is_org_member(organization_id) or public.is_hizen_super_admin());
create policy social_comments_insert on public.social_comments
for insert with check (public.is_org_member(organization_id) or public.is_hizen_super_admin());
create policy social_comments_update on public.social_comments
for update using (public.is_org_member(organization_id) or public.is_hizen_super_admin())
with check (public.is_org_member(organization_id) or public.is_hizen_super_admin());
create policy social_comments_delete on public.social_comments
for delete using (public.is_org_member(organization_id) or public.is_hizen_super_admin());

create policy social_webhook_events_select on public.social_webhook_events
for select using (public.is_org_member(organization_id) or public.is_hizen_super_admin() or organization_id is null);
create policy social_webhook_events_insert on public.social_webhook_events
for insert with check (public.is_org_member(organization_id) or public.is_hizen_super_admin() or organization_id is null);
create policy social_webhook_events_update on public.social_webhook_events
for update using (public.is_org_member(organization_id) or public.is_hizen_super_admin() or organization_id is null)
with check (public.is_org_member(organization_id) or public.is_hizen_super_admin() or organization_id is null);
create policy social_webhook_events_delete on public.social_webhook_events
for delete using (public.is_org_member(organization_id) or public.is_hizen_super_admin() or organization_id is null);

create policy social_oauth_states_select on public.social_oauth_states
for select using (user_id = auth.uid() or public.is_hizen_super_admin());
create policy social_oauth_states_insert on public.social_oauth_states
for insert with check (user_id = auth.uid() or public.is_hizen_super_admin() or user_id is null);
create policy social_oauth_states_update on public.social_oauth_states
for update using (user_id = auth.uid() or public.is_hizen_super_admin() or user_id is null)
with check (user_id = auth.uid() or public.is_hizen_super_admin() or user_id is null);
create policy social_oauth_states_delete on public.social_oauth_states
for delete using (user_id = auth.uid() or public.is_hizen_super_admin() or user_id is null);

create trigger social_comments_set_updated_at
before update on public.social_comments
for each row execute function public.set_updated_at();
