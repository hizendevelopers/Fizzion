-- TV & Web Redesign: Deterministic Seed Data
-- Generates 90 days of realistic dummy data for TV and Web pages

-- ============================================================
-- Helper: Resolve coca_cola_iraq organization ID
-- ============================================================
do $$
declare
  org_id uuid;
  brand_rec record;
  campaign_rec record;
  channel_rec record;
  website_rec record;
  channel_ids uuid[] := '{}';
  website_ids uuid[] := '{}';
  campaign_map jsonb := '{}'::jsonb;
  brand_map jsonb := '{}'::jsonb;
  spend_date date;
  base_amount numeric;
  platform_tv_id uuid;
  platform_web_id uuid;
  coca_cola_id uuid;
  pepsi_id uuid;
  sevenup_id uuid;
  mountain_dew_id uuid;
  rc_cola_id uuid;
  mirinda_id uuid;
  tapal_id uuid;
  lifebuoy_id uuid;
  bonus_id uuid;
  ary_news_id uuid;
  ad_rec record;
begin
  select id into org_id from public.organizations where slug = 'coca_cola_iraq';
  if org_id is null then
    raise exception 'Organization coca_cola_iraq not found. Run base seed first.';
  end if;

  -- Get TV and Web platform IDs
  select id into platform_tv_id from public.platforms where organization_id = org_id and slug = 'youtube';
  if platform_tv_id is null then
    insert into public.platforms (organization_id, name, slug, icon, color, is_active)
    values (org_id, 'TV', 'tv', 'tv', '#FF0000', true)
    returning id into platform_tv_id;
  end if;

  select id into platform_web_id from public.platforms where organization_id = org_id and slug = 'web-advertising';
  if platform_web_id is null then
    insert into public.platforms (organization_id, name, slug, icon, color, is_active)
    values (org_id, 'Web Advertising', 'web-advertising', 'web', '#7C3AED', true)
    on conflict (organization_id, slug) do update set name = excluded.name
    returning id into platform_web_id;
  end if;

  -- ==========================================================
  -- BRANDS: Add additional TV/Web brands if missing
  -- ==========================================================
  -- First, update existing brands with slug and color
  update public.brands set slug = 'coca-cola', color = '#F40009', logo_url = '/assets/brands/coca-cola.svg'
  where organization_id = org_id and name = 'Coca-Cola';

  update public.brands set slug = 'pepsi', color = '#005CB4', logo_url = '/assets/brands/pepsi.svg'
  where organization_id = org_id and name = 'Pepsi';

  -- Add Tapal, Lifebuoy, Bonus (ARY News brands)
  insert into public.brands (organization_id, name, slug, color, logo_url, category, is_active, is_dummy_brand)
  values
    (org_id, 'Tapal', 'tapal', '#8B4513', null, 'Beverages', true, true),
    (org_id, 'Lifebuoy', 'lifebuoy', '#006400', null, 'Personal Care', true, true),
    (org_id, 'Bonus', 'bonus', '#FFD700', null, 'Household', true, true)
  on conflict (organization_id, name) do update set
    slug = excluded.slug, color = excluded.color, is_dummy_brand = excluded.is_dummy_brand;

  select id into coca_cola_id from public.brands where organization_id = org_id and name = 'Coca-Cola';
  select id into pepsi_id from public.brands where organization_id = org_id and name = 'Pepsi';
  select id into sevenup_id from public.brands where organization_id = org_id and name = '7UP';
  select id into mountain_dew_id from public.brands where organization_id = org_id and name = 'Mountain Dew';
  select id into rc_cola_id from public.brands where organization_id = org_id and name = 'RC Cola';
  select id into mirinda_id from public.brands where organization_id = org_id and name = 'Mirinda';
  select id into tapal_id from public.brands where organization_id = org_id and name = 'Tapal';
  select id into lifebuoy_id from public.brands where organization_id = org_id and name = 'Lifebuoy';
  select id into bonus_id from public.brands where organization_id = org_id and name = 'Bonus';

  -- Build brand_map for later use
  brand_map := jsonb_build_object(
    'Coca-Cola', coca_cola_id,
    'Pepsi', pepsi_id,
    '7UP', sevenup_id,
    'Mountain Dew', mountain_dew_id,
    'RC Cola', rc_cola_id,
    'Mirinda', mirinda_id,
    'Tapal', tapal_id,
    'Lifebuoy', lifebuoy_id,
    'Bonus', bonus_id
  );

  -- ==========================================================
  -- TV CHANNELS: 10 Iraqi channels
  -- ==========================================================
  -- First check if ARY News exists (from previous seed)
  select id into ary_news_id from public.tv_channels where organization_id = org_id and slug = 'ary-news';

  -- Insert 10 Iraqi TV channels
  for channel_rec in (
    values
      ('Al Iraqiya', 'al-iraqiya', 'Arabic', 'News', 'IQ'),
      ('Al Sharqiya', 'al-sharqiya', 'Arabic', 'Entertainment', 'IQ'),
      ('Al Sumaria', 'al-sumaria', 'Arabic', 'News', 'IQ'),
      ('Dijlah TV', 'dijlah-tv', 'Arabic', 'General', 'IQ'),
      ('Al Forat', 'al-forat', 'Arabic', 'News', 'IQ'),
      ('Al Rasheed TV', 'al-rasheed-tv', 'Arabic', 'Entertainment', 'IQ'),
      ('UTV Iraq', 'utv-iraq', 'Arabic', 'Entertainment', 'IQ'),
      ('Rudaw', 'rudaw', 'Kurdish', 'News', 'IQ'),
      ('Kurdistan TV', 'kurdistan-tv', 'Kurdish', 'General', 'IQ'),
      ('NRT', 'nrt', 'Kurdish', 'News', 'IQ')
  ) as t(name, slug, lang, genre, country
  loop
    insert into public.tv_channels (organization_id, name, slug, primary_language, genre, country, is_active)
    values (org_id, t.name, t.slug, t.lang, t.genre, t.country, true)
    on conflict (organization_id, slug) do update set
      name = excluded.name, primary_language = excluded.primary_language,
      genre = excluded.genre, country = excluded.country, is_active = excluded.is_active
    returning id into channel_rec;
    channel_ids := array_append(channel_ids, channel_rec);
  end loop;

  -- ==========================================================
  -- TV CAMPAIGNS
  -- ==========================================================
  -- TV-specific campaigns with medium='tv'
  for campaign_rec in (
    values
      ('Coca-Cola', 'Coca-Cola TV Ramadan', '2026-03-01', '2026-05-15', 'completed', 'tv'),
      ('Coca-Cola', 'Coke Studio TV', '2026-05-20', null, 'active', 'tv'),
      ('Pepsi', 'Pepsi TV Summer', '2026-04-01', '2026-08-31', 'active', 'tv'),
      ('Pepsi', 'Pepsi TV Winter', '2026-01-01', '2026-03-15', 'completed', 'tv'),
      ('7UP', '7UP TV Fresh', '2026-05-01', '2026-09-30', 'active', 'tv'),
      ('Mountain Dew', 'Mountain Dew TV Energy', '2026-04-15', '2026-07-20', 'completed', 'tv'),
      ('RC Cola', 'RC Cola TV Value', '2026-06-01', '2026-10-31', 'active', 'tv'),
      ('Mirinda', 'Mirinda TV Colorful', '2026-05-10', '2026-09-15', 'active', 'tv'),
      ('Tapal', 'Tapal TV Tea Time', '2026-04-01', '2026-10-31', 'active', 'tv'),
      ('Lifebuoy', 'Lifebuoy TV Health', '2026-04-01', '2026-09-30', 'active', 'tv'),
      ('Bonus', 'Bonus TV Laundry', '2026-04-01', '2026-08-31', 'active', 'tv')
  ) as t(brand_name, campaign_name, start_date, end_date, status, medium
  loop
    insert into public.campaigns (
      organization_id, brand_id, name, market, start_date, end_date,
      status, medium, budget_amount, budget_currency, objective
    )
    values (
      org_id,
      (brand_map->>t.brand_name)::uuid,
      t.campaign_name,
      'Iraq',
      t.start_date::date,
      case when t.end_date is null then null else t.end_date::date end,
      t.status,
      t.medium,
      case t.brand_name
        when 'Coca-Cola' then 250000 when 'Pepsi' then 220000
        when '7UP' then 140000 when 'Mountain Dew' then 160000
        when 'RC Cola' then 90000 when 'Mirinda' then 115000
        when 'Tapal' then 80000 when 'Lifebuoy' then 75000
        when 'Bonus' then 65000
        else 100000
      end,
      'USD',
      t.campaign_name || ' TV advertising campaign'
    )
    on conflict (organization_id, name) do update set
      brand_id = excluded.brand_id, medium = excluded.medium, status = excluded.status;
  end loop;

  -- ==========================================================
  -- TV CAMPAIGN-CHANNEL MAPPING
  -- ==========================================================
  -- Each campaign runs on multiple channels
  for campaign_rec in (
    -- Coca-Cola campaigns run on all 10 channels
    select c.id as campaign_id, unnest(channel_ids) as channel_id
    from public.campaigns c
    where c.organization_id = org_id and c.name in ('Coca-Cola TV Ramadan', 'Coke Studio TV')
    union all
    -- Pepsi runs on 8 channels
    select c.id, ch.id
    from public.campaigns c
    cross join (select unnest(channel_ids[:8]) as id) ch
    where c.organization_id = org_id and c.name in ('Pepsi TV Summer', 'Pepsi TV Winter')
    union all
    -- 7UP on 6 channels
    select c.id, ch.id
    from public.campaigns c
    cross join (select unnest(channel_ids[:6]) as id) ch
    where c.organization_id = org_id and c.name = '7UP TV Fresh'
    union all
    -- Mountain Dew on 5 channels
    select c.id, ch.id
    from public.campaigns c
    cross join (select unnest(channel_ids[:5]) as id) ch
    where c.organization_id = org_id and c.name = 'Mountain Dew TV Energy'
    union all
    -- RC Cola on 4 channels
    select c.id, ch.id
    from public.campaigns c
    cross join (select unnest(channel_ids[:4]) as id) ch
    where c.organization_id = org_id and c.name = 'RC Cola TV Value'
    union all
    -- Mirinda on 5 channels
    select c.id, ch.id
    from public.campaigns c
    cross join (select unnest(channel_ids[:5]) as id) ch
    where c.organization_id = org_id and c.name = 'Mirinda TV Colorful'
    union all
    -- Tapal, Lifebuoy, Bonus on 3 channels each (include ARY News)
    select c.id, coalesce(ary_news_id, channel_ids[1])
    from public.campaigns c
    where c.organization_id = org_id and c.name in ('Tapal TV Tea Time', 'Lifebuoy TV Health', 'Bonus TV Laundry')
    union all
    select c.id, channel_ids[2]
    from public.campaigns c
    where c.organization_id = org_id and c.name in ('Tapal TV Tea Time', 'Lifebuoy TV Health', 'Bonus TV Laundry')
    union all
    select c.id, channel_ids[3]
    from public.campaigns c
    where c.organization_id = org_id and c.name in ('Tapal TV Tea Time', 'Lifebuoy TV Health', 'Bonus TV Laundry')
  )
  loop
    insert into public.tv_campaign_channels (organization_id, campaign_id, channel_id)
    values (org_id, campaign_rec.campaign_id, campaign_rec.channel_id)
    on conflict (campaign_id, channel_id) do nothing;
  end loop;

  -- ==========================================================
  -- TV SPEND RECORDS (90 days of daily data)
  -- ==========================================================
  for spend_date in
    select generate_series(current_date - interval '90 days', current_date, interval '1 day')::date
  loop
    -- Coca-Cola TV campaigns
    for campaign_rec in
      select c.id, c.name, b.name as brand_name
      from public.campaigns c
      join public.brands b on b.id = c.brand_id
      where c.organization_id = org_id and c.medium = 'tv' and c.status = 'active'
    loop
      base_amount := case campaign_rec.brand_name
        when 'Coca-Cola' then 4200 when 'Pepsi' then 3600
        when '7UP' then 1850 when 'Mountain Dew' then 2100
        when 'RC Cola' then 1280 when 'Mirinda' then 1680
        when 'Tapal' then 900 when 'Lifebuoy' then 850
        when 'Bonus' then 700
        else 1000
      end;

      -- Insert spend record for TV platform
      insert into public.spend_records (
        organization_id, brand_id, campaign_id, platform_id, spend_date, amount, currency
      )
      values (
        org_id,
        (brand_map->>campaign_rec.brand_name)::uuid,
        campaign_rec.id,
        platform_tv_id,
        spend_date,
        round((base_amount * (1 + ((extract(doy from spend_date)::int % 7) * 0.03)))::numeric, 2),
        'USD'
      )
      on conflict (organization_id, campaign_id, platform_id, spend_date) do update set
        amount = excluded.amount;
    end loop;
  end loop;

  -- ==========================================================
  -- TV AD DETECTIONS
  -- ==========================================================
  -- Generate daily detections for active campaigns
  for spend_date in
    select generate_series(current_date - interval '90 days', current_date, interval '1 day')::date
  loop
    for campaign_rec in
      select c.id, c.name, b.name as brand_name
      from public.campaigns c
      join public.brands b on b.id = c.brand_id
      where c.organization_id = org_id and c.medium = 'tv'
        and (c.end_date is null or c.end_date >= spend_date)
        and c.start_date <= spend_date
    loop
      -- Pick a channel for this detection
      for channel_rec in
        select tcc.channel_id, tc.name as channel_name, tc.genre, tc.primary_language
        from public.tv_campaign_channels tcc
        join public.tv_channels tc on tc.id = tcc.channel_id
        where tcc.campaign_id = campaign_rec.id and tcc.organization_id = org_id
        limit 2
      loop
        insert into public.tv_ad_detections (
          organization_id, channel_id, campaign_id, brand_id,
          detected_at, genre, language, daypart,
          duration_seconds, copy_name, cost, currency, sov_percentage,
          confidence_score, review_status
        )
        values (
          org_id,
          channel_rec.channel_id,
          campaign_rec.id,
          (brand_map->>campaign_rec.brand_name)::uuid,
          (spend_date::timestamp + time '08:00:00' + (random() * interval '12 hours')),
          channel_rec.genre,
          channel_rec.primary_language,
          case floor(random() * 8)
            when 0 then 'Early Morning' when 1 then 'Morning'
            when 2 then 'Afternoon' when 3 then 'Evening'
            when 4 then 'Pre-Prime Time' when 5 then 'Prime Time'
            when 6 then 'Late Prime Time' else 'Overnight'
          end,
          15 + floor(random() * 46),
          campaign_rec.name || ' Ad',
          round((random() * 500 + 50)::numeric, 2),
          'USD',
          round((random() * 20)::numeric, 2),
          round((0.7 + random() * 0.3)::numeric, 2),
          case when random() > 0.2 then 'confirmed' else 'pending' end
        );
      end loop;
    end loop;
  end loop;

  -- ==========================================================
  -- 3 ARY NEWS DETECTED ADS (Tapal Danedar, Lifebuoy, Bonus Surf)
  -- ==========================================================
  -- Use ARY News channel or first channel if ARY not found
  if ary_news_id is not null then
    -- Tapal Danedar Strong Taste
    insert into public.tv_ad_detections (
      organization_id, channel_id, brand_id, campaign_id,
      detected_at, genre, language, daypart,
      duration_seconds, copy_name, cost, currency, sov_percentage,
      creative_url, confidence_score, review_status
    )
    values (
      org_id, ary_news_id, tapal_id,
      (select id from public.campaigns where organization_id = org_id and name = 'Tapal TV Tea Time' limit 1),
      (current_date - interval '5 days' + time '15:23:00')::timestamptz,
      'News', 'Urdu', 'Afternoon',
      30, 'Tapal Danedar Strong Taste', 350.00, 'USD', 4.5,
      'https://www.youtube.com/embed/dQw4w9WgXcQ', 0.95, 'confirmed'
    );

    -- Lifebuoy Germ Protection
    insert into public.tv_ad_detections (
      organization_id, channel_id, brand_id, campaign_id,
      detected_at, genre, language, daypart,
      duration_seconds, copy_name, cost, currency, sov_percentage,
      creative_url, confidence_score, review_status
    )
    values (
      org_id, ary_news_id, lifebuoy_id,
      (select id from public.campaigns where organization_id = org_id and name = 'Lifebuoy TV Health' limit 1),
      (current_date - interval '5 days' + time '15:23:00')::timestamptz,
      'News', 'Urdu', 'Afternoon',
      25, 'Lifebuoy Germ Protection', 280.00, 'USD', 3.6,
      'https://www.youtube.com/embed/dQw4w9WgXcQ', 0.92, 'confirmed'
    );

    -- Bonus Surf
    insert into public.tv_ad_detections (
      organization_id, channel_id, brand_id, campaign_id,
      detected_at, genre, language, daypart,
      duration_seconds, copy_name, cost, currency, sov_percentage,
      creative_url, confidence_score, review_status
    )
    values (
      org_id, ary_news_id, bonus_id,
      (select id from public.campaigns where organization_id = org_id and name = 'Bonus TV Laundry' limit 1),
      (current_date - interval '5 days' + time '15:23:00')::timestamptz,
      'News', 'Urdu', 'Afternoon',
      20, 'Bonus Surf', 220.00, 'USD', 2.8,
      'https://www.youtube.com/embed/dQw4w9WgXcQ', 0.88, 'confirmed'
    );
  end if;

  -- ==========================================================
  -- WEBSITES: 10 Iraqi News Websites
  -- ==========================================================
  for website_rec in (
    values
      ('Al Sumaria', 'alsumaria.tv', 'https://www.alsumaria.tv', 'Arabic', 'News'),
      ('Rudaw', 'rudaw.net', 'https://www.rudaw.net', 'Kurdish', 'News'),
      ('Shafaq News', 'shafaq.com', 'https://www.shafaq.com', 'Arabic', 'News'),
      ('Baghdad Today', 'baghdadtoday.news', 'https://baghdadtoday.news', 'Arabic', 'News'),
      ('Alghadeer TV', 'alghadeer.tv', 'https://alghadeer.tv', 'Arabic', 'News'),
      ('Kirkuk Now', 'kirkuknow.com', 'https://www.kirkuknow.com', 'Kurdish', 'News'),
      ('NRT News', 'nrtnews.net', 'https://www.nrtnews.net', 'Kurdish', 'News'),
      ('URA News', 'uranews.com', 'https://uranews.com', 'Arabic', 'News'),
      ('Al Mirbad', 'almirbad.com', 'https://almirbad.com', 'Arabic', 'News'),
      ('Iraqi News Agency', 'ina.iq', 'https://ina.iq', 'Arabic', 'News')
  ) as t(name, domain, homepage_url, lang, category
  loop
    insert into public.websites (
      organization_id, name, domain, homepage_url, logo_url,
      primary_language, category, is_active, monitoring_enabled,
      screenshot_enabled, scan_interval_minutes, country
    )
    values (
      org_id, t.name, t.domain, t.homepage_url, null,
      t.lang, t.category, true, true,
      true, 120, 'IQ'
    )
    on conflict (organization_id, domain) do update set
      name = excluded.name, homepage_url = excluded.homepage_url,
      primary_language = excluded.primary_language, category = excluded.category,
      is_active = excluded.is_active, monitoring_enabled = excluded.monitoring_enabled;
  end loop;

  -- Build website_ids array
  select array_agg(id) into website_ids
  from public.websites
  where organization_id = org_id and is_active = true;

  -- ==========================================================
  -- WEB CAMPAIGNS (medium='web')
  -- ==========================================================
  for campaign_rec in (
    values
      ('Coca-Cola', 'Coca-Cola Web Display', '2026-04-01', '2026-10-31', 'active', 'web'),
      ('Pepsi', 'Pepsi Web Banner', '2026-04-01', '2026-09-30', 'active', 'web'),
      ('7UP', '7UP Web Fresh', '2026-05-01', '2026-10-31', 'active', 'web'),
      ('Mountain Dew', 'Mountain Dew Web Gaming', '2026-04-15', '2026-08-15', 'active', 'web'),
      ('RC Cola', 'RC Cola Web Value', '2026-06-01', '2026-12-31', 'active', 'web'),
      ('Mirinda', 'Mirinda Web Colorful', '2026-05-10', '2026-11-30', 'active', 'web')
  ) as t(brand_name, campaign_name, start_date, end_date, status, medium
  loop
    insert into public.campaigns (
      organization_id, brand_id, name, market, start_date, end_date,
      status, medium, budget_amount, budget_currency, objective
    )
    values (
      org_id,
      (brand_map->>t.brand_name)::uuid,
      t.campaign_name,
      'Iraq',
      t.start_date::date,
      t.end_date::date,
      t.status,
      t.medium,
      case t.brand_name
        when 'Coca-Cola' then 180000 when 'Pepsi' then 150000
        when '7UP' then 90000 when 'Mountain Dew' then 110000
        when 'RC Cola' then 60000 when 'Mirinda' then 75000
        else 100000
      end,
      'USD',
      t.campaign_name || ' Web advertising campaign'
    )
    on conflict (organization_id, name) do update set
      brand_id = excluded.brand_id, medium = excluded.medium, status = excluded.status;
  end loop;

  -- ==========================================================
  -- WEB CAMPAIGN-WEBSITE MAPPING
  -- ==========================================================
  for campaign_rec in
    select c.id, c.name
    from public.campaigns c
    where c.organization_id = org_id and c.medium = 'web'
  loop
    -- Each web campaign runs on 4-7 websites
    for i in 1..(4 + floor(random() * 4))
    loop
      if i <= array_length(website_ids, 1) then
        insert into public.web_campaign_websites (organization_id, campaign_id, website_id)
        values (org_id, campaign_rec.id, website_ids[i])
        on conflict (campaign_id, website_id) do nothing;
      end if;
    end loop;
  end loop;

  -- ==========================================================
  -- WEB SPEND RECORDS (90 days)
  -- ==========================================================
  for spend_date in
    select generate_series(current_date - interval '90 days', current_date, interval '1 day')::date
  loop
    for campaign_rec in
      select c.id, c.name, b.name as brand_name
      from public.campaigns c
      join public.brands b on b.id = c.brand_id
      where c.organization_id = org_id and c.medium = 'web' and c.status = 'active'
    loop
      base_amount := case campaign_rec.brand_name
        when 'Coca-Cola' then 2800 when 'Pepsi' then 2400
        when '7UP' then 1200 when 'Mountain Dew' then 1400
        when 'RC Cola' then 800 when 'Mirinda' then 1000
        else 500
      end;

      insert into public.spend_records (
        organization_id, brand_id, campaign_id, platform_id, spend_date, amount, currency
      )
      values (
        org_id,
        (brand_map->>campaign_rec.brand_name)::uuid,
        campaign_rec.id,
        platform_web_id,
        spend_date,
        round((base_amount * (1 + ((extract(doy from spend_date)::int % 5) * 0.02)))::numeric, 2),
        'USD'
      )
      on conflict (organization_id, campaign_id, platform_id, spend_date) do update set
        amount = excluded.amount;
    end loop;
  end loop;

  -- ==========================================================
  -- WEB SCREENSHOTS AND AD DETECTIONS
  -- ==========================================================
  for website_rec in
    select id, name from public.websites
    where organization_id = org_id and is_active = true
  loop
    -- Create screenshot records
    for i in 1..5 loop
      insert into public.web_screenshots (
        organization_id, website_id, page_url, screenshot_url,
        captured_at, viewport_width, viewport_height, status
      )
      values (
        org_id, website_rec.id,
        'https://www.' || (select domain from public.websites where id = website_rec.id),
        null,
        current_date - (i * 7) + time '10:00:00',
        1440, 900,
        case when i <= 4 then 'completed' else 'failed' end
      );
    end loop;

    -- Create ad detection records
    for campaign_rec in
      select wcw.campaign_id, c.name as campaign_name, b.name as brand_name
      from public.web_campaign_websites wcw
      join public.campaigns c on c.id = wcw.campaign_id
      join public.brands b on b.id = c.brand_id
      where wcw.website_id = website_rec.id and wcw.organization_id = org_id
      limit 3
    loop
      for i in 1..(2 + floor(random() * 3))
      loop
        insert into public.web_ad_detections (
          organization_id, website_id, campaign_id, brand_id,
          ad_format, position, destination_url,
          confidence_score, review_status, spend_amount, currency,
          detected_at
        )
        values (
          org_id, website_rec.id, campaign_rec.campaign_id,
          (brand_map->>campaign_rec.brand_name)::uuid,
          case floor(random() * 4)
            when 0 then 'Display Banner' when 1 then 'Native Ad'
            when 2 then 'Sidebar Ad' else 'Header Banner'
          end,
          case floor(random() * 3)
            when 0 then 'top' when 1 then 'middle' else 'bottom'
          end,
          'https://' || campaign_rec.brand_name || '.example.com',
          round((0.6 + random() * 0.4)::numeric, 2),
          case when random() > 0.3 then 'confirmed' else 'needs-review' end,
          round((random() * 200 + 20)::numeric, 2),
          'USD',
          current_date - (i * 3) + time '12:00:00'
        );
      end loop;
    end loop;
  end loop;

  raise notice 'TV & Web seed data generation complete for organization %', org_id;
end $$;

