with org as (
  select id
  from public.organizations
  where slug = 'coca_cola_iraq'
),
brand_seed(name, slug, competitor_group, color, logo_url) as (
  values
    ('Coca-Cola', 'coca-cola', 'owned', '#F40009', '/brand-logos/coca-cola.svg'),
    ('Pepsi', 'pepsi', 'competitor', '#005CB4', '/brand-logos/pepsi.svg'),
    ('7UP', '7up', 'competitor', '#16A34A', '/brand-logos/7up.svg'),
    ('Mountain Dew', 'mountain-dew', 'competitor', '#78BE20', '/brand-logos/mountain-dew.svg'),
    ('RC Cola', 'rc-cola', 'competitor', '#7A1F2B', '/brand-logos/rc-cola.svg'),
    ('Mirinda', 'mirinda', 'competitor', '#F58220', '/brand-logos/mirinda.svg')
)
insert into public.brands (
  organization_id,
  name,
  category,
  competitor_group,
  logo_url,
  slug,
  color,
  is_dummy_brand,
  is_active
)
select
  org.id,
  brand_seed.name,
  'Beverages',
  brand_seed.competitor_group,
  brand_seed.logo_url,
  brand_seed.slug,
  brand_seed.color,
  false,
  true
from org
cross join brand_seed
on conflict (organization_id, name) do update set
  category = excluded.category,
  competitor_group = excluded.competitor_group,
  logo_url = excluded.logo_url,
  slug = excluded.slug,
  color = excluded.color,
  is_dummy_brand = excluded.is_dummy_brand,
  is_active = excluded.is_active;

with org as (
  select id
  from public.organizations
  where slug = 'coca_cola_iraq'
),
platform_seed(name, slug, icon, color) as (
  values
    ('Meta', 'meta', 'social', '#1877F2'),
    ('TikTok', 'tiktok', 'social', '#111111'),
    ('YouTube', 'youtube', 'video', '#FF0000'),
    ('Google Ads', 'google-ads', 'ads', '#4285F4'),
    ('Web Advertising', 'web-advertising', 'web', '#7C3AED'),
    ('OOH', 'ooh', 'ooh', '#FF8A00')
)
insert into public.platforms (organization_id, name, slug, icon, color, is_active)
select org.id, platform_seed.name, platform_seed.slug, platform_seed.icon, platform_seed.color, true
from org
cross join platform_seed
on conflict (organization_id, slug) do update set
  name = excluded.name,
  icon = excluded.icon,
  color = excluded.color,
  is_active = excluded.is_active;

