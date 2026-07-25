-- TV dashboard seed: deterministic two-year Iraq-focused demo data
-- Rerunnable and limited to TV dashboard records only.

do $$
declare
  org_id uuid;
  seed_start date := date '2024-07-25';
  seed_end date := date '2026-07-25';
  copy_names text[] := array[
    'Stronger Together',
    'Extra Fizz',
    'Summer Refresh',
    'Ramadan Offer',
    'Eid Celebration',
    'Family Pack',
    'Unlimited Data',
    'Connect More',
    'Smart Choice',
    'Premium Launch',
    'Weekend Deal',
    'Back to School',
    'New Model Launch',
    'Everyday Savings'
  ];
  campaign_row record;
  airing_day date;
  hash_one bigint;
  hash_two bigint;
  hash_three bigint;
  hash_four bigint;
  hash_five bigint;
  hash_six bigint;
  air_hour integer;
  air_minute integer;
  duration_seconds integer;
  daypart_label text;
  copy_label text;
  seasonal_multiplier numeric(10,4);
  daypart_multiplier numeric(10,4);
  duration_multiplier numeric(10,4);
  channel_base_rate numeric(14,2);
  brand_factor numeric(10,4);
  probability_per_thousand integer;
  variance_multiplier numeric(10,4);
  cost_amount numeric(14,2);
  airing_at timestamptz;
