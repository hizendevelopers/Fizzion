-- Live Iraqi news website bootstrap for Web monitoring
-- Adds current website targets and bootstraps legacy crawler pages/configs

do $$
declare
  org_id uuid;
  website_rec record;
  website_row record;
begin
  select id into org_id
  from public.organizations
  where slug = 'coca_cola_iraq'
  limit 1;

  if org_id is null then
    raise exception 'Organization coca_cola_iraq not found. Run base seed first.';
  end if;

  for website_rec in
    select *
    from (
      values
        ('Al Sumaria', 'alsumaria.tv', 'https://www.alsumaria.tv', 'Arabic', 'News'),
        ('Rudaw', 'rudaw.net', 'https://www.rudaw.net/english', 'Kurdish', 'News'),
        ('Shafaq News', 'shafaq.com', 'https://www.shafaq.com/en', 'Arabic', 'News'),
        ('Baghdad Today', 'baghdadtoday.news', 'https://baghdadtoday.news', 'Arabic', 'News'),
        ('Iraqi News Agency', 'ina.iq', 'https://ina.iq/eng', 'Arabic', 'News'),
        ('NRT', 'nrttv.com', 'https://www.nrttv.com', 'Kurdish', 'News'),
        ('BasNews', 'basnews.com', 'https://www.basnews.com/en', 'Kurdish', 'News'),
        ('964media', '964media.com', 'https://www.964media.com', 'Arabic', 'News'),
        ('Iraq Business News', 'iraq-businessnews.com', 'https://iraq-businessnews.com', 'English', 'Business'),
        ('Al Forat News', 'alforatnews.iq', 'https://alforatnews.iq', 'Arabic', 'News')
    ) as t(name, domain, homepage_url, primary_language, category)
  loop
    insert into public.websites (
      organization_id,
      name,
      domain,
      homepage_url,
      primary_language,
      category,
      country,
      is_active,
      monitoring_enabled,
      screenshot_enabled,
      scan_interval_minutes,
      notes
    )
    values (
      org_id,
      website_rec.name,
      website_rec.domain,
      website_rec.homepage_url,
      website_rec.primary_language,
      website_rec.category,
      'IQ',
      true,
      true,
      true,
      120,
      'Public Iraqi news website target bootstrapped on 2026-07-25 for homepage monitoring.'
    )
    on conflict (organization_id, domain) do update set
      name = excluded.name,
      homepage_url = excluded.homepage_url,
      primary_language = excluded.primary_language,
      category = excluded.category,
      is_active = true,
      monitoring_enabled = true,
      screenshot_enabled = true,
      scan_interval_minutes = excluded.scan_interval_minutes,
      notes = excluded.notes;

    select id, name, domain, homepage_url
    into website_row
    from public.websites
    where organization_id = org_id
      and domain = website_rec.domain
    limit 1;

    insert into public.website_pages (
      organization_id,
      website_id,
      url,
      page_type,
      title
    )
    values (
      org_id,
      website_row.id,
      website_row.homepage_url,
      'homepage',
      website_row.name
    )
    on conflict (website_id, url) do update set
      page_type = excluded.page_type,
      title = excluded.title,
      updated_at = now();

    if not exists (
      select 1
      from public.website_crawl_configs
      where website_id = website_row.id
        and is_active = true
    ) then
      insert into public.website_crawl_configs (
        organization_id,
        website_id,
        interval_minutes,
        crawl_depth,
        max_pages,
        homepage_enabled,
        section_pages_enabled,
        article_pages_enabled,
        mobile_enabled,
        desktop_enabled,
        url_patterns,
        is_active
      )
      values (
        org_id,
        website_row.id,
        120,
        2,
        5,
        true,
        true,
        false,
        false,
        true,
        array[website_row.homepage_url],
        true
      );
    end if;
  end loop;
end $$;
