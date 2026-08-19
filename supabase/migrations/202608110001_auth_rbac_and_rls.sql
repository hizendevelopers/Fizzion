-- Real authentication + RBAC wiring, and Row Level Security for every
-- non-TV table the frontend touches.
--
-- Context: the app previously had no authentication and zero RLS
-- policies anywhere, while shipping a publishable (anon) Supabase key
-- to every browser. This migration:
--   1. auto-creates a `profiles` row for every new auth.users signup
--   2. adds `is_org_member` / `is_org_admin` helper functions
--   3. enables RLS + an org-scoped policy on every public table that
--      has a NOT NULL `organization_id` column, excluding `tv_*` and
--      `capture_device*` tables (out of scope for this pass)
--   4. enables RLS with an authenticated-only policy on a short list of
--      single-tenant tables that have no organization_id column at all
--      (the Meta Ads Library tables, and the social_platforms lookup)
--   5. adds bespoke policies for the auth/org tables themselves
--
-- The application server always uses the Supabase service-role key
-- (which bypasses RLS by design), so none of this changes how the app
-- itself reads/writes data — it only removes the ability to read or
-- write any of this data directly with the public anon key.

-- 1. Auto-create a profile row for every new auth user.
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, preferred_locale, preferred_timezone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    coalesce(new.raw_user_meta_data->>'preferred_locale', 'en'),
    coalesce(new.raw_user_meta_data->>'preferred_timezone', 'Asia/Baghdad')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- 2. RBAC helper functions.
create or replace function public.is_org_member(target_org_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.organization_members om
    where om.organization_id = target_org_id
      and om.user_id = auth.uid()
      and om.status = 'active'
  );
$$;

create or replace function public.is_org_admin(target_org_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.organization_members om
    join public.roles r on r.id = om.role_id
    where om.organization_id = target_org_id
      and om.user_id = auth.uid()
      and om.status = 'active'
      and r.slug = 'admin'
  );
$$;

-- 3. Generic org-scoped RLS for every table with a required organization_id,
--    excluding TV and capture-device tables (out of scope for this pass).
do $$
declare
  tbl record;
begin
  for tbl in
    select c.table_name
    from information_schema.columns c
    where c.table_schema = 'public'
      and c.column_name = 'organization_id'
      and c.is_nullable = 'NO'
      and c.table_name not like 'tv\_%' escape '\'
      and c.table_name not like 'capture\_device%' escape '\'
  loop
    execute format('alter table public.%I enable row level security', tbl.table_name);
    execute format('drop policy if exists org_members_all on public.%I', tbl.table_name);
    execute format(
      'create policy org_members_all on public.%I for all using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id))',
      tbl.table_name
    );
  end loop;
end $$;

-- 4. Single-tenant tables with no organization_id column: any signed-in
--    user may access them (the app is single-organization today; the
--    critical fix is requiring authentication at all, closing anon-key
--    access).
do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'meta_ads_jobs',
    'meta_library_ads',
    'meta_ad_enrichment_cache',
    'meta_ads_insights_import_runs',
    'meta_impressions_dataset_snapshots',
    'meta_impressions_ground_truth_labels',
    'meta_impressions_model_registry',
    'meta_impression_predictions',
    'social_platforms'
  ]
  loop
    if to_regclass('public.' || tbl) is not null then
      execute format('alter table public.%I enable row level security', tbl);
      execute format('drop policy if exists authenticated_all on public.%I', tbl);
      execute format(
        'create policy authenticated_all on public.%I for all to authenticated using (true) with check (true)',
        tbl
      );
    end if;
  end loop;
end $$;

-- 5. Bespoke policies for the auth/org tables.

alter table public.organizations enable row level security;
drop policy if exists org_members_select on public.organizations;
create policy org_members_select on public.organizations
  for select using (public.is_org_member(id));

alter table public.roles enable row level security;
drop policy if exists roles_select on public.roles;
create policy roles_select on public.roles
  for select using (organization_id is null or public.is_org_member(organization_id));

alter table public.permissions enable row level security;
drop policy if exists permissions_select on public.permissions;
create policy permissions_select on public.permissions
  for select to authenticated using (true);

alter table public.role_permissions enable row level security;
drop policy if exists role_permissions_select on public.role_permissions;
create policy role_permissions_select on public.role_permissions
  for select using (
    exists (
      select 1 from public.roles r
      where r.id = role_permissions.role_id
        and (r.organization_id is null or public.is_org_member(r.organization_id))
    )
  );

alter table public.organization_members enable row level security;
drop policy if exists own_membership_select on public.organization_members;
create policy own_membership_select on public.organization_members
  for select using (user_id = auth.uid());

alter table public.profiles enable row level security;
drop policy if exists own_profile_select on public.profiles;
create policy own_profile_select on public.profiles
  for select using (id = auth.uid());
drop policy if exists own_profile_update on public.profiles;
create policy own_profile_update on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

alter table public.user_preferences enable row level security;
drop policy if exists own_preferences_all on public.user_preferences;
create policy own_preferences_all on public.user_preferences
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
