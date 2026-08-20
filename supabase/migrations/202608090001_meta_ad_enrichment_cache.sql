create table if not exists public.meta_ad_enrichment_cache (
  ad_library_id text primary key,
  detail_url text not null,
  meta_detail_json jsonb not null default '{}'::jsonb,
  final_metrics_json jsonb not null default '{}'::jsonb,
  pathmatics_json jsonb not null default '{}'::jsonb,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_meta_ad_enrichment_cache_expires_at
  on public.meta_ad_enrichment_cache (expires_at desc);

alter table public.meta_ad_enrichment_cache enable row level security;

drop policy if exists meta_ad_enrichment_cache_deny_all on public.meta_ad_enrichment_cache;
create policy meta_ad_enrichment_cache_deny_all on public.meta_ad_enrichment_cache
  for all
  using (false)
  with check (false);

drop trigger if exists meta_ad_enrichment_cache_set_updated_at on public.meta_ad_enrichment_cache;
create trigger meta_ad_enrichment_cache_set_updated_at
  before update on public.meta_ad_enrichment_cache
  for each row execute function public.set_updated_at();

