create table if not exists public.meta_library_ads (
  id uuid primary key default gen_random_uuid(),
  job_id text not null references public.meta_ads_jobs(id) on delete cascade,
  ad_library_id text not null,
  page_id text,
  page_name text,
  advertiser_url text,
  ad_library_url text not null,
  status text not null,
  platforms text[] not null default '{}',
  start_date timestamptz,
  end_date timestamptz,
  landing_domain text,
  creative_type text,
  cta_type text,
  similar_ads integer,
  variation_group_id text,
  variation_count integer,
  spend_json jsonb not null default '{}'::jsonb,
  impressions_json jsonb not null default '{}'::jsonb,
  audience_size_json jsonb not null default '{}'::jsonb,
  meta_metrics_json jsonb not null default '{}'::jsonb,
  meta_detail_metrics_json jsonb not null default '{}'::jsonb,
  model_metrics_json jsonb not null default '{}'::jsonb,
  pathmatics_metrics_json jsonb not null default '{}'::jsonb,
  final_metrics_json jsonb not null default '{}'::jsonb,
  debug_json jsonb not null default '{}'::jsonb,
  intelligence_match_json jsonb not null default '{}'::jsonb,
  raw_meta_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (job_id, ad_library_id)
);

create table if not exists public.meta_ads_insights_import_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  source text not null default 'META_ADS_INSIGHTS',
  account_id text not null,
  status text not null default 'queued',
  requested_since date,
  requested_until date,
  rows_imported integer not null default 0,
  rows_rejected integer not null default 0,
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.meta_impressions_ground_truth_labels (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  record_id text not null,
  source text not null,
  label_quality text not null,
  label_strength text not null default 'STRONG',
  source_record_id text not null,
  source_import_run_id uuid references public.meta_ads_insights_import_runs(id) on delete set null,
  ad_library_id text,
  meta_ad_id text,
  advertiser_id text,
  advertiser_name text,
  campaign_id text,
  adset_id text,
  platforms text[] not null default '{}',
  platform_positions text[] not null default '{}',
  country text,
  geo_scope text,
  measurement_scope text,
  measurement_start date not null,
  measurement_end date not null,
  start_date date,
  end_date date,
  active_days integer,
  creative_type text,
  cta_type text,
  landing_domain text,
  landing_url text,
  ad_text text,
  headline text,
  description text,
  reach_low bigint,
  reach_high bigint,
  reach bigint,
  impressions_low bigint,
  impressions_high bigint,
  impressions bigint,
  frequency numeric(18,6),
  weak_frequency_low numeric(18,6),
  weak_frequency_high numeric(18,6),
  spend numeric(18,2),
  spend_low numeric(18,2),
  spend_high numeric(18,2),
  spend_currency text,
  is_label_aligned boolean not null default false,
  alignment_notes text[] not null default '{}',
  quality_flags jsonb not null default '{}'::jsonb,
  raw_payload jsonb not null default '{}'::jsonb,
  retrieved_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, record_id),
  unique (organization_id, source, source_record_id, measurement_start, measurement_end)
);

create table if not exists public.meta_impressions_dataset_snapshots (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  dataset_version text not null,
  dataset_created_at timestamptz not null default now(),
  record_count integer not null default 0,
  aligned_record_count integer not null default 0,
  rejected_record_count integer not null default 0,
  unique_advertiser_count integer not null default 0,
  date_min date,
  date_max date,
  source_counts jsonb not null default '{}'::jsonb,
  geo_counts jsonb not null default '{}'::jsonb,
  platform_counts jsonb not null default '{}'::jsonb,
  creative_type_counts jsonb not null default '{}'::jsonb,
  output_manifest jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, dataset_version)
);