begin
  select id into org_id
  from public.organizations
  where slug = 'coca_cola_iraq'
  limit 1;

  if org_id is null then
    raise exception 'Organization coca_cola_iraq not found. Run the base seed first.';
  end if;

  insert into public.brands (
    organization_id,
    name,
    slug,
    category,
    color,
    logo_url,
    is_active,
    is_dummy_brand
  )
  values
    (org_id, 'Zain Iraq', 'zain-iraq', 'Telecom', '#7B2CBF', null, true, true),
    (org_id, 'Asiacell', 'asiacell', 'Telecom', '#F59E0B', null, true, true),
    (org_id, 'Korek Telecom', 'korek-telecom', 'Telecom', '#111827', null, true, true),
    (org_id, 'Pepsi', 'pepsi', 'Beverages', '#005CB4', '/assets/brands/pepsi.svg', true, true),
    (org_id, 'Coca-Cola', 'coca-cola', 'Beverages', '#F40009', '/assets/brands/coca-cola.svg', true, true),
    (org_id, 'Samsung', 'samsung', 'Technology', '#1428A0', null, true, true),
    (org_id, 'LG', 'lg', 'Technology', '#A50034', null, true, true),
    (org_id, 'Toyota', 'toyota', 'Automotive', '#DC2626', null, true, true),
    (org_id, 'Kia', 'kia', 'Automotive', '#9A3412', null, true, true),
    (org_id, 'Hyundai', 'hyundai', 'Automotive', '#1D4ED8', null, true, true),
    (org_id, 'Nestle', 'nestle', 'FMCG', '#0F766E', null, true, true),
    (org_id, 'Unilever', 'unilever', 'FMCG', '#1E40AF', null, true, true),
    (org_id, 'Huawei', 'huawei', 'Technology', '#B91C1C', null, true, true),
    (org_id, 'Careem', 'careem', 'Delivery', '#16A34A', null, true, true),
    (org_id, 'Talabat', 'talabat', 'Delivery', '#F97316', null, true, true),
    (org_id, 'Carrefour', 'carrefour', 'Retail', '#2563EB', null, true, true),
    (org_id, 'Visa', 'visa', 'Financial Services', '#1D4ED8', null, true, true),
    (org_id, 'Mastercard', 'mastercard', 'Financial Services', '#F59E0B', null, true, true),
    (org_id, 'Tapal', 'tapal', 'Legacy Upload', '#8B4513', null, true, true),
    (org_id, 'Lifebuoy', 'lifebuoy', 'Legacy Upload', '#006400', null, true, true),
    (org_id, 'Bonus', 'bonus', 'Legacy Upload', '#FBBF24', null, true, true)
  on conflict (organization_id, name) do update
  set
    slug = excluded.slug,
    category = coalesce(public.brands.category, excluded.category),
    color = coalesce(public.brands.color, excluded.color),
    logo_url = coalesce(public.brands.logo_url, excluded.logo_url),
    is_dummy_brand = true;

  insert into public.tv_channels (
    organization_id,
    name,
    slug,
    genre,
    primary_language,
    country,
    is_active,
    monitoring_market,
    source_authorization_status,
    source_verification_state,
    current_source_health,
    recording_status
  )
  values
    (org_id, 'Al Iraqiya', 'al-iraqiya', 'News', 'Arabic', 'IQ', true, 'Iraq', 'approved', 'verified', 'monitored', 'active'),
    (org_id, 'Al Sharqiya', 'al-sharqiya', 'General Entertainment', 'Arabic', 'IQ', true, 'Iraq', 'approved', 'verified', 'monitored', 'active'),
    (org_id, 'Alsumaria TV', 'alsumaria-tv', 'News', 'Arabic', 'IQ', true, 'Iraq', 'approved', 'verified', 'monitored', 'active'),
    (org_id, 'Dijlah TV', 'dijlah-tv', 'Drama', 'Arabic', 'IQ', true, 'Iraq', 'approved', 'verified', 'monitored', 'active'),
    (org_id, 'Al Rasheed TV', 'al-rasheed-tv', 'Sports', 'Arabic', 'IQ', true, 'Iraq', 'approved', 'verified', 'monitored', 'active'),
    (org_id, 'Al Forat TV', 'al-forat-tv', 'Family', 'Arabic', 'IQ', true, 'Iraq', 'approved', 'verified', 'monitored', 'active'),
    (org_id, 'Kurdistan 24', 'kurdistan-24', 'News', 'Kurdish', 'IQ', true, 'Iraq', 'approved', 'verified', 'monitored', 'active'),
    (org_id, 'Rudaw', 'rudaw', 'News', 'Arabic / Kurdish', 'IQ', true, 'Iraq', 'approved', 'verified', 'monitored', 'active'),
    (org_id, 'NRT', 'nrt', 'General Entertainment', 'Kurdish', 'IQ', true, 'Iraq', 'approved', 'verified', 'monitored', 'active'),
    (org_id, 'UTV Iraq', 'utv-iraq', 'Music', 'Arabic', 'IQ', true, 'Iraq', 'approved', 'verified', 'monitored', 'active'),
    (org_id, 'Al Rabiaa', 'al-rabiaa', 'Lifestyle', 'Arabic', 'IQ', true, 'Iraq', 'approved', 'verified', 'monitored', 'active'),
    (org_id, 'Iraqi News', 'iraqi-news', 'Kids', 'Arabic', 'IQ', true, 'Iraq', 'approved', 'verified', 'monitored', 'active')
  on conflict (organization_id, slug) do update
  set
    name = excluded.name,
    genre = excluded.genre,
    primary_language = excluded.primary_language,
    country = excluded.country,
    is_active = true,
    monitoring_market = excluded.monitoring_market,
    source_authorization_status = excluded.source_authorization_status,
    source_verification_state = excluded.source_verification_state,
    current_source_health = excluded.current_source_health,
    recording_status = excluded.recording_status;

  insert into public.campaigns (
    organization_id,
    brand_id,
    name,
    market,
    start_date,
    end_date,
    objective,
    status,
    medium,
    media_types,
    budget_amount,
    budget_currency
  )
  select
    org_id,
    brand.id,
    spec.campaign_name,
    'Iraq',
    spec.start_date,
    spec.end_date,
    spec.objective,
    spec.status,
    'tv',
    array['tv']::text[],
    spec.budget_amount,
    'PKR'
  from (
    values
      ('Zain Iraq', 'Zain Iraq Ramadan Fiber', date '2025-02-10', date '2025-04-10', 'active', 'Drive fiber and data bundles during Ramadan and Eid.', 9800000),
      ('Zain Iraq', 'Zain Iraq Connect More', date '2026-05-01', null, 'active', 'Keep mobile bundle awareness high through summer.', 11200000),
      ('Asiacell', 'Asiacell Family Offer', date '2024-08-01', date '2025-01-31', 'completed', 'Push shared family plans ahead of the school year.', 7600000),
      ('Asiacell', 'Asiacell Weekend Unlimited', date '2026-01-15', null, 'active', 'Grow prepaid weekend recharges.', 8900000),
      ('Korek Telecom', 'Korek Home Internet', date '2025-06-01', date '2025-11-30', 'completed', 'Promote fixed wireless availability.', 5400000),
      ('Korek Telecom', 'Korek Smart Choice', date '2026-02-01', null, 'active', 'Maintain broadband and youth awareness.', 6100000),
      ('Pepsi', 'Pepsi Summer Refresh', date '2025-05-01', date '2025-09-30', 'active', 'Maximize beverage demand during summer.', 8300000),
      ('Pepsi', 'Pepsi Match Night', date '2026-03-15', null, 'active', 'Own sports-driven late-evening consumption.', 9100000),
      ('Coca-Cola', 'Coca-Cola Ramadan Together', date '2025-02-20', date '2025-04-20', 'completed', 'Own family viewing during Ramadan.', 8600000),
      ('Coca-Cola', 'Coca-Cola Everyday Refresh', date '2026-04-01', null, 'active', 'Sustain all-market beverage salience.', 9400000),
      ('Samsung', 'Samsung Premium Launch', date '2025-09-01', date '2025-11-30', 'completed', 'Launch the premium device line for holiday shopping.', 7200000),
      ('Samsung', 'Samsung Back to School', date '2026-08-01', date '2026-10-15', 'active', 'Capture student device upgrades.', 6800000),
      ('LG', 'LG Smart Home Savings', date '2025-10-01', date '2025-12-31', 'completed', 'Drive appliance bundles in retail periods.', 5200000),
      ('LG', 'LG Family Comfort', date '2026-05-15', null, 'active', 'Promote cooling and home electronics for summer.', 6100000),
      ('Toyota', 'Toyota New Model Launch', date '2025-01-10', date '2025-04-15', 'completed', 'Introduce the new SUV platform.', 7900000),
      ('Toyota', 'Toyota Trusted Choice', date '2026-02-15', null, 'active', 'Maintain automotive leadership across Iraq.', 8800000),
      ('Kia', 'Kia City Drive', date '2025-04-01', date '2025-08-31', 'completed', 'Promote urban mobility and compact vehicles.', 4700000),
      ('Kia', 'Kia Family Weekend', date '2026-03-20', null, 'active', 'Grow family SUV consideration.', 5600000),
      ('Hyundai', 'Hyundai New Horizons', date '2025-07-01', date '2025-11-15', 'completed', 'Support crossover and sedan launches.', 5100000),
      ('Hyundai', 'Hyundai Summer Drive', date '2026-05-01', null, 'active', 'Use warm-weather travel demand to boost showroom traffic.', 6200000),
      ('Nestle', 'Nestle Family Pack', date '2024-11-01', date '2025-02-28', 'completed', 'Increase pantry and household basket size.', 4500000),
      ('Nestle', 'Nestle Everyday Savings', date '2026-01-05', null, 'active', 'Protect shelf share with value messaging.', 5300000),
      ('Unilever', 'Unilever Care at Home', date '2025-03-01', date '2025-06-30', 'completed', 'Promote hygiene and household brands.', 4900000),
      ('Unilever', 'Unilever Smart Family', date '2026-01-20', null, 'active', 'Drive broad FMCG household penetration.', 5600000),
      ('Huawei', 'Huawei Premium Launch', date '2025-08-15', date '2025-10-30', 'completed', 'Support smartphone and wearables launch activity.', 6100000),
      ('Huawei', 'Huawei Connect More', date '2026-04-10', null, 'active', 'Keep device upgrades visible in prime time.', 6600000),
      ('Careem', 'Careem Weekend Deal', date '2025-05-15', date '2025-09-15', 'completed', 'Boost weekend ride and delivery usage.', 3400000),
      ('Careem', 'Careem Everyday Savings', date '2026-02-01', null, 'active', 'Sustain daily app usage with value-led offers.', 4200000),
      ('Talabat', 'Talabat Family Pack', date '2025-03-10', date '2025-05-31', 'completed', 'Own iftar and family order occasions.', 3600000),
      ('Talabat', 'Talabat Prime Time Cravings', date '2026-01-15', null, 'active', 'Win dinner and late-night delivery demand.', 4700000),
      ('Carrefour', 'Carrefour Ramadan Basket', date '2025-02-25', date '2025-04-05', 'completed', 'Drive high-frequency basket trips around Ramadan.', 5200000),
      ('Carrefour', 'Carrefour Back to School', date '2026-08-01', date '2026-10-10', 'active', 'Promote household and school essentials.', 5800000),
      ('Visa', 'Visa Smart Choice', date '2025-06-01', date '2025-12-31', 'completed', 'Grow digital payment preference.', 4100000),
      ('Visa', 'Visa Everyday Spend', date '2026-02-05', null, 'active', 'Increase card usage in daily retail moments.', 4600000),
      ('Mastercard', 'Mastercard Premium Launch', date '2025-07-15', date '2025-12-15', 'completed', 'Support premium and travel card awareness.', 3900000),
      ('Mastercard', 'Mastercard Weekend Deal', date '2026-03-01', null, 'active', 'Promote value and merchant-linked card usage.', 4500000),
      ('Tapal', 'Tapal Legacy Upload Spot', date '2026-07-01', date '2026-07-31', 'active', 'Legacy uploaded clip support for dashboard previews.', 500000),
      ('Lifebuoy', 'Lifebuoy Legacy Upload Spot', date '2026-07-01', date '2026-07-31', 'active', 'Legacy uploaded clip support for dashboard previews.', 500000),
      ('Bonus', 'Bonus Legacy Upload Spot', date '2026-07-01', date '2026-07-31', 'active', 'Legacy uploaded clip support for dashboard previews.', 500000)
  ) as spec(brand_name, campaign_name, start_date, end_date, status, objective, budget_amount)
  join public.brands brand
    on brand.organization_id = org_id
   and brand.name = spec.brand_name
  on conflict (organization_id, name) do update
  set
    brand_id = excluded.brand_id,
    start_date = excluded.start_date,
    end_date = excluded.end_date,
    status = excluded.status,
    medium = 'tv',
    media_types = case
      when 'tv' = any(coalesce(public.campaigns.media_types, '{}'::text[])) then public.campaigns.media_types
      else array_append(coalesce(public.campaigns.media_types, '{}'::text[]), 'tv')
    end,
    budget_amount = excluded.budget_amount,
    budget_currency = excluded.budget_currency;

  delete from public.tv_campaign_channels
  where organization_id = org_id
    and campaign_id in (
      select id
      from public.campaigns
      where organization_id = org_id
        and medium = 'tv'
        and name in (
          'Zain Iraq Ramadan Fiber',
          'Zain Iraq Connect More',
          'Asiacell Family Offer',
          'Asiacell Weekend Unlimited',
          'Korek Home Internet',
          'Korek Smart Choice',
          'Pepsi Summer Refresh',
          'Pepsi Match Night',
          'Coca-Cola Ramadan Together',
          'Coca-Cola Everyday Refresh',
          'Samsung Premium Launch',
          'Samsung Back to School',
          'LG Smart Home Savings',
          'LG Family Comfort',
          'Toyota New Model Launch',
          'Toyota Trusted Choice',
          'Kia City Drive',
          'Kia Family Weekend',
          'Hyundai New Horizons',
          'Hyundai Summer Drive',
          'Nestle Family Pack',
          'Nestle Everyday Savings',
          'Unilever Care at Home',
          'Unilever Smart Family',
          'Huawei Premium Launch',
          'Huawei Connect More',
          'Careem Weekend Deal',
          'Careem Everyday Savings',
          'Talabat Family Pack',
          'Talabat Prime Time Cravings',
          'Carrefour Ramadan Basket',
          'Carrefour Back to School',
          'Visa Smart Choice',
          'Visa Everyday Spend',
          'Mastercard Premium Launch',
          'Mastercard Weekend Deal',
          'Tapal Legacy Upload Spot',
          'Lifebuoy Legacy Upload Spot',
          'Bonus Legacy Upload Spot'
        )
    );

  insert into public.tv_campaign_channels (organization_id, campaign_id, channel_id)
  select
    org_id,
    campaign_id,
    channel_id
  from (
    select
      campaign.id as campaign_id,
      channel.id as channel_id,
      row_number() over (
        partition by campaign.id
        order by md5(campaign.name || '::' || channel.slug)
      ) as channel_rank,
      case
        when campaign.name in ('Zain Iraq Connect More', 'Pepsi Match Night', 'Coca-Cola Everyday Refresh', 'Toyota Trusted Choice') then 6
        when campaign.name like '%Legacy Upload Spot' then 1
        when campaign.name like '%Back to School%' then 4
        when campaign.name like '%Ramadan%' then 5
        else 3
      end as target_channels
    from public.campaigns campaign
    join public.tv_channels channel
      on channel.organization_id = org_id
     and channel.is_active = true
    where campaign.organization_id = org_id
      and campaign.medium = 'tv'
  ) ranked
  where channel_rank <= target_channels
  on conflict (campaign_id, channel_id) do nothing;

  delete from public.tv_ad_detections
  where organization_id = org_id
    and source in ('tv_dashboard_seed_v2', 'uploaded_asset_seed');

  for campaign_row in
    select
      campaign.id as campaign_id,
      campaign.name as campaign_name,
      campaign.start_date,
      coalesce(campaign.end_date, seed_end) as effective_end_date,
      brand.id as brand_id,
      brand.name as brand_name,
      channel.id as channel_id,
      channel.name as channel_name,
      channel.slug as channel_slug,
      channel.genre,
      channel.primary_language
    from public.campaigns campaign
    join public.brands brand
      on brand.id = campaign.brand_id
    join public.tv_campaign_channels mapping
      on mapping.campaign_id = campaign.id
     and mapping.organization_id = org_id
    join public.tv_channels channel
      on channel.id = mapping.channel_id
    where campaign.organization_id = org_id
      and campaign.medium = 'tv'
      and campaign.name not like '%Legacy Upload Spot'
  loop
    for airing_day in
      select generate_series(
        greatest(campaign_row.start_date, seed_start),
        least(campaign_row.effective_end_date, seed_end),
        interval '1 day'
      )::date
    loop
      hash_one := ('x' || substr(md5(campaign_row.campaign_id::text || campaign_row.channel_id::text || airing_day::text), 1, 8))::bit(32)::bigint;
      hash_two := ('x' || substr(md5(campaign_row.campaign_name || ':' || airing_day::text), 1, 8))::bit(32)::bigint;
      hash_three := ('x' || substr(md5(campaign_row.channel_slug || ':' || campaign_row.brand_name || ':' || airing_day::text), 1, 8))::bit(32)::bigint;
      hash_four := ('x' || substr(md5(campaign_row.brand_name || ':' || campaign_row.channel_slug || ':' || airing_day::text || ':4'), 1, 8))::bit(32)::bigint;
      hash_five := ('x' || substr(md5(campaign_row.campaign_name || ':' || campaign_row.channel_name || ':' || airing_day::text || ':5'), 1, 8))::bit(32)::bigint;
      hash_six := ('x' || substr(md5(campaign_row.channel_name || ':' || campaign_row.campaign_name || ':' || airing_day::text || ':6'), 1, 8))::bit(32)::bigint;

      seasonal_multiplier := 1.00;
      if (
        airing_day between date '2025-02-28' and date '2025-03-29'
        or airing_day between date '2026-02-18' and date '2026-03-19'
      ) then
        seasonal_multiplier := seasonal_multiplier * 1.45;
      elsif (
        airing_day between date '2025-03-30' and date '2025-04-05'
        or airing_day between date '2026-03-20' and date '2026-03-27'
      ) then
        seasonal_multiplier := seasonal_multiplier * 1.32;
      elsif extract(month from airing_day) in (6, 7, 8) and campaign_row.brand_name in ('Pepsi', 'Coca-Cola') then
        seasonal_multiplier := seasonal_multiplier * 1.20;
      elsif extract(month from airing_day) in (8, 9) and campaign_row.brand_name in ('Samsung', 'Huawei', 'Carrefour') then
        seasonal_multiplier := seasonal_multiplier * 1.14;
      elsif extract(month from airing_day) in (11, 12) and campaign_row.brand_name in ('Visa', 'Mastercard', 'Carrefour', 'LG', 'Toyota', 'Hyundai') then
        seasonal_multiplier := seasonal_multiplier * 1.18;
      elsif extract(month from airing_day) = 1 then
        seasonal_multiplier := seasonal_multiplier * 0.88;
      end if;

      probability_per_thousand :=
        case
          when campaign_row.brand_name in ('Zain Iraq', 'Pepsi', 'Coca-Cola', 'Toyota') then 74
          when campaign_row.brand_name in ('Asiacell', 'Samsung', 'Talabat', 'Carrefour') then 60
          when campaign_row.brand_name in ('Korek Telecom', 'LG', 'Hyundai', 'Huawei', 'Visa', 'Mastercard') then 48
          else 38
        end;
      probability_per_thousand := round(probability_per_thousand * seasonal_multiplier);

      if abs(hash_one % 1000) >= probability_per_thousand then
        continue;
      end if;

      if abs(hash_two % 100) < 10 then
        air_hour := 5 + abs(hash_three % 7);
      elsif abs(hash_two % 100) < 28 then
        air_hour := 12 + abs(hash_three % 5);
      elsif abs(hash_two % 100) < 42 then
        air_hour := 17 + abs(hash_three % 2);
      elsif abs(hash_two % 100) < 54 then
        air_hour := 19;
      elsif abs(hash_two % 100) < 86 then
        air_hour := 20 + abs(hash_three % 3);
      else
        air_hour := case when abs(hash_three % 3) = 2 then 0 else 23 + abs(hash_three % 2) end;
      end if;

      air_minute := abs(hash_four % 60);

      if air_hour >= 5 and air_hour < 12 then
        daypart_label := 'Morning';
      elsif air_hour >= 12 and air_hour < 17 then
        daypart_label := 'Afternoon';
      elsif air_hour >= 17 and air_hour < 19 then
        daypart_label := 'Evening';
      elsif air_hour = 19 then
        daypart_label := 'Pre Prime Time';
      elsif air_hour >= 20 and air_hour < 23 then
        daypart_label := 'Prime Time';
      else
        daypart_label := 'Late Prime Time';
      end if;

      duration_seconds := case abs(hash_five % 7)
        when 0 then 10
        when 1 then 15
        when 2 then 20
        when 3 then 25
        when 4 then 30
        when 5 then 45
        else 60
      end;

      copy_label := copy_names[(abs(hash_six % array_length(copy_names, 1)) + 1)::int];

      channel_base_rate := case campaign_row.channel_name
        when 'Al Iraqiya' then 42000
        when 'Al Sharqiya' then 51000
        when 'Alsumaria TV' then 47000
        when 'Dijlah TV' then 34000
        when 'Al Rasheed TV' then 44000
        when 'Al Forat TV' then 36000
        when 'Kurdistan 24' then 33000
        when 'Rudaw' then 38000
        when 'NRT' then 29000
        when 'UTV Iraq' then 35000
        when 'Al Rabiaa' then 31000
        else 26500
      end;

      daypart_multiplier := case daypart_label
        when 'Morning' then 0.82
        when 'Afternoon' then 0.98
        when 'Evening' then 1.12
        when 'Pre Prime Time' then 1.24
        when 'Prime Time' then 1.46
        else 1.08
      end;

      duration_multiplier := case duration_seconds
        when 10 then 0.56
        when 15 then 0.74
        when 20 then 0.88
        when 25 then 1.00
        when 30 then 1.14
        when 45 then 1.43
        else 1.78
      end;

      brand_factor := case campaign_row.brand_name
        when 'Zain Iraq' then 1.20
        when 'Asiacell' then 1.12
        when 'Korek Telecom' then 1.00
        when 'Pepsi' then 1.16
        when 'Coca-Cola' then 1.18
        when 'Samsung' then 1.08
        when 'LG' then 0.98
        when 'Toyota' then 1.14
        when 'Kia' then 0.96
        when 'Hyundai' then 1.00
        when 'Nestle' then 0.92
        when 'Unilever' then 0.95
        when 'Huawei' then 1.02
        when 'Careem' then 0.86
        when 'Talabat' then 0.90
        when 'Carrefour' then 1.03
        when 'Visa' then 0.89
        when 'Mastercard' then 0.90
        else 1.00
      end;

      variance_multiplier := 0.92 + (abs(hash_one % 17) * 0.01);

      cost_amount := round(channel_base_rate * daypart_multiplier * duration_multiplier * seasonal_multiplier * brand_factor * variance_multiplier, 2);
      airing_at := (
        to_char(airing_day, 'YYYY-MM-DD')
        || ' '
        || lpad(air_hour::text, 2, '0')
        || ':'
        || lpad(air_minute::text, 2, '0')
        || ':00+03'
      )::timestamptz;

      insert into public.tv_ad_detections (
        organization_id,
        channel_id,
        campaign_id,
        brand_id,
        detected_at,
        genre,
        language,
        daypart,
        duration_seconds,
        copy_name,
        cost,
        currency,
        preview_poster_url,
        is_uploaded_asset,
        source,
        confidence_score,
        review_status
      )
      values (
        org_id,
        campaign_row.channel_id,
        campaign_row.campaign_id,
        campaign_row.brand_id,
        airing_at,
        campaign_row.genre,
        campaign_row.primary_language,
        daypart_label,
        duration_seconds,
        copy_label,
        cost_amount,
        'PKR',
        null,
        false,
        'tv_dashboard_seed_v2',
        0.84 + (abs(hash_two % 14) * 0.01),
        'confirmed'
      );
    end loop;
  end loop;

  insert into public.tv_ad_detections (
    organization_id,
    channel_id,
    campaign_id,
    brand_id,
    detected_at,
    genre,
    language,
    daypart,
    duration_seconds,
    copy_name,
    cost,
    currency,
    creative_url,
    preview_poster_url,
    is_uploaded_asset,
    source,
    confidence_score,
    review_status
  )
  select
    org_id,
    channel.id,
    campaign.id,
    brand.id,
    '2026-07-24 15:23:00+03'::timestamptz,
    channel.genre,
    channel.primary_language,
    'Afternoon',
    uploaded.duration_seconds,
    uploaded.copy_name,
    uploaded.cost_amount,
    'PKR',
    uploaded.video_url,
    uploaded.poster_url,
    true,
    'uploaded_asset_seed',
    0.99,
    'confirmed'
  from (
    values
      ('Tapal', 'Tapal Legacy Upload Spot', 'Al Sharqiya', 30, 'Stronger Together', '/demo/tv/manual-detections/tapal-danedar-03.mp4', '/demo/tv/manual-detections/tapal-danedar-03.jpg', 48250),
      ('Lifebuoy', 'Lifebuoy Legacy Upload Spot', 'Alsumaria TV', 25, 'Family Pack', '/demo/tv/manual-detections/lifebuoy-01.mp4', '/demo/tv/manual-detections/lifebuoy-01.jpg', 43600),
      ('Bonus', 'Bonus Legacy Upload Spot', 'Al Iraqiya', 20, 'Weekend Deal', '/demo/tv/manual-detections/bonus-02.mp4', '/demo/tv/manual-detections/bonus-02.jpg', 39800)
  ) as uploaded(brand_name, campaign_name, channel_name, duration_seconds, copy_name, video_url, poster_url, cost_amount)
  join public.brands brand
    on brand.organization_id = org_id
   and brand.name = uploaded.brand_name
  join public.campaigns campaign
    on campaign.organization_id = org_id
   and campaign.name = uploaded.campaign_name
  join public.tv_channels channel
    on channel.organization_id = org_id
   and channel.name = uploaded.channel_name;

  raise notice 'Seeded % TV detections for Iraq dashboard scope.',
    (
      select count(*)
      from public.tv_ad_detections
      where organization_id = org_id
        and source in ('tv_dashboard_seed_v2', 'uploaded_asset_seed')
    );
end $$;
