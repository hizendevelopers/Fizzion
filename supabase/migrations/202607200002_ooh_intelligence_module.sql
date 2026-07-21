create table if not exists public.ooh_areas (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  country text not null,
  city text not null,
  name text not null,
  slug text not null,
  center_latitude numeric(10,7),
  center_longitude numeric(10,7),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, slug)
);

create table if not exists public.ooh_assets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  asset_code text not null,
  media_type text not null,
  status text not null default 'ACTIVE',
  country text not null,
  city text not null,
  area_id uuid references public.ooh_areas(id) on delete set null,
  location_name text not null,
  address text,
  landmark text,
  latitude numeric(10,7),
  longitude numeric(10,7),
  width numeric(12,2),
  height numeric(12,2),
  dimension_unit text not null default 'METER',
  number_of_faces integer not null default 1,
  total_sqm numeric(12,2),
  facing_direction text,
  road_type text,
  illumination text,
  media_owner text,
  contact_name text,
  contact_phone text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, asset_code)
);

create table if not exists public.ooh_digital_screen_specifications (
  asset_id uuid primary key references public.ooh_assets(id) on delete cascade,
  resolution_width integer,
  resolution_height integer,
  brightness_nits integer,
  operating_start_time time,
  operating_end_time time,
  loop_length_seconds integer,
  spot_length_seconds integer,
  estimated_plays_per_day integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ooh_placements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  asset_id uuid not null references public.ooh_assets(id) on delete cascade,
  campaign_id uuid references public.campaigns(id) on delete set null,
  installed_at date,
  removed_at date,
  daily_cost numeric(14,2),
  weekly_cost numeric(14,2),
  monthly_cost numeric(14,2),
  currency text,
  creative_image_url text,
  proof_of_play_url text,
  status text not null default 'CURRENT',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ooh_asset_images (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  asset_id uuid not null references public.ooh_assets(id) on delete cascade,
  image_url text not null,
  image_type text not null,
  alt_text text,
  sort_order integer not null default 0,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.ooh_audience_metrics (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  asset_id uuid not null references public.ooh_assets(id) on delete cascade,
  measurement_date date not null,
  expected_daily_audience integer,
  daily_vehicle_volume integer,
  daily_pedestrian_volume integer,
  estimated_daily_impressions integer,
  estimated_monthly_reach integer,
  average_frequency numeric(10,2),
  dwell_time_seconds integer,
  visibility_score integer,
  audience_confidence text,
  nearby_poi_count integer,
  created_at timestamptz not null default now()
);

create table if not exists public.ooh_availability_periods (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  asset_id uuid not null references public.ooh_assets(id) on delete cascade,
  start_date date not null,
  end_date date not null,
  status text not null default 'AVAILABLE',
  campaign_id uuid references public.campaigns(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ooh_import_records (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  source_file_name text not null,
  source_sheet text not null,
  source_row integer not null,
  raw_data jsonb not null default '{}'::jsonb,
  imported_asset_id uuid references public.ooh_assets(id) on delete set null,
  import_status text not null default 'pending',
  warnings jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_ooh_areas_org_city on public.ooh_areas (organization_id, city, slug);
create index if not exists idx_ooh_assets_org_code on public.ooh_assets (organization_id, asset_code);
create index if not exists idx_ooh_assets_filters on public.ooh_assets (organization_id, media_type, status, country, city, area_id);
create index if not exists idx_ooh_assets_geo on public.ooh_assets (latitude, longitude);
create index if not exists idx_ooh_placements_asset_status on public.ooh_placements (asset_id, status, installed_at, removed_at);
create index if not exists idx_ooh_audience_metrics_asset_date on public.ooh_audience_metrics (asset_id, measurement_date desc);
create index if not exists idx_ooh_availability_asset_dates on public.ooh_availability_periods (asset_id, start_date, end_date, status);
create index if not exists idx_ooh_import_records_file_sheet on public.ooh_import_records (source_file_name, source_sheet, source_row);

alter table public.ooh_areas enable row level security;
alter table public.ooh_assets enable row level security;
alter table public.ooh_digital_screen_specifications enable row level security;
alter table public.ooh_placements enable row level security;
alter table public.ooh_asset_images enable row level security;
alter table public.ooh_audience_metrics enable row level security;
alter table public.ooh_availability_periods enable row level security;
alter table public.ooh_import_records enable row level security;

create policy ooh_areas_select on public.ooh_areas for select using (public.is_org_member(organization_id) or public.is_hizen_super_admin());
create policy ooh_areas_insert on public.ooh_areas for insert with check (public.is_org_member(organization_id) or public.is_hizen_super_admin());
create policy ooh_areas_update on public.ooh_areas for update using (public.is_org_member(organization_id) or public.is_hizen_super_admin()) with check (public.is_org_member(organization_id) or public.is_hizen_super_admin());
create policy ooh_areas_delete on public.ooh_areas for delete using (public.is_org_member(organization_id) or public.is_hizen_super_admin());

create policy ooh_assets_select on public.ooh_assets for select using (public.is_org_member(organization_id) or public.is_hizen_super_admin());
create policy ooh_assets_insert on public.ooh_assets for insert with check (public.is_org_member(organization_id) or public.is_hizen_super_admin());
create policy ooh_assets_update on public.ooh_assets for update using (public.is_org_member(organization_id) or public.is_hizen_super_admin()) with check (public.is_org_member(organization_id) or public.is_hizen_super_admin());
create policy ooh_assets_delete on public.ooh_assets for delete using (public.is_org_member(organization_id) or public.is_hizen_super_admin());

create policy ooh_digital_specs_select on public.ooh_digital_screen_specifications for select using (
  exists (
    select 1 from public.ooh_assets a
    where a.id = asset_id and (public.is_org_member(a.organization_id) or public.is_hizen_super_admin())
  )
);
create policy ooh_digital_specs_insert on public.ooh_digital_screen_specifications for insert with check (
  exists (
    select 1 from public.ooh_assets a
    where a.id = asset_id and (public.is_org_member(a.organization_id) or public.is_hizen_super_admin())
  )
);
create policy ooh_digital_specs_update on public.ooh_digital_screen_specifications for update using (
  exists (
    select 1 from public.ooh_assets a
    where a.id = asset_id and (public.is_org_member(a.organization_id) or public.is_hizen_super_admin())
  )
) with check (
  exists (
    select 1 from public.ooh_assets a
    where a.id = asset_id and (public.is_org_member(a.organization_id) or public.is_hizen_super_admin())
  )
);
create policy ooh_digital_specs_delete on public.ooh_digital_screen_specifications for delete using (
  exists (
    select 1 from public.ooh_assets a
    where a.id = asset_id and (public.is_org_member(a.organization_id) or public.is_hizen_super_admin())
  )
);

create policy ooh_placements_select on public.ooh_placements for select using (public.is_org_member(organization_id) or public.is_hizen_super_admin());
create policy ooh_placements_insert on public.ooh_placements for insert with check (public.is_org_member(organization_id) or public.is_hizen_super_admin());
create policy ooh_placements_update on public.ooh_placements for update using (public.is_org_member(organization_id) or public.is_hizen_super_admin()) with check (public.is_org_member(organization_id) or public.is_hizen_super_admin());
create policy ooh_placements_delete on public.ooh_placements for delete using (public.is_org_member(organization_id) or public.is_hizen_super_admin());

create policy ooh_asset_images_select on public.ooh_asset_images for select using (public.is_org_member(organization_id) or public.is_hizen_super_admin());
create policy ooh_asset_images_insert on public.ooh_asset_images for insert with check (public.is_org_member(organization_id) or public.is_hizen_super_admin());
create policy ooh_asset_images_update on public.ooh_asset_images for update using (public.is_org_member(organization_id) or public.is_hizen_super_admin()) with check (public.is_org_member(organization_id) or public.is_hizen_super_admin());
create policy ooh_asset_images_delete on public.ooh_asset_images for delete using (public.is_org_member(organization_id) or public.is_hizen_super_admin());

create policy ooh_audience_metrics_select on public.ooh_audience_metrics for select using (public.is_org_member(organization_id) or public.is_hizen_super_admin());
create policy ooh_audience_metrics_insert on public.ooh_audience_metrics for insert with check (public.is_org_member(organization_id) or public.is_hizen_super_admin());
create policy ooh_audience_metrics_update on public.ooh_audience_metrics for update using (public.is_org_member(organization_id) or public.is_hizen_super_admin()) with check (public.is_org_member(organization_id) or public.is_hizen_super_admin());
create policy ooh_audience_metrics_delete on public.ooh_audience_metrics for delete using (public.is_org_member(organization_id) or public.is_hizen_super_admin());

create policy ooh_availability_periods_select on public.ooh_availability_periods for select using (public.is_org_member(organization_id) or public.is_hizen_super_admin());
create policy ooh_availability_periods_insert on public.ooh_availability_periods for insert with check (public.is_org_member(organization_id) or public.is_hizen_super_admin());
create policy ooh_availability_periods_update on public.ooh_availability_periods for update using (public.is_org_member(organization_id) or public.is_hizen_super_admin()) with check (public.is_org_member(organization_id) or public.is_hizen_super_admin());
create policy ooh_availability_periods_delete on public.ooh_availability_periods for delete using (public.is_org_member(organization_id) or public.is_hizen_super_admin());

create policy ooh_import_records_select on public.ooh_import_records for select using (public.is_org_member(organization_id) or public.is_hizen_super_admin());
create policy ooh_import_records_insert on public.ooh_import_records for insert with check (public.is_org_member(organization_id) or public.is_hizen_super_admin());
create policy ooh_import_records_update on public.ooh_import_records for update using (public.is_org_member(organization_id) or public.is_hizen_super_admin()) with check (public.is_org_member(organization_id) or public.is_hizen_super_admin());
create policy ooh_import_records_delete on public.ooh_import_records for delete using (public.is_org_member(organization_id) or public.is_hizen_super_admin());

create trigger ooh_areas_set_updated_at before update on public.ooh_areas for each row execute function public.set_updated_at();
create trigger ooh_assets_set_updated_at before update on public.ooh_assets for each row execute function public.set_updated_at();
create trigger ooh_digital_specs_set_updated_at before update on public.ooh_digital_screen_specifications for each row execute function public.set_updated_at();
create trigger ooh_placements_set_updated_at before update on public.ooh_placements for each row execute function public.set_updated_at();
create trigger ooh_availability_periods_set_updated_at before update on public.ooh_availability_periods for each row execute function public.set_updated_at();
