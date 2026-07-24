with org as (
  select id
  from public.organizations
  where slug = 'coca_cola_iraq'
),
brand_seed(name, slug, category, competitor_group, logo_url) as (
  values
    ('Coca-Cola', 'coca-cola', 'Beverages', 'owned', '/brand-logos/coca-cola.svg'),
    ('Coca-Cola Zero Sugar', 'coca-cola-zero-sugar', 'Beverages', 'owned', '/brand-logos/coca-cola-zero.svg'),
    ('Sprite', 'sprite', 'Beverages', 'owned', '/brand-logos/sprite.svg'),
    ('Fanta', 'fanta', 'Beverages', 'owned', '/brand-logos/fanta.svg'),
    ('Schweppes', 'schweppes', 'Beverages', 'owned', '/brand-logos/schweppes.svg'),
    ('Pepsi', 'pepsi', 'Beverages', 'competitor', '/brand-logos/pepsi.svg'),
    ('7UP', '7up', 'Beverages', 'competitor', '/brand-logos/7up.svg'),
    ('Mirinda', 'mirinda', 'Beverages', 'competitor', '/brand-logos/mirinda.svg'),
    ('Mountain Dew', 'mountain-dew', 'Beverages', 'competitor', '/brand-logos/mountain-dew.svg'),
    ('RC Cola', 'rc-cola', 'Beverages', 'competitor', '/brand-logos/rc-cola.svg')
)
insert into public.brands (
  organization_id,
  name,
  category,
  competitor_group,
  logo_url,
  slug,
  is_dummy_brand,
  is_active
)
select
  org.id,
  brand_seed.name,
  brand_seed.category,
  brand_seed.competitor_group,
  brand_seed.logo_url,
  brand_seed.slug,
  false,
  true
from org
cross join brand_seed
on conflict (organization_id, name) do update set
  category = excluded.category,
  competitor_group = excluded.competitor_group,
  logo_url = excluded.logo_url,
  slug = excluded.slug,
  is_dummy_brand = excluded.is_dummy_brand,
  is_active = excluded.is_active;

with org as (
  select id
  from public.organizations
  where slug = 'coca_cola_iraq'
),
campaign_seed(brand_name, campaign_name, objective, budget_amount, budget_currency) as (
  values
    ('Coca-Cola', 'Coca-Cola Summer Lift', 'Cold beverage awareness in Baghdad', 220000.00, 'USD'),
    ('Coca-Cola Zero Sugar', 'Zero Sugar Night Drive', 'Premium no-sugar urban push', 135000.00, 'USD'),
    ('Sprite', 'Sprite Heat Relief', 'Heat-season hydration messaging', 125000.00, 'USD'),
    ('Fanta', 'Fanta Orange Splash', 'Flavor-led youth campaign', 98000.00, 'USD'),
    ('Schweppes', 'Schweppes Premium Mixers', 'Premium mixer visibility drive', 86000.00, 'USD'),
    ('Pepsi', 'Pepsi Taste Challenge', 'Competitive high-frequency visibility', 205000.00, 'USD'),
    ('7UP', '7UP Chill Route', 'Refreshment message in commute corridors', 112000.00, 'USD'),
    ('Mirinda', 'Mirinda Burst', 'Flavor personality campaign', 102000.00, 'USD'),
    ('Mountain Dew', 'Mountain Dew Charge', 'Gaming and energy positioning', 93000.00, 'USD'),
    ('RC Cola', 'RC Cola Value Lift', 'Mass reach value-led campaign', 76000.00, 'USD')
)
insert into public.campaigns (
  organization_id,
  brand_id,
  name,
  market,
  start_date,
  end_date,
  objective,
  media_types,
  status,
  budget_amount,
  budget_currency
)
select
  org.id,
  brands.id,
  campaign_seed.campaign_name,
  'Iraq',
  date '2026-07-01',
  date '2026-08-31',
  campaign_seed.objective,
  array['ooh'],
  'active',
  campaign_seed.budget_amount,
  campaign_seed.budget_currency
from org
join campaign_seed on true
join public.brands brands
  on brands.organization_id = org.id
 and brands.name = campaign_seed.brand_name
