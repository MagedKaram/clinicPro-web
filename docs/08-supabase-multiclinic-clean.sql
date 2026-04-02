-- Clinic Queue — Supabase Clean Multi-Clinic Bootstrap (Phase 3)
-- Run this on a NEW Supabase project (SQL Editor).
-- Creates: clinics, clinic_members, settings, patients, visits, payments, daily_counters, profiles
-- Adds RLS + grants + RPCs.

begin;

create extension if not exists pgcrypto;

-- Enums
do $$ begin
  create type visit_status as enum ('waiting', 'serving', 'done');
exception when duplicate_object then null; end $$;

do $$ begin
  create type visit_type as enum ('new', 'followup');
exception when duplicate_object then null; end $$;

do $$ begin
  create type clinic_status as enum ('pending', 'active', 'rejected');
exception when duplicate_object then null; end $$;

-- Core
create table if not exists public.clinics (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  status clinic_status not null default 'pending',
  requested_by uuid references auth.users(id) on delete set null,
  requested_at timestamptz not null default now(),
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  rejected_by uuid references auth.users(id) on delete set null,
  rejected_at timestamptz,
  rejection_reason text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.clinic_members (
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'doctor', 'reception')),
  created_at timestamptz not null default now(),
  primary key (clinic_id, user_id)
);

create index if not exists clinic_members_user_idx on public.clinic_members(user_id);
create index if not exists clinic_members_clinic_idx on public.clinic_members(clinic_id);

create table if not exists public.settings (
  clinic_id uuid primary key references public.clinics(id) on delete cascade,
  clinic_name text not null default '',
  doctor_name text not null default '',
  address text not null default '',
  phone text not null default '',
  price_new int not null default 200,
  price_followup int not null default 100,
  updated_at timestamptz not null default now()
);

create table if not exists public.patients (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  name text not null,
  phone text not null default '',
  address text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists patients_clinic_created_idx on public.patients(clinic_id, created_at desc);
create index if not exists patients_name_idx on public.patients using gin (to_tsvector('simple', name));
create unique index if not exists patients_unique_phone_per_clinic
  on public.patients(clinic_id, phone)
  where phone <> '';

create table if not exists public.visits (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete cascade,

  ticket int not null,
  visit_type visit_type not null default 'new',
  status visit_status not null default 'waiting',

  visit_date date not null,
  visit_time time not null,

  diagnosis text not null default '',
  prescription text not null default '',
  notes text not null default '',

  price int not null default 0,
  paid int not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists visits_clinic_date_status_idx
  on public.visits(clinic_id, visit_date, status, ticket);
create unique index if not exists visits_unique_ticket_per_day_per_clinic
  on public.visits(clinic_id, visit_date, ticket);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

do $$ begin
  create trigger visits_set_updated_at
  before update on public.visits
  for each row execute function public.set_updated_at();
exception when duplicate_object then null; end $$;

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete cascade,
  visit_id uuid references public.visits(id) on delete set null,
  amount int not null check (amount > 0),
  note text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists payments_clinic_patient_idx on public.payments(clinic_id, patient_id, created_at);
create index if not exists payments_clinic_visit_idx on public.payments(clinic_id, visit_id, created_at);

create table if not exists public.daily_counters (
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  day date not null,
  last_ticket int not null default 0,
  primary key (clinic_id, day)
);

-- Profiles (public mirror of auth.users email)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now()
);

-- App admins (private table; do NOT grant direct access to authenticated)
create table if not exists public.app_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.app_admins a
    where a.user_id = auth.uid()
  );
$$;

-- RLS helper
create or replace function public.is_clinic_member(p_clinic_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.clinic_members m
    join public.clinics c on c.id = m.clinic_id
    where m.clinic_id = p_clinic_id
      and m.user_id = auth.uid()
      and c.status = 'active'
  );
$$;

-- RPCs
create or replace function public.allocate_ticket(p_clinic_id uuid, p_day date)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ticket int;
begin
  if not public.is_clinic_member(p_clinic_id) then
    raise exception 'Not a clinic member';
  end if;

  insert into public.daily_counters (clinic_id, day, last_ticket)
  values (p_clinic_id, p_day, 0)
  on conflict (clinic_id, day) do nothing;

  update public.daily_counters
     set last_ticket = last_ticket + 1
   where clinic_id = p_clinic_id
     and day = p_day
   returning last_ticket into v_ticket;

  return v_ticket;
end $$;

