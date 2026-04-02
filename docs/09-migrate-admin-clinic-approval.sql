-- Clinic Queue — Migration: Admin + Clinic Approval
-- Use this if you already ran an older schema and need to add:
-- - clinic_status enum + clinics.status workflow fields
-- - app_admins + is_admin()
-- - approve/reject clinic RPCs
-- - admin RLS policies + grants
-- Safe to re-run.

begin;

-- 1) Enums
do $$ begin
  create type clinic_status as enum ('pending', 'active', 'rejected');
exception when duplicate_object then null; end $$;

-- 2) clinics table: add approval workflow columns
alter table public.clinics
  add column if not exists status clinic_status not null default 'pending',
  add column if not exists requested_by uuid references auth.users(id) on delete set null,
  add column if not exists requested_at timestamptz not null default now(),
  add column if not exists approved_by uuid references auth.users(id) on delete set null,
  add column if not exists approved_at timestamptz,
  add column if not exists rejected_by uuid references auth.users(id) on delete set null,
  add column if not exists rejected_at timestamptz,
  add column if not exists rejection_reason text not null default '';

-- If you had existing clinics already running, keep them ACTIVE so the app doesn't lock users out.
update public.clinics
set status = 'active'
where status is null or status = 'pending';

-- 3) app_admins + is_admin()
create table if not exists public.app_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.app_admins enable row level security;

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

-- 4) tighten is_clinic_member() to require clinic is active
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

-- 5) Admin RPCs
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

-- 6) Admin policies (idempotent)
-- clinics: admins can read all clinics
do $$
begin
  if not exists (
    select 1 from pg_policies
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

-- clinics: admins can update clinics
do $$
begin
  if not exists (
    select 1 from pg_policies
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

-- clinic_members: admins can read all memberships
do $$
begin
  if not exists (
    select 1 from pg_policies
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

-- settings/patients/visits/payments/daily_counters/profiles: admin read policies
-- (Create only if missing; same names as bootstrap script)

do $$
begin
  if not exists (
    select 1 from pg_policies
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

do $$
begin
  if not exists (
    select 1 from pg_policies
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

do $$
begin
  if not exists (
    select 1 from pg_policies
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

do $$
begin
  if not exists (
    select 1 from pg_policies
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

do $$
begin
  if not exists (
    select 1 from pg_policies
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

do $$
begin
  if not exists (
    select 1 from pg_policies
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

-- 7) Grants
grant execute on function public.is_admin() to authenticated;
grant execute on function public.approve_clinic(uuid) to authenticated;
grant execute on function public.reject_clinic(uuid, text) to authenticated;

commit;
