alter table if exists public.brands
  add column if not exists slug text,
  add column if not exists logo_url text,
  add column if not exists is_dummy_brand boolean not null default false;

update public.brands
set slug = coalesce(slug, lower(regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g')))
where slug is null;

create unique index if not exists idx_brands_org_slug on public.brands (organization_id, slug);
create unique index if not exists idx_ooh_asset_images_asset_url on public.ooh_asset_images (asset_id, image_url);
create unique index if not exists idx_ooh_audience_metrics_asset_measurement on public.ooh_audience_metrics (asset_id, measurement_date);
create unique index if not exists idx_ooh_availability_asset_window on public.ooh_availability_periods (asset_id, start_date, end_date, status);