with org as (
  select id
  from public.organizations
  where slug = 'coca_cola_iraq'
),
campaign_seed(brand_name, campaign_name, start_date, end_date, status, budget_amount, objective) as (
  values
    ('Coca-Cola', 'Coca-Cola Ramadan Together', date '2026-03-15', date '2026-05-05', 'completed', 180000.00, 'Ramadan family moments and meal-time uplift'),
    ('Coca-Cola', 'Coke Studio Iraq', date '2026-05-20', null, 'active', 265000.00, 'Music-led always-on cultural relevance'),
    ('Pepsi', 'Pepsi Stronger Together', date '2026-04-01', date '2026-07-31', 'active', 220000.00, 'Summer competitive reach and frequency'),
    ('Pepsi', 'Pepsi Refresh Your World', date '2026-08-01', date '2026-10-15', 'scheduled', 190000.00, 'Back-to-school refreshment momentum'),
    ('7UP', '7UP Fresh Up', date '2026-05-01', date '2026-08-25', 'active', 142000.00, 'Refreshment route coverage across Iraq'),
    ('Mountain Dew', 'Mountain Dew Do the Dew', date '2026-04-18', date '2026-07-20', 'completed', 165000.00, 'Energy and gaming audience push'),
    ('RC Cola', 'RC Cola Real Taste', date '2026-06-10', date '2026-09-05', 'active', 96000.00, 'Value-led cola presence in key cities'),
    ('Mirinda', 'Mirinda Color Your World', date '2026-05-12', date '2026-08-14', 'active', 118000.00, 'Flavor and youth-led burst campaign'),
    ('Coca-Cola', 'Coca-Cola Taste the Feeling', date '2026-01-10', date '2026-03-20', 'completed', 210000.00, 'Winter to spring equity reinforcement'),
    ('Pepsi', 'Pepsi Matchday Pulse', date '2026-02-14', date '2026-04-30', 'inactive', 110000.00, 'Sports-tied tactical burst')
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
  campaign_seed.start_date,
  campaign_seed.end_date,
  campaign_seed.objective,
  array['meta', 'tiktok', 'youtube', 'google-ads', 'web-advertising', 'ooh'],
  campaign_seed.status,
  campaign_seed.budget_amount,
  'USD'
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
mapping(campaign_name, platform_slug) as (
  values
    ('Coca-Cola Ramadan Together', 'meta'),
    ('Coca-Cola Ramadan Together', 'youtube'),
    ('Coca-Cola Ramadan Together', 'ooh'),
    ('Coke Studio Iraq', 'meta'),
    ('Coke Studio Iraq', 'tiktok'),
    ('Coke Studio Iraq', 'youtube'),
    ('Coke Studio Iraq', 'google-ads'),
    ('Coke Studio Iraq', 'web-advertising'),
    ('Pepsi Stronger Together', 'meta'),
    ('Pepsi Stronger Together', 'youtube'),
    ('Pepsi Stronger Together', 'ooh'),
    ('Pepsi Stronger Together', 'web-advertising'),
    ('Pepsi Refresh Your World', 'meta'),
    ('Pepsi Refresh Your World', 'tiktok'),
    ('Pepsi Refresh Your World', 'google-ads'),
    ('7UP Fresh Up', 'meta'),
    ('7UP Fresh Up', 'ooh'),
    ('7UP Fresh Up', 'web-advertising'),
    ('Mountain Dew Do the Dew', 'tiktok'),
    ('Mountain Dew Do the Dew', 'youtube'),
    ('Mountain Dew Do the Dew', 'google-ads'),
    ('RC Cola Real Taste', 'ooh'),
    ('RC Cola Real Taste', 'web-advertising'),
    ('Mirinda Color Your World', 'meta'),
    ('Mirinda Color Your World', 'tiktok'),
    ('Mirinda Color Your World', 'ooh'),
    ('Coca-Cola Taste the Feeling', 'youtube'),
    ('Coca-Cola Taste the Feeling', 'google-ads'),
    ('Pepsi Matchday Pulse', 'youtube'),
    ('Pepsi Matchday Pulse', 'meta')
)
insert into public.campaign_platforms (organization_id, campaign_id, platform_id)
select
  org.id,
  campaigns.id,
  platforms.id
from org
join mapping on true
join public.campaigns campaigns
  on campaigns.organization_id = org.id
 and campaigns.name = mapping.campaign_name
join public.platforms platforms
  on platforms.organization_id = org.id
 and platforms.slug = mapping.platform_slug
on conflict (campaign_id, platform_id) do update set
  updated_at = now();

with org as (
  select id
  from public.organizations
  where slug = 'coca_cola_iraq'
),
spend_window as (
  select generate_series(date '2026-04-26', date '2026-07-24', interval '1 day')::date as spend_date
),
campaign_platform_base as (
  select
    campaigns.organization_id,
    campaigns.id as campaign_id,
    brands.id as brand_id,
    brands.name as brand_name,
    campaigns.name as campaign_name,
    campaigns.start_date,
    campaigns.end_date,
    platforms.id as platform_id,
    platforms.slug as platform_slug,
    case campaigns.name
      when 'Coke Studio Iraq' then 4200
      when 'Pepsi Stronger Together' then 3600
      when '7UP Fresh Up' then 1850
      when 'RC Cola Real Taste' then 1280
      when 'Mirinda Color Your World' then 1680
      when 'Mountain Dew Do the Dew' then 2100
      when 'Coca-Cola Ramadan Together' then 2600
      when 'Coca-Cola Taste the Feeling' then 2400
      when 'Pepsi Matchday Pulse' then 1950
      when 'Pepsi Refresh Your World' then 2300
      else 1600
    end as base_amount,
    case platforms.slug
      when 'meta' then 1.05
      when 'tiktok' then 0.92
      when 'youtube' then 1.16
      when 'google-ads' then 0.88
      when 'web-advertising' then 0.81
      when 'ooh' then 1.34
      else 1
    end as platform_weight
  from org
  join public.campaigns campaigns on campaigns.organization_id = org.id
  join public.brands brands on brands.id = campaigns.brand_id
  join public.campaign_platforms campaign_platforms on campaign_platforms.campaign_id = campaigns.id
  join public.platforms platforms on platforms.id = campaign_platforms.platform_id
),
resolved_spend as (
  select
    campaign_platform_base.organization_id,
    campaign_platform_base.brand_id,
    campaign_platform_base.campaign_id,
    campaign_platform_base.platform_id,
    spend_window.spend_date,
    round(
      (
        campaign_platform_base.base_amount
        * campaign_platform_base.platform_weight
        * (1 + (((extract(day from spend_window.spend_date)::int + length(campaign_platform_base.campaign_name)) % 7) * 0.035))
      )::numeric,
      2
    ) as amount
  from campaign_platform_base
  join spend_window
    on spend_window.spend_date >= campaign_platform_base.start_date
   and (
     campaign_platform_base.end_date is null
     or spend_window.spend_date <= campaign_platform_base.end_date
   )
  where spend_window.spend_date >= current_date - interval '90 days'
)
insert into public.spend_records (
  organization_id,
  brand_id,
  campaign_id,
  platform_id,
  spend_date,
  amount,
  currency
)
select
  resolved_spend.organization_id,
  resolved_spend.brand_id,
  resolved_spend.campaign_id,
  resolved_spend.platform_id,
  resolved_spend.spend_date,
  resolved_spend.amount,
  'USD'
from resolved_spend
on conflict (organization_id, campaign_id, platform_id, spend_date) do update set
  brand_id = excluded.brand_id,
  amount = excluded.amount,
  currency = excluded.currency,
  updated_at = now();
