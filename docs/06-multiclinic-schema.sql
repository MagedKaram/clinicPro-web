-- Clinic Queue — Multi-Clinic Schema (Phase 3 Prep)
-- This script is a reference starting point. Apply on a NEW project or adapt as a migration.
-- Key idea: every operational table is scoped by clinic_id + RLS.

begin;

create extension if not exists pgcrypto;

-- 1) Enums (reuse)
do $$ begin
  create type visit_status as enum ('waiting', 'serving', 'done');
exception when duplicate_object then null; end $$;

do $$ begin
  create type visit_type as enum ('new', 'followup');
exception when duplicate_object then null; end $$;

-- 2) Core multi-tenant tables

create table if not exists public.clinics (
  id uuid primary key default gen_random_uuid(),
  name text not null,
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

-- 3) Settings (per clinic)
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

-- 4) Patients (scoped)
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

-- Unique phone per clinic (ignore empty)
create unique index if not exists patients_unique_phone_per_clinic
  on public.patients(clinic_id, phone)
  where phone <> '';

-- 5) Visits (scoped)
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

-- 6) Payments (scoped)
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

-- 7) Daily counters (scoped)
create table if not exists public.daily_counters (
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  day date not null,
  last_ticket int not null default 0,
  primary key (clinic_id, day)
);

-- 8) Helper functions for RLS
create or replace function public.is_clinic_member(p_clinic_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.clinic_members m
    where m.clinic_id = p_clinic_id
      and m.user_id = auth.uid()
  );
$$;

-- 9) RPCs (scoped)

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

  -- close any existing serving (same clinic + day)
  update public.visits
     set status = 'done'
   where clinic_id = p_clinic_id
     and visit_date = p_day
     and status = 'serving';

  -- lock and pick next waiting visit
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

-- 10) Clinic creation RPC (for signup)
-- Creates clinic + owner membership + default settings.
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
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  insert into public.clinics (name)
  values (coalesce(nullif(trim(p_clinic_name), ''), ''))
  returning id into v_clinic_id;

  insert into public.clinic_members (clinic_id, user_id, role)
  values (v_clinic_id, auth.uid(), 'owner');

  insert into public.settings (
    clinic_id,
    clinic_name,
    doctor_name,
    address,
    phone
  ) values (
    v_clinic_id,
    coalesce(nullif(trim(p_clinic_name), ''), ''),
    coalesce(nullif(trim(p_doctor_name), ''), ''),
    coalesce(p_address, ''),
    coalesce(p_phone, '')
  );

  return v_clinic_id;
end $$;

-- 11) RLS

alter table public.clinics enable row level security;
alter table public.clinic_members enable row level security;
alter table public.settings enable row level security;
alter table public.patients enable row level security;
alter table public.visits enable row level security;
alter table public.payments enable row level security;
alter table public.daily_counters enable row level security;

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
      and policyname = 'settings_update_owner'
  ) then
    execute $policy$
      create policy settings_update_owner
      on public.settings
      for update
      to authenticated
      using (public.is_clinic_member(clinic_id))
      with check (public.is_clinic_member(clinic_id));
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

-- 12) Grants
-- For production, prefer authenticated only.
grant usage on schema public to authenticated;

grant select on table public.clinics to authenticated;
grant select on table public.clinic_members to authenticated;

grant select, update on table public.settings to authenticated;
grant select, insert, update, delete on table public.patients to authenticated;
grant select, insert, update, delete on table public.visits to authenticated;
grant select, insert, update, delete on table public.payments to authenticated;
grant select, insert, update, delete on table public.daily_counters to authenticated;

grant execute on function public.allocate_ticket(uuid, date) to authenticated;
grant execute on function public.call_next(uuid, date) to authenticated;
grant execute on function public.create_clinic_for_owner(text, text, text, text) to authenticated;

commit;

-- Notes:
-- 1) If you need realtime, include public.visits in supabase_realtime publication.
-- 2) For larger clinics (many staff), add invitations flow + restrict create_clinic_for_owner.
