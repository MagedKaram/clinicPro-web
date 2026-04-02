-- Clinic Queue — Migration: Doctor Profiles
-- Adds doctor_profiles table for specialty, bio, and future multi-doctor support
-- Safe to re-run (idempotent)

begin;

-- ============================================================
-- doctor_profiles — one record per doctor (per auth user)
-- ============================================================

create table if not exists public.doctor_profiles (
  user_id        uuid primary key references auth.users(id) on delete cascade,
  full_name      text not null default '',
  specialty      text not null default '',   -- باطنة، رمد، أطفال، عظام...
  bio            text not null default '',
  license_number text not null default '',   -- رقم نقابة الأطباء
  phone          text not null default '',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

do $$ begin
  create trigger doctor_profiles_set_updated_at
  before update on public.doctor_profiles
  for each row execute function public.set_updated_at();
exception when duplicate_object then null; end $$;

alter table public.doctor_profiles enable row level security;

-- doctor can read/update their own profile
do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'doctor_profiles' and policyname = 'dp_self'
  ) then
    execute $p$
      create policy dp_self on public.doctor_profiles for all to authenticated
      using (user_id = auth.uid()) with check (user_id = auth.uid());
    $p$;
  end if;
end $$;

-- clinic member can read doctor profiles of doctors in their clinic
do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'doctor_profiles' and policyname = 'dp_clinic_select'
  ) then
    execute $p$
      create policy dp_clinic_select on public.doctor_profiles for select to authenticated
      using (exists (
        select 1 from public.clinic_members cm
        where cm.user_id = doctor_profiles.user_id
          and public.is_clinic_member(cm.clinic_id)
      ));
    $p$;
  end if;
end $$;

-- admin sees all
do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'doctor_profiles' and policyname = 'dp_admin'
  ) then
    execute $p$
      create policy dp_admin on public.doctor_profiles for select to authenticated
      using (public.is_admin());
    $p$;
  end if;
end $$;

grant select, insert, update on public.doctor_profiles to authenticated;

commit;
