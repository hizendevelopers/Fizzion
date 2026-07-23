create table if not exists public.tv_youtube_channels (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  channel_id text not null,
  title text not null,
  handle text,
  custom_url text,
  description text,
  thumbnail_url text,
  subscriber_count bigint,
  video_count bigint,
  view_count bigint,
  is_active boolean not null default true,
  connected_at timestamptz not null default now(),
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, channel_id)
);

create index if not exists idx_tv_youtube_channels_org_active
  on public.tv_youtube_channels (organization_id, is_active, connected_at desc);

alter table public.tv_youtube_channels enable row level security;

drop policy if exists tv_youtube_channels_select on public.tv_youtube_channels;
drop policy if exists tv_youtube_channels_insert on public.tv_youtube_channels;
drop policy if exists tv_youtube_channels_update on public.tv_youtube_channels;
drop policy if exists tv_youtube_channels_delete on public.tv_youtube_channels;

create policy tv_youtube_channels_select on public.tv_youtube_channels
for select using (public.is_org_member(organization_id) or public.is_hizen_super_admin());

create policy tv_youtube_channels_insert on public.tv_youtube_channels
for insert with check (public.is_org_member(organization_id) or public.is_hizen_super_admin());

create policy tv_youtube_channels_update on public.tv_youtube_channels
for update using (public.is_org_member(organization_id) or public.is_hizen_super_admin())
with check (public.is_org_member(organization_id) or public.is_hizen_super_admin());

create policy tv_youtube_channels_delete on public.tv_youtube_channels
for delete using (public.is_org_member(organization_id) or public.is_hizen_super_admin());

drop trigger if exists tv_youtube_channels_set_updated_at on public.tv_youtube_channels;
create trigger tv_youtube_channels_set_updated_at
before update on public.tv_youtube_channels
for each row execute function public.set_updated_at();
