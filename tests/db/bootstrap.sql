-- Minimal non-production schema fixture for Stage D migration validation.
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
do $$
begin
  if (select n.nspname from pg_extension e join pg_namespace n on n.oid=e.extnamespace where e.extname='pgcrypto') <> 'extensions'
     or to_regprocedure('extensions.gen_random_bytes(integer)') is null
     or to_regprocedure('extensions.digest(text,text)') is null then
    raise exception 'pgcrypto must provide extensions.gen_random_bytes(integer) and extensions.digest(text,text)';
  end if;
end $$;
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role; end if;
end $$;
create schema if not exists auth;
create table if not exists auth.users (id uuid primary key, email text);
create or replace function auth.uid() returns uuid language sql stable as $$ select null::uuid $$;
create table public.profiles (id uuid primary key, email text, full_name text, role text, business_id uuid, access_status text, must_change_password boolean, admin_permissions jsonb);
create table public.master_audit_log (id uuid primary key default gen_random_uuid(), actor_id uuid, entity_type text not null, entity_id uuid not null, action text not null, after_data jsonb, created_at timestamptz not null default now());
create table public.businesses (id uuid primary key default gen_random_uuid(), business_name text, email text, phone text, status text, source_request_id uuid, employer_id uuid, selected_package text, number_of_employees integer, default_employee_portal_enabled boolean);
create table public.subscriptions (id uuid primary key default gen_random_uuid(), business_id uuid unique references public.businesses(id), plan_name text, monthly_fee numeric(12,2), setup_fee numeric(12,2), setup_paid boolean, subscription_status text);
create table public.wageflow_setup_requests (id uuid primary key default gen_random_uuid(), business_name text, contact_person text, email text, phone text, selected_package text, number_of_employees integer, notes text, default_employee_portal_enabled boolean, terms_accepted boolean, privacy_accepted boolean, status text, approved_at timestamptz, rejected_at timestamptz);
alter table public.businesses add constraint businesses_source_request_fk foreign key (source_request_id) references public.wageflow_setup_requests(id);
alter table public.businesses add constraint businesses_employer_fk foreign key (employer_id) references public.profiles(id);
alter table public.profiles add constraint profiles_business_fk foreign key (business_id) references public.businesses(id);
create or replace function public.is_wageflow_master() returns boolean language sql stable as $$ select false $$;
create or replace function public.current_business_id() returns uuid language sql stable as $$ select null::uuid $$;