on conflict (organization_id, name) do update set
  brand_id = excluded.brand_id,
  market = excluded.market,
  start_date = excluded.start_date,
  end_date = excluded.end_date,
  objective = excluded.objective,
  media_types = excluded.media_types,
  status = excluded.status,
  budget_amount = excluded.budget_amount,
  budget_currency = excluded.budget_currency;

with org as (
  select id
  from public.organizations
  where slug = 'coca_cola_iraq'
),
placement_seed(asset_code, campaign_name, installed_at, removed_at, daily_cost, weekly_cost, monthly_cost, currency, status) as (
  values
    ('BA-MA 1', 'Coca-Cola Summer Lift', date '2026-07-01', date '2026-08-15', 4200.00, 29400.00, 126000.00, 'USD', 'CURRENT'),
    ('BA-KDH 2', 'Pepsi Taste Challenge', date '2026-07-02', date '2026-08-14', 3900.00, 27300.00, 117000.00, 'USD', 'CURRENT'),
    ('BAG SS-18', 'Sprite Heat Relief', date '2026-07-03', date '2026-08-10', 3600.00, 25200.00, 108000.00, 'USD', 'CURRENT'),
    ('BAG 31', '7UP Chill Route', date '2026-07-05', date '2026-08-18', 2500.00, 17500.00, 75000.00, 'USD', 'CURRENT'),
    ('BAG SS35', 'Coca-Cola Zero Sugar Night Drive', date '2026-07-04', date '2026-08-20', 3100.00, 21700.00, 93000.00, 'USD', 'CURRENT'),
    ('SAD01', 'Mirinda Burst', date '2026-07-06', date '2026-08-16', 2800.00, 19600.00, 84000.00, 'USD', 'CURRENT'),
    ('PBa0016', 'Fanta Orange Splash', date '2026-07-07', date '2026-08-12', 2650.00, 18550.00, 79500.00, 'USD', 'CURRENT'),
    ('RB113', 'Mountain Dew Charge', date '2026-07-08', date '2026-08-22', 2400.00, 16800.00, 72000.00, 'USD', 'CURRENT'),
    ('SAR 08', 'Schweppes Premium Mixers', date '2026-07-09', date '2026-08-08', 2100.00, 14700.00, 63000.00, 'USD', 'CURRENT'),
    ('BAG SS-01', 'RC Cola Value Lift', date '2026-07-10', date '2026-08-24', 1900.00, 13300.00, 57000.00, 'USD', 'CURRENT'),
    ('BAG SS 004', 'Coca-Cola Summer Lift', date '2026-07-11', date '2026-08-28', 3950.00, 27650.00, 118500.00, 'USD', 'CURRENT'),
    ('BA-IS 2', 'Pepsi Taste Challenge', date '2026-07-12', date '2026-08-26', 3350.00, 23450.00, 100500.00, 'USD', 'CURRENT'),
    ('BAG SS-136', 'Sprite Heat Relief', date '2026-07-13', date '2026-08-19', 4450.00, 31150.00, 133500.00, 'USD', 'CURRENT'),
    ('SD001', '7UP Chill Route', date '2026-07-14', date '2026-08-21', 3800.00, 26600.00, 114000.00, 'USD', 'CURRENT'),
    ('BAG-25', 'Coca-Cola Zero Sugar Night Drive', date '2026-07-15', date '2026-08-25', 3000.00, 21000.00, 90000.00, 'USD', 'CURRENT'),
    ('BAG-17', 'Mirinda Burst', date '2026-07-16', date '2026-08-18', 2550.00, 17850.00, 76500.00, 'USD', 'CURRENT'),
    ('BAG 26', 'Fanta Orange Splash', date '2026-07-17', date '2026-08-17', 2750.00, 19250.00, 82500.00, 'USD', 'CURRENT'),
    ('BA-KR5', 'Mountain Dew Charge', date '2026-07-18', date '2026-08-29', 3200.00, 22400.00, 96000.00, 'USD', 'CURRENT'),
    ('SASU-BAG-RU-026', 'Schweppes Premium Mixers', date '2026-07-19', date '2026-08-30', 2050.00, 14350.00, 61500.00, 'USD', 'CURRENT'),
    ('SASU-BAG-RU-032', 'RC Cola Value Lift', date '2026-07-20', date '2026-08-31', 2150.00, 15050.00, 64500.00, 'USD', 'CURRENT')
)
insert into public.ooh_placements (
  organization_id,
  asset_id,
  campaign_id,
  installed_at,
  removed_at,
  daily_cost,
  weekly_cost,
  monthly_cost,
  currency,
  creative_image_url,
  proof_of_play_url,
  status
)
select
  org.id,
  assets.id,
  campaigns.id,
  placement_seed.installed_at,
  placement_seed.removed_at,
  placement_seed.daily_cost,
  placement_seed.weekly_cost,
  placement_seed.monthly_cost,
  placement_seed.currency,
  null,
  null,
  placement_seed.status