create table if not exists public.meta_impressions_model_registry (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  model_version text not null,
  model_family text not null default 'meta_impressions_frequency',
  state text not null default 'CANDIDATE',
  dataset_version text not null,
  calibration_version text,
  feature_schema jsonb not null default '{}'::jsonb,
  training_config jsonb not null default '{}'::jsonb,
  metrics jsonb not null default '{}'::jsonb,
  calibration jsonb not null default '{}'::jsonb,
  artifacts_manifest jsonb not null default '{}'::jsonb,
  trained_at timestamptz,
  promoted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, model_version)
);

create table if not exists public.meta_impression_predictions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  ad_library_id text not null,
  metric text not null default 'IMPRESSIONS',
  estimate bigint,
  low bigint,
  high bigint,
  predicted_frequency numeric(18,6),
  source text not null default 'IN_HOUSE_MODEL',
  data_type text not null default 'MODELED_ESTIMATE',
  model_version text,
  dataset_version text,
  confidence text,
  feature_coverage numeric(8,4),
  distribution_status text,
  prediction_reasons jsonb not null default '[]'::jsonb,
  feature_vector jsonb not null default '{}'::jsonb,
  predicted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_meta_library_ads_job_ad
  on public.meta_library_ads (job_id, ad_library_id);

create index if not exists idx_meta_ads_insights_import_runs_org_status
  on public.meta_ads_insights_import_runs (organization_id, status, created_at desc);

create index if not exists idx_meta_impressions_ground_truth_labels_org_quality
  on public.meta_impressions_ground_truth_labels (organization_id, label_quality, measurement_start desc);

create index if not exists idx_meta_impressions_ground_truth_labels_ad_library
  on public.meta_impressions_ground_truth_labels (ad_library_id);

create index if not exists idx_meta_impressions_ground_truth_labels_meta_ad
  on public.meta_impressions_ground_truth_labels (meta_ad_id);

create index if not exists idx_meta_impressions_dataset_snapshots_org_version
  on public.meta_impressions_dataset_snapshots (organization_id, dataset_version desc);

create index if not exists idx_meta_impressions_model_registry_org_state
  on public.meta_impressions_model_registry (organization_id, state, trained_at desc);

create index if not exists idx_meta_impression_predictions_org_ad
  on public.meta_impression_predictions (organization_id, ad_library_id, predicted_at desc);

alter table public.meta_library_ads enable row level security;
alter table public.meta_ads_insights_import_runs enable row level security;
alter table public.meta_impressions_ground_truth_labels enable row level security;
alter table public.meta_impressions_dataset_snapshots enable row level security;
alter table public.meta_impressions_model_registry enable row level security;
alter table public.meta_impression_predictions enable row level security;

drop policy if exists meta_library_ads_deny_all on public.meta_library_ads;
create policy meta_library_ads_deny_all on public.meta_library_ads
  for all
  using (false)
  with check (false);

do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'meta_library_ads',
    'meta_ads_insights_import_runs',
    'meta_impressions_ground_truth_labels',
    'meta_impressions_dataset_snapshots',
    'meta_impressions_model_registry',
    'meta_impression_predictions'
  ]
  loop
    if tbl = 'meta_library_ads' then
      execute format(
        'drop trigger if exists %I on public.%I',
        tbl || '_set_updated_at',
        tbl
      );
      execute format(
        'create trigger %I before update on public.%I for each row execute function public.set_updated_at()',
        tbl || '_set_updated_at',
        tbl
      );
      continue;
    end if;
    execute format(
      'drop policy if exists %I on public.%I',
      tbl || '_select',
      tbl
    );
    execute format(
      'drop policy if exists %I on public.%I',
      tbl || '_insert',
      tbl
    );
    execute format(
      'drop policy if exists %I on public.%I',
      tbl || '_update',
      tbl
    );
    execute format(
      'drop policy if exists %I on public.%I',
      tbl || '_delete',
      tbl
    );
    execute format(
      'drop trigger if exists %I on public.%I',
      tbl || '_set_updated_at',
      tbl
    );
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
    execute format(
      'create trigger %I before update on public.%I for each row execute function public.set_updated_at()',
      tbl || '_set_updated_at',
      tbl
    );
  end loop;
end $$;