create or replace function public.call_next(p_clinic_id uuid, p_day date)
returns table (visit_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_next uuid;
begin
  if not public.is_clinic_member(p_clinic_id) then
    raise exception 'Not a clinic member';
  end if;

  update public.visits
     set status = 'done'
   where clinic_id = p_clinic_id
     and visit_date = p_day
     and status = 'serving';

  select v.id into v_next
  from public.visits v
  where v.clinic_id = p_clinic_id
    and v.visit_date = p_day
    and v.status = 'waiting'
  order by v.ticket asc
  limit 1
  for update;

  if v_next is null then
    return;
  end if;

  update public.visits
     set status = 'serving'
   where id = v_next;

  return query select v_next;
end $$;

-- If this script is re-run, avoid replace-errors caused by parameter-name changes
-- on the same (text,text,text,text) function signature.
drop function if exists public.create_clinic_for_owner(text, text, text, text);

create or replace function public.create_clinic_for_owner(
  p_clinic_name text,
  p_doctor_name text,
  p_address text default '',
  p_phone text default ''
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_clinic_id uuid;
  v_clean_clinic_name text;
  v_clean_doctor_name text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  v_clean_clinic_name := coalesce(nullif(trim(p_clinic_name), ''), '');
  v_clean_doctor_name := coalesce(nullif(trim(p_doctor_name), ''), '');

  if v_clean_clinic_name = '' then
    raise exception 'Clinic name is required';
  end if;

  if v_clean_doctor_name = '' then
    raise exception 'Doctor name is required';
  end if;

  insert into public.clinics (name)
  values (v_clean_clinic_name)
  returning id into v_clinic_id;

  update public.clinics
     set status = 'pending',
         requested_by = auth.uid(),
         requested_at = now(),
         approved_by = null,
         approved_at = null,
         rejected_by = null,
         rejected_at = null,
         rejection_reason = ''
   where id = v_clinic_id;

  insert into public.clinic_members (clinic_id, user_id, role)
  values (v_clinic_id, auth.uid(), 'owner');

  insert into public.settings (
    clinic_id, clinic_name, doctor_name, address, phone
  ) values (
    v_clinic_id,
    v_clean_clinic_name,
    v_clean_doctor_name,
    coalesce(p_address, ''),
    coalesce(p_phone, '')
  );

  return v_clinic_id;
end $$;

create or replace function public.approve_clinic(p_clinic_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Not an admin';
  end if;

  update public.clinics
     set status = 'active',
         approved_by = auth.uid(),
         approved_at = now(),
         rejected_by = null,
         rejected_at = null,
         rejection_reason = ''
   where id = p_clinic_id;
end $$;

create or replace function public.reject_clinic(p_clinic_id uuid, p_reason text default '')
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Not an admin';
  end if;

  update public.clinics
     set status = 'rejected',
         rejected_by = auth.uid(),
         rejected_at = now(),
         rejection_reason = coalesce(p_reason, ''),
         approved_by = null,
         approved_at = null
   where id = p_clinic_id;
end $$;

-- Trigger to keep profiles in sync
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do update set email = excluded.email;
  return new;
end $$;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'on_auth_user_created') then
    create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();
  end if;
end $$;

-- RLS
alter table public.clinics enable row level security;
alter table public.clinic_members enable row level security;
alter table public.settings enable row level security;
alter table public.patients enable row level security;
alter table public.visits enable row level security;
alter table public.payments enable row level security;
alter table public.daily_counters enable row level security;
alter table public.profiles enable row level security;
alter table public.app_admins enable row level security;

-- Policies
-- clinics: members can read their clinics
do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'clinics'
      and policyname = 'clinics_select_member'
  ) then
    execute $policy$
      create policy clinics_select_member
      on public.clinics
      for select
      to authenticated
      using (exists (
        select 1 from public.clinic_members m
        where m.clinic_id = clinics.id
          and m.user_id = auth.uid()
      ));
    $policy$;
  end if;
end $$;

-- clinic_members: admins can read all memberships
do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'clinic_members'
      and policyname = 'clinic_members_select_admin'
  ) then
    execute $policy$
      create policy clinic_members_select_admin
      on public.clinic_members
      for select
      to authenticated
      using (public.is_admin());
    $policy$;
  end if;
end $$;

-- clinics: admins can read all clinics (including pending)
do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'clinics'
      and policyname = 'clinics_select_admin'
  ) then
    execute $policy$
      create policy clinics_select_admin
      on public.clinics
      for select
      to authenticated
      using (public.is_admin());
    $policy$;
  end if;
end $$;

-- clinics: admins can approve/reject clinics
do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'clinics'
      and policyname = 'clinics_update_admin'
  ) then
    execute $policy$
      create policy clinics_update_admin
      on public.clinics
      for update
      to authenticated
      using (public.is_admin())
      with check (public.is_admin());
    $policy$;
  end if;
end $$;

-- clinic_members: user can read their memberships
do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'clinic_members'
      and policyname = 'clinic_members_select_self'
  ) then
    execute $policy$
      create policy clinic_members_select_self
      on public.clinic_members
      for select
      to authenticated
      using (user_id = auth.uid());
    $policy$;
  end if;
end $$;

