-- TV dashboard support columns and indexes

alter table if exists public.tv_ad_detections
  add column if not exists preview_poster_url text,
  add column if not exists is_uploaded_asset boolean not null default false,
  add column if not exists source text not null default 'system';

create index if not exists idx_tv_ad_detections_org_uploaded_date
  on public.tv_ad_detections (organization_id, is_uploaded_asset desc, detected_at desc);

create index if not exists idx_tv_ad_detections_org_brand_date
  on public.tv_ad_detections (organization_id, brand_id, detected_at desc);

create index if not exists idx_tv_ad_detections_org_campaign_date
  on public.tv_ad_detections (organization_id, campaign_id, detected_at desc);

create index if not exists idx_tv_ad_detections_org_channel_date
  on public.tv_ad_detections (organization_id, channel_id, detected_at desc);