from org
join placement_seed on true
join public.ooh_assets assets
  on assets.organization_id = org.id
 and assets.asset_code = placement_seed.asset_code
join public.campaigns campaigns
  on campaigns.organization_id = org.id
 and campaigns.name = placement_seed.campaign_name
where not exists (
  select 1
  from public.ooh_placements existing
  where existing.organization_id = org.id
    and existing.asset_id = assets.id
    and existing.campaign_id = campaigns.id
    and existing.installed_at = placement_seed.installed_at
);

with org as (
  select id
  from public.organizations
  where slug = 'coca_cola_iraq'
),
extra_area_seed(slug, country, city, name) as (
  values
    ('erbil-digital', 'Iraq', 'Erbil', 'Erbil Digital Screens'),
    ('duhok-billboards', 'Iraq', 'Duhok', 'Duhok Billboards')
)
insert into public.ooh_areas (organization_id, country, city, name, slug)
select org.id, extra_area_seed.country, extra_area_seed.city, extra_area_seed.name, extra_area_seed.slug
from org
cross join extra_area_seed
on conflict (organization_id, slug) do update set
  country = excluded.country,
  city = excluded.city,
  name = excluded.name;

with org as (
  select id
  from public.organizations
  where slug = 'coca_cola_iraq'
),
areas as (
  select id, slug, organization_id
  from public.ooh_areas
  where organization_id in (select id from org)
),
extra_asset_seed(
  asset_code, media_type, status, country, city, area_slug, location_name, address,
  width, height, dimension_unit, number_of_faces, total_sqm, notes
) as (
  values
    ('ERB DS 01', 'DIGITAL_SCREEN', 'AVAILABLE', 'Iraq', 'Erbil', 'erbil-digital', 'Erbil 100m Road Screen', 'Erbil 100m Road', 1920.00, 1080.00, 'PIXEL', 1, null, 'Seeded Kurdish-region digital screen for OOH filter verification on July 24, 2026.'),
    ('DUH BB 01', 'BILLBOARD', 'AVAILABLE', 'Iraq', 'Duhok', 'duhok-billboards', 'Duhok Main Highway Billboard', 'Duhok Main Highway', 14.00, 5.00, 'METER', 1, 70.00, 'Seeded Kurdish-region billboard for OOH filter verification on July 24, 2026.')
)
insert into public.ooh_assets (
  organization_id, asset_code, media_type, status, country, city, area_id, location_name, address,
  width, height, dimension_unit, number_of_faces, total_sqm, notes
)
select
  org.id,
  extra_asset_seed.asset_code,
  extra_asset_seed.media_type,
  extra_asset_seed.status,
  extra_asset_seed.country,
  extra_asset_seed.city,
  areas.id,
  extra_asset_seed.location_name,
  extra_asset_seed.address,
  extra_asset_seed.width,
  extra_asset_seed.height,
  extra_asset_seed.dimension_unit,
  extra_asset_seed.number_of_faces,
  extra_asset_seed.total_sqm,
  extra_asset_seed.notes
from org
join extra_asset_seed on true
left join areas on areas.slug = extra_asset_seed.area_slug and areas.organization_id = org.id
on conflict (organization_id, asset_code) do update set
  media_type = excluded.media_type,
  status = excluded.status,
  country = excluded.country,
  city = excluded.city,
  area_id = excluded.area_id,
  location_name = excluded.location_name,
  address = excluded.address,
  width = excluded.width,
  height = excluded.height,
  dimension_unit = excluded.dimension_unit,
  number_of_faces = excluded.number_of_faces,
  total_sqm = excluded.total_sqm,
  notes = excluded.notes;