-- settings
do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'settings'
      and policyname = 'settings_select_member'
  ) then
    execute $policy$
      create policy settings_select_member
      on public.settings
      for select
      to authenticated
      using (public.is_clinic_member(clinic_id));
    $policy$;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'settings'
      and policyname = 'settings_update_member'
  ) then
    execute $policy$
      create policy settings_update_member
      on public.settings
      for update
      to authenticated
      using (public.is_clinic_member(clinic_id))
      with check (public.is_clinic_member(clinic_id));
    $policy$;
  end if;
end $$;

-- settings: admins can read all settings
do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'settings'
      and policyname = 'settings_select_admin'
  ) then
    execute $policy$
      create policy settings_select_admin
      on public.settings
      for select
      to authenticated
      using (public.is_admin());
    $policy$;
  end if;
end $$;

-- patients
do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'patients'
      and policyname = 'patients_crud_member'
  ) then
    execute $policy$
      create policy patients_crud_member
      on public.patients
      for all
      to authenticated
      using (public.is_clinic_member(clinic_id))
      with check (public.is_clinic_member(clinic_id));
    $policy$;
  end if;
end $$;

-- patients: admins can read all patients
do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'patients'
      and policyname = 'patients_select_admin'
  ) then
    execute $policy$
      create policy patients_select_admin
      on public.patients
      for select
      to authenticated
      using (public.is_admin());
    $policy$;
  end if;
end $$;

-- visits
do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'visits'
      and policyname = 'visits_crud_member'
  ) then
    execute $policy$
      create policy visits_crud_member
      on public.visits
      for all
      to authenticated
      using (public.is_clinic_member(clinic_id))
      with check (public.is_clinic_member(clinic_id));
    $policy$;
  end if;
end $$;

-- visits: admins can read all visits
do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'visits'
      and policyname = 'visits_select_admin'
  ) then
    execute $policy$
      create policy visits_select_admin
      on public.visits
      for select
      to authenticated
      using (public.is_admin());
    $policy$;
  end if;
end $$;

-- payments
do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'payments'
      and policyname = 'payments_crud_member'
  ) then
    execute $policy$
      create policy payments_crud_member
      on public.payments
      for all
      to authenticated
      using (public.is_clinic_member(clinic_id))
      with check (public.is_clinic_member(clinic_id));
    $policy$;
  end if;
end $$;

-- payments: admins can read all payments
do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'payments'
      and policyname = 'payments_select_admin'
  ) then
    execute $policy$
      create policy payments_select_admin
      on public.payments
      for select
      to authenticated
      using (public.is_admin());
    $policy$;
  end if;
end $$;

-- daily counters
do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'daily_counters'
      and policyname = 'daily_counters_crud_member'
  ) then
    execute $policy$
      create policy daily_counters_crud_member
      on public.daily_counters
      for all
      to authenticated
      using (public.is_clinic_member(clinic_id))
      with check (public.is_clinic_member(clinic_id));
    $policy$;
  end if;
end $$;

-- daily counters: admins can read all counters
do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'daily_counters'
      and policyname = 'daily_counters_select_admin'
  ) then
    execute $policy$
      create policy daily_counters_select_admin
      on public.daily_counters
      for select
      to authenticated
      using (public.is_admin());
    $policy$;
  end if;
end $$;

-- profiles: user can read their own profile
do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'profiles_select_self'
  ) then
    execute $policy$
      create policy profiles_select_self
      on public.profiles
      for select
      to authenticated
      using (id = auth.uid());
    $policy$;
  end if;
end $$;

-- profiles: admins can read all profiles
do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'profiles_select_admin'
  ) then
    execute $policy$
      create policy profiles_select_admin
      on public.profiles
      for select
      to authenticated
      using (public.is_admin());
    $policy$;
  end if;
end $$;

-- Grants
grant usage on schema public to authenticated;

grant select on table public.clinics to authenticated;
grant select on table public.clinic_members to authenticated;
grant select, update on table public.settings to authenticated;
grant select, insert, update, delete on table public.patients to authenticated;
grant select, insert, update, delete on table public.visits to authenticated;
grant select, insert, update, delete on table public.payments to authenticated;
grant select, insert, update, delete on table public.daily_counters to authenticated;
grant select on table public.profiles to authenticated;

grant execute on function public.allocate_ticket(uuid, date) to authenticated;
grant execute on function public.call_next(uuid, date) to authenticated;
grant execute on function public.is_admin() to authenticated;
-- Both overloads share same SQL type signature (text,text,text,text)
-- Grant once is enough, kept explicit for clarity.
grant execute on function public.create_clinic_for_owner(text, text, text, text) to authenticated;
grant execute on function public.approve_clinic(uuid) to authenticated;
grant execute on function public.reject_clinic(uuid, text) to authenticated;

-- Realtime (safe, idempotent)
do $$
begin
  -- Supabase uses the `supabase_realtime` publication for Postgres changes.
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin
      alter publication supabase_realtime add table public.visits;
    exception when duplicate_object then
      null;
    end;
  end if;
end $$;

commit;

-- Notes:
-- Realtime is enabled above for public.visits.
