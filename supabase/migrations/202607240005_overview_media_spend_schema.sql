alter table if exists public.brands
  add column if not exists color text;

create table if not exists public.platforms (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  slug text not null,
  icon text,
  color text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, slug)
);

create table if not exists public.campaign_platforms (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  platform_id uuid not null references public.platforms(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (campaign_id, platform_id)
);

create table if not exists public.spend_records (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  brand_id uuid not null references public.brands(id) on delete cascade,
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  platform_id uuid not null references public.platforms(id) on delete cascade,
  spend_date date not null,
  amount numeric(14,2) not null check (amount >= 0),
  currency text not null default 'USD',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, campaign_id, platform_id, spend_date)
);

create index if not exists idx_platforms_org_active
  on public.platforms (organization_id, is_active, slug);

create index if not exists idx_campaign_platforms_org_campaign
  on public.campaign_platforms (organization_id, campaign_id);

create index if not exists idx_campaign_platforms_org_platform
  on public.campaign_platforms (organization_id, platform_id);

create index if not exists idx_spend_records_org_date
  on public.spend_records (organization_id, spend_date desc);

create index if not exists idx_spend_records_org_brand_date
  on public.spend_records (organization_id, brand_id, spend_date desc);

create index if not exists idx_spend_records_org_campaign_date
  on public.spend_records (organization_id, campaign_id, spend_date desc);

create index if not exists idx_spend_records_org_platform_date
  on public.spend_records (organization_id, platform_id, spend_date desc);

alter table public.platforms enable row level security;
alter table public.campaign_platforms enable row level security;
alter table public.spend_records enable row level security;

drop policy if exists platforms_select on public.platforms;
drop policy if exists platforms_insert on public.platforms;
drop policy if exists platforms_update on public.platforms;
drop policy if exists platforms_delete on public.platforms;

create policy platforms_select on public.platforms
for select using (public.is_org_member(organization_id) or public.is_hizen_super_admin());

create policy platforms_insert on public.platforms
for insert with check (public.is_org_member(organization_id) or public.is_hizen_super_admin());

create policy platforms_update on public.platforms
for update using (public.is_org_member(organization_id) or public.is_hizen_super_admin())
with check (public.is_org_member(organization_id) or public.is_hizen_super_admin());

create policy platforms_delete on public.platforms
for delete using (public.is_org_member(organization_id) or public.is_hizen_super_admin());

drop policy if exists campaign_platforms_select on public.campaign_platforms;
drop policy if exists campaign_platforms_insert on public.campaign_platforms;
drop policy if exists campaign_platforms_update on public.campaign_platforms;
drop policy if exists campaign_platforms_delete on public.campaign_platforms;

create policy campaign_platforms_select on public.campaign_platforms
for select using (public.is_org_member(organization_id) or public.is_hizen_super_admin());

create policy campaign_platforms_insert on public.campaign_platforms
for insert with check (public.is_org_member(organization_id) or public.is_hizen_super_admin());

create policy campaign_platforms_update on public.campaign_platforms
for update using (public.is_org_member(organization_id) or public.is_hizen_super_admin())
with check (public.is_org_member(organization_id) or public.is_hizen_super_admin());

create policy campaign_platforms_delete on public.campaign_platforms
for delete using (public.is_org_member(organization_id) or public.is_hizen_super_admin());

drop policy if exists spend_records_select on public.spend_records;
drop policy if exists spend_records_insert on public.spend_records;
drop policy if exists spend_records_update on public.spend_records;
drop policy if exists spend_records_delete on public.spend_records;

create policy spend_records_select on public.spend_records
for select using (public.is_org_member(organization_id) or public.is_hizen_super_admin());

create policy spend_records_insert on public.spend_records
for insert with check (public.is_org_member(organization_id) or public.is_hizen_super_admin());

create policy spend_records_update on public.spend_records
for update using (public.is_org_member(organization_id) or public.is_hizen_super_admin())
with check (public.is_org_member(organization_id) or public.is_hizen_super_admin());

create policy spend_records_delete on public.spend_records
for delete using (public.is_org_member(organization_id) or public.is_hizen_super_admin());

drop trigger if exists platforms_set_updated_at on public.platforms;
create trigger platforms_set_updated_at
before update on public.platforms
for each row execute function public.set_updated_at();

drop trigger if exists campaign_platforms_set_updated_at on public.campaign_platforms;
create trigger campaign_platforms_set_updated_at
before update on public.campaign_platforms
for each row execute function public.set_updated_at();

drop trigger if exists spend_records_set_updated_at on public.spend_records;
create trigger spend_records_set_updated_at
before update on public.spend_records
for each row execute function public.set_updated_at();
