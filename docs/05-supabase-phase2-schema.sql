-- Clinic Queue — Phase 2 Supabase Schema (Single Clinic)
-- Copy/paste this into Supabase SQL Editor and Run.
-- Source: docs/04-backend-spec.md (consolidated)

begin;

-- 0) Extensions
-- Needed for gen_random_uuid()
create extension if not exists pgcrypto;

-- 1) Enums
do $$ begin
  create type visit_status as enum ('waiting', 'serving', 'done');
exception when duplicate_object then null; end $$;

do $$ begin
  create type visit_type as enum ('new', 'followup');
exception when duplicate_object then null; end $$;

-- 2) Tables

-- 2.1 profiles (auth.users -> role)
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('reception', 'doctor')),
  created_at timestamptz not null default now()
);

create index if not exists profiles_role_idx on public.profiles(role);

-- 2.2 settings (singleton)
create table if not exists public.settings (
  id int primary key default 1,
  clinic_name text not null default '',
  doctor_name text not null default '',
  address text not null default '',
  phone text not null default '',
  price_new int not null default 200,
  price_followup int not null default 100,
  updated_at timestamptz not null default now(),
  constraint settings_singleton check (id = 1)
);

insert into public.settings (id)
values (1)
on conflict (id) do nothing;

-- 2.3 patients
create table if not exists public.patients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null default '',
  address text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists patients_name_idx on public.patients using gin (to_tsvector('simple', name));

create unique index if not exists patients_unique_phone
  on public.patients(phone)
  where phone <> '';

-- 2.4 visits
create table if not exists public.visits (
  id uuid primary key default gen_random_uuid(),
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

create index if not exists visits_date_status_idx
  on public.visits(visit_date, status, ticket);

create unique index if not exists visits_unique_ticket_per_day
  on public.visits(visit_date, ticket);

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

-- 2.5 payments
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  visit_id uuid references public.visits(id) on delete set null,
  amount int not null check (amount > 0),
  note text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists payments_patient_idx on public.payments(patient_id, created_at);
create index if not exists payments_visit_idx on public.payments(visit_id, created_at);

-- 3) Counters & RPCs

-- 3.1 daily_counters
create table if not exists public.daily_counters (
  day date not null,
  last_ticket int not null default 0,
  primary key (day)
);

-- 3.2 allocate_ticket(day) -> int
create or replace function public.allocate_ticket(p_day date)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ticket int;
begin
  insert into public.daily_counters (day, last_ticket)
  values (p_day, 0)
  on conflict (day) do nothing;

  update public.daily_counters
     set last_ticket = last_ticket + 1
   where day = p_day
   returning last_ticket into v_ticket;

  return v_ticket;
end $$;

-- 3.3 call_next(day) -> visit_id
create or replace function public.call_next(p_day date)
returns table (visit_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_next uuid;
begin
  -- close any existing serving
  update public.visits
     set status = 'done'
   where visit_date = p_day
     and status = 'serving';

  -- lock and pick next waiting visit
  select v.id into v_next
  from public.visits v
  where v.visit_date = p_day
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

-- 4) Grants (for early Phase 2 dev)
-- NOTE: RLS is NOT enabled here yet. This is for quick bring-up.
-- When you enable RLS, you'll need policies (see docs/04-backend-spec.md).

grant usage on schema public to anon, authenticated;

grant select, insert, update, delete on table public.patients to anon, authenticated;
grant select, insert, update, delete on table public.visits to anon, authenticated;
grant select, insert, update, delete on table public.payments to anon, authenticated;
grant select, insert, update, delete on table public.settings to anon, authenticated;
grant select, insert, update, delete on table public.daily_counters to anon, authenticated;

grant execute on function public.allocate_ticket(date) to anon, authenticated;
grant execute on function public.call_next(date) to anon, authenticated;

commit;

-- Optional (later): enable RLS + add policies
-- alter table public.patients enable row level security;
-- alter table public.visits enable row level security;
-- alter table public.settings enable row level security;
-- alter table public.payments enable row level security;
-- alter table public.daily_counters enable row level security;
