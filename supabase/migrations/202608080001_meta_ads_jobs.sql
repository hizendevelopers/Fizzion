create table if not exists public.meta_ads_jobs (
  id text primary key,
  query_url text not null,
  max_ads integer not null,
  status text not null,
  progress_message text not null default '',
  found_count integer not null default 0,
  processed_count integer not null default 0,
  actor_run_id text,
  dataset_id text,
  ads_json jsonb not null default '[]'::jsonb,
  raw_items_json jsonb not null default '[]'::jsonb,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_meta_ads_jobs_status_updated_at
  on public.meta_ads_jobs (status, updated_at desc);

create index if not exists idx_meta_ads_jobs_actor_run_id
  on public.meta_ads_jobs (actor_run_id);

alter table public.meta_ads_jobs enable row level security;

drop policy if exists meta_ads_jobs_deny_all on public.meta_ads_jobs;
create policy meta_ads_jobs_deny_all on public.meta_ads_jobs
  for all
  using (false)
  with check (false);

drop trigger if exists meta_ads_jobs_set_updated_at on public.meta_ads_jobs;
create trigger meta_ads_jobs_set_updated_at
  before update on public.meta_ads_jobs
  for each row execute function public.set_updated_at();

