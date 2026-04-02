-- ============================================================
-- Clinic Queue — MASTER SCHEMA v3
-- Global patients · Guardian system · Clinic isolation · Audit log
-- Run on a fresh Supabase project — or after dropping all tables.
-- ============================================================

begin;

create extension if not exists pgcrypto;

-- ============================================================
-- SECTION 1: ENUMS
-- ============================================================

do $$ begin create type visit_status    as enum ('waiting','serving','done');             exception when duplicate_object then null; end $$;
do $$ begin create type visit_type      as enum ('new','followup');                        exception when duplicate_object then null; end $$;
do $$ begin create type clinic_status   as enum ('pending','active','rejected');           exception when duplicate_object then null; end $$;
do $$ begin create type gender_type     as enum ('male','female');                         exception when duplicate_object then null; end $$;
do $$ begin create type blood_type_enum as enum ('A+','A-','B+','B-','AB+','AB-','O+','O-'); exception when duplicate_object then null; end $$;
do $$ begin create type payment_method  as enum ('cash','card','transfer');                exception when duplicate_object then null; end $$;
do $$ begin create type payment_status  as enum ('paid','partial','pending');              exception when duplicate_object then null; end $$;
do $$ begin create type audit_action    as enum ('insert','update','delete');              exception when duplicate_object then null; end $$;

-- ============================================================
-- SECTION 2: APP ADMINS
-- ============================================================

create table if not exists public.app_admins (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.app_admins enable row level security;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.app_admins where user_id = auth.uid());
$$;

-- ============================================================
-- SECTION 3: PROFILES (mirror of auth.users)
-- ============================================================

create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text not null,
  phone      text not null default '',
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do update set email = excluded.email;
  return new;
end $$;

do $$ begin
  create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
exception when duplicate_object then null; end $$;

-- ============================================================
-- SECTION 4: PATIENTS — GLOBAL (not per-clinic)
-- ============================================================

create table if not exists public.patients (
  id            uuid primary key default gen_random_uuid(),

  -- link to auth account (optional — set when patient registers)
  user_id       uuid references auth.users(id) on delete set null,

  -- guardian link (for children / elderly) — points to another patient
  guardian_id   uuid references public.patients(id) on delete set null,

  -- core identity
  name          text not null,
  phone         text not null default '',
  national_id   text,
  date_of_birth date,
  gender        gender_type,
  blood_type    blood_type_enum,
  address       text not null default '',

  -- profile completeness flag (set to true when patient fills own profile)
  profile_complete boolean not null default false,

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- one auth account = one patient record
create unique index if not exists patients_unique_user_id
  on public.patients(user_id) where user_id is not null;

-- phone globally unique (when provided) — this is how we detect duplicates
create unique index if not exists patients_unique_phone
  on public.patients(phone) where phone <> '';

-- national_id globally unique (when provided)
create unique index if not exists patients_unique_national_id
  on public.patients(national_id) where national_id is not null and national_id <> '';

-- full-text search on name
create index if not exists patients_name_fts
  on public.patients using gin(to_tsvector('simple', name));

create index if not exists patients_guardian_idx on public.patients(guardian_id);
create index if not exists patients_user_idx     on public.patients(user_id);

-- auto updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

do $$ begin
  create trigger patients_set_updated_at
  before update on public.patients
  for each row execute function public.set_updated_at();
exception when duplicate_object then null; end $$;

alter table public.patients enable row level security;

-- ============================================================
-- SECTION 5: PATIENT MEDICAL INFO — GLOBAL
-- ============================================================

create table if not exists public.patient_medical_info (
  patient_id          uuid primary key references public.patients(id) on delete cascade,

  chronic_diseases    text[]  not null default '{}',
  allergies           text[]  not null default '{}',
  current_medications text    not null default '',
  past_surgeries      text    not null default '',
  family_history      text    not null default '',
  notes               text    not null default '',

  updated_at          timestamptz not null default now(),
  updated_by          uuid references auth.users(id) on delete set null
);

do $$ begin
  create trigger patient_medical_info_set_updated_at
  before update on public.patient_medical_info
  for each row execute function public.set_updated_at();
exception when duplicate_object then null; end $$;

alter table public.patient_medical_info enable row level security;

-- ============================================================
-- SECTION 6: CLINICS
-- ============================================================

create table if not exists public.clinics (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  status           clinic_status not null default 'pending',
  requested_by     uuid references auth.users(id) on delete set null,
  requested_at     timestamptz not null default now(),
  approved_by      uuid references auth.users(id) on delete set null,
  approved_at      timestamptz,
  rejected_by      uuid references auth.users(id) on delete set null,
  rejected_at      timestamptz,
  rejection_reason text not null default '',
  created_at       timestamptz not null default now()
);

alter table public.clinics enable row level security;

-- ============================================================
-- SECTION 7: CLINIC MEMBERS
-- ============================================================

create table if not exists public.clinic_members (
  clinic_id  uuid not null references public.clinics(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  role       text not null check (role in ('owner','doctor','reception')),
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (clinic_id, user_id)
);

create index if not exists clinic_members_user_idx   on public.clinic_members(user_id);
create index if not exists clinic_members_clinic_idx on public.clinic_members(clinic_id);

alter table public.clinic_members enable row level security;

-- helper: is user an active member of an active clinic?
create or replace function public.is_clinic_member(p_clinic_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.clinic_members m
    join public.clinics c on c.id = m.clinic_id
    where m.clinic_id = p_clinic_id
      and m.user_id   = auth.uid()
      and m.is_active = true
      and c.status    = 'active'
  );
$$;

-- helper: get role of current user in clinic
create or replace function public.my_clinic_role(p_clinic_id uuid)
returns text language sql stable security definer set search_path = public as $$
  select role from public.clinic_members
  where clinic_id = p_clinic_id and user_id = auth.uid() and is_active = true;
$$;

-- ============================================================
-- SECTION 8: CLINIC SETTINGS
-- ============================================================

create table if not exists public.settings (
  clinic_id      uuid primary key references public.clinics(id) on delete cascade,
  clinic_name    text not null default '',
  doctor_name    text not null default '',
  address        text not null default '',
  phone          text not null default '',
  price_new      int  not null default 200,
  price_followup int  not null default 100,
  updated_at     timestamptz not null default now()
);

alter table public.settings enable row level security;

-- ============================================================
-- SECTION 9: CLINIC_PATIENTS — BRIDGE (isolates clinics)
-- ============================================================
-- Each clinic registers which patients they serve.
-- A patient can be in many clinics, but clinics see only their own records.
-- local_notes = private clinic notes, NOT visible to patient.

create table if not exists public.clinic_patients (
  clinic_id   uuid not null references public.clinics(id) on delete cascade,
  patient_id  uuid not null references public.patients(id) on delete cascade,
  local_notes text not null default '',   -- clinic-private notes
  linked_at   timestamptz not null default now(),
  linked_by   uuid references auth.users(id) on delete set null,
  primary key (clinic_id, patient_id)
);

create index if not exists clinic_patients_patient_idx on public.clinic_patients(patient_id);
create index if not exists clinic_patients_clinic_idx  on public.clinic_patients(clinic_id);

alter table public.clinic_patients enable row level security;

-- ============================================================
-- SECTION 10: VISITS
-- ============================================================

create table if not exists public.visits (
  id           uuid primary key default gen_random_uuid(),
  clinic_id    uuid not null references public.clinics(id)  on delete cascade,
  patient_id   uuid not null references public.patients(id) on delete cascade,
  doctor_id    uuid references auth.users(id) on delete set null,

  ticket       int          not null,
  visit_type   visit_type   not null default 'new',
  status       visit_status not null default 'waiting',

  visit_date   date not null,
  visit_time   time not null,

  -- vital signs as flexible JSONB
  -- expected keys: weight_kg, height_cm, bp_systolic, bp_diastolic, pulse, temp_c, blood_sugar
  vital_signs  jsonb,

  diagnosis    text not null default '',
  prescription text not null default '',
  notes        text not null default '',

  price        int  not null default 0,
  paid         int  not null default 0,

  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists visits_clinic_date_status_idx
  on public.visits(clinic_id, visit_date, status, ticket);
create unique index if not exists visits_unique_ticket_per_day
  on public.visits(clinic_id, visit_date, ticket);
create index if not exists visits_patient_idx
  on public.visits(patient_id, visit_date desc);
create index if not exists visits_doctor_idx
  on public.visits(clinic_id, doctor_id, visit_date desc) where doctor_id is not null;

do $$ begin
  create trigger visits_set_updated_at
  before update on public.visits
  for each row execute function public.set_updated_at();
exception when duplicate_object then null; end $$;

alter table public.visits enable row level security;

-- ============================================================
-- SECTION 11: PAYMENTS
-- ============================================================

create table if not exists public.payments (
  id             uuid primary key default gen_random_uuid(),
  clinic_id      uuid not null references public.clinics(id)  on delete cascade,
  patient_id     uuid not null references public.patients(id) on delete cascade,
  visit_id       uuid references public.visits(id) on delete set null,

  amount         int            not null check (amount > 0),
  discount       int            not null default 0 check (discount >= 0),
  payment_method payment_method not null default 'cash',
  status         payment_status not null default 'paid',
  note           text           not null default '',

  created_at     timestamptz not null default now()
);

create index if not exists payments_clinic_patient_idx on public.payments(clinic_id, patient_id, created_at);
create index if not exists payments_clinic_visit_idx   on public.payments(clinic_id, visit_id);
create index if not exists payments_status_idx         on public.payments(clinic_id, status);

alter table public.payments enable row level security;

-- ============================================================
-- SECTION 12: DAILY COUNTERS (ticket numbering)
-- ============================================================

create table if not exists public.daily_counters (
  clinic_id   uuid not null references public.clinics(id) on delete cascade,
  day         date not null,
  last_ticket int  not null default 0,
  primary key (clinic_id, day)
);

alter table public.daily_counters enable row level security;

-- ============================================================
-- SECTION 13: AUDIT LOG — tracks all sensitive changes
-- ============================================================

create table if not exists public.audit_log (
  id          bigint generated always as identity primary key,
  table_name  text          not null,
  record_id   uuid          not null,
  action      audit_action  not null,
  old_data    jsonb,
  new_data    jsonb,
  changed_by  uuid references auth.users(id) on delete set null,
  changed_at  timestamptz   not null default now(),
  clinic_id   uuid          -- for filtering in admin reports
);

create index if not exists audit_log_table_record_idx on public.audit_log(table_name, record_id);
create index if not exists audit_log_changed_at_idx   on public.audit_log(changed_at desc);
create index if not exists audit_log_clinic_idx       on public.audit_log(clinic_id) where clinic_id is not null;
create index if not exists audit_log_user_idx         on public.audit_log(changed_by);

alter table public.audit_log enable row level security;

-- generic audit trigger function
create or replace function public.audit_trigger_fn()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_record_id uuid;
  v_clinic_id uuid;
begin
  -- extract id
  if TG_OP = 'DELETE' then
    v_record_id := (row_to_json(OLD)->>'id')::uuid;
  else
    v_record_id := (row_to_json(NEW)->>'id')::uuid;
  end if;

  -- extract clinic_id if present
  begin
    if TG_OP = 'DELETE' then
      v_clinic_id := (row_to_json(OLD)->>'clinic_id')::uuid;
    else
      v_clinic_id := (row_to_json(NEW)->>'clinic_id')::uuid;
    end if;
  exception when others then
    v_clinic_id := null;
  end;

  insert into public.audit_log (table_name, record_id, action, old_data, new_data, changed_by, clinic_id)
  values (
    TG_TABLE_NAME,
    v_record_id,
    TG_OP::audit_action,
    case when TG_OP = 'INSERT' then null else row_to_json(OLD)::jsonb end,
    case when TG_OP = 'DELETE' then null else row_to_json(NEW)::jsonb end,
    auth.uid(),
    v_clinic_id
  );
  return coalesce(NEW, OLD);
end $$;

-- attach audit trigger to sensitive tables
do $$ begin
  create trigger audit_patients
  after insert or update or delete on public.patients
  for each row execute function public.audit_trigger_fn();
exception when duplicate_object then null; end $$;

do $$ begin
  create trigger audit_patient_medical_info
  after insert or update or delete on public.patient_medical_info
  for each row execute function public.audit_trigger_fn();
exception when duplicate_object then null; end $$;

do $$ begin
  create trigger audit_visits
  after insert or update or delete on public.visits
  for each row execute function public.audit_trigger_fn();
exception when duplicate_object then null; end $$;

do $$ begin
  create trigger audit_payments
  after insert or update or delete on public.payments
  for each row execute function public.audit_trigger_fn();
exception when duplicate_object then null; end $$;

-- ============================================================
-- SECTION 14: RLS POLICIES
-- ============================================================

-- ---------- profiles ----------
do $$ begin
  if not exists (select 1 from pg_policies where tablename='profiles' and policyname='profiles_select_self') then
    execute $p$ create policy profiles_select_self on public.profiles for select to authenticated using (id = auth.uid()); $p$;
  end if;
end $$;
do $$ begin
  if not exists (select 1 from pg_policies where tablename='profiles' and policyname='profiles_select_admin') then
    execute $p$ create policy profiles_select_admin on public.profiles for select to authenticated using (public.is_admin()); $p$;
  end if;
end $$;

-- ---------- clinics ----------
do $$ begin
  if not exists (select 1 from pg_policies where tablename='clinics' and policyname='clinics_select_member') then
    execute $p$
      create policy clinics_select_member on public.clinics for select to authenticated
      using (exists (select 1 from public.clinic_members m where m.clinic_id = clinics.id and m.user_id = auth.uid()));
    $p$;
  end if;
end $$;
do $$ begin
  if not exists (select 1 from pg_policies where tablename='clinics' and policyname='clinics_select_admin') then
    execute $p$ create policy clinics_select_admin on public.clinics for select to authenticated using (public.is_admin()); $p$;
  end if;
end $$;
do $$ begin
  if not exists (select 1 from pg_policies where tablename='clinics' and policyname='clinics_update_admin') then
    execute $p$
      create policy clinics_update_admin on public.clinics for update to authenticated
      using (public.is_admin()) with check (public.is_admin());
    $p$;
  end if;
end $$;

-- ---------- clinic_members ----------
do $$ begin
  if not exists (select 1 from pg_policies where tablename='clinic_members' and policyname='clinic_members_select_self') then
    execute $p$ create policy clinic_members_select_self on public.clinic_members for select to authenticated using (user_id = auth.uid()); $p$;
  end if;
end $$;
do $$ begin
  if not exists (select 1 from pg_policies where tablename='clinic_members' and policyname='clinic_members_select_member') then
    execute $p$ create policy clinic_members_select_member on public.clinic_members for select to authenticated using (public.is_clinic_member(clinic_id)); $p$;
  end if;
end $$;
do $$ begin
  if not exists (select 1 from pg_policies where tablename='clinic_members' and policyname='clinic_members_select_admin') then
    execute $p$ create policy clinic_members_select_admin on public.clinic_members for select to authenticated using (public.is_admin()); $p$;
  end if;
end $$;

-- ---------- settings ----------
do $$ begin
  if not exists (select 1 from pg_policies where tablename='settings' and policyname='settings_select_member') then
    execute $p$ create policy settings_select_member on public.settings for select to authenticated using (public.is_clinic_member(clinic_id)); $p$;
  end if;
end $$;
do $$ begin
  if not exists (select 1 from pg_policies where tablename='settings' and policyname='settings_update_member') then
    execute $p$
      create policy settings_update_member on public.settings for update to authenticated
      using (public.is_clinic_member(clinic_id)) with check (public.is_clinic_member(clinic_id));
    $p$;
  end if;
end $$;
do $$ begin
  if not exists (select 1 from pg_policies where tablename='settings' and policyname='settings_select_admin') then
    execute $p$ create policy settings_select_admin on public.settings for select to authenticated using (public.is_admin()); $p$;
  end if;
end $$;

-- ---------- patients ----------
-- patient can read/update their own record
do $$ begin
  if not exists (select 1 from pg_policies where tablename='patients' and policyname='patients_select_self') then
    execute $p$ create policy patients_select_self on public.patients for select to authenticated using (user_id = auth.uid()); $p$;
  end if;
end $$;
do $$ begin
  if not exists (select 1 from pg_policies where tablename='patients' and policyname='patients_update_self') then
    execute $p$
      create policy patients_update_self on public.patients for update to authenticated
      using (user_id = auth.uid()) with check (user_id = auth.uid());
    $p$;
  end if;
end $$;
-- guardian can read/update their dependents
do $$ begin
  if not exists (select 1 from pg_policies where tablename='patients' and policyname='patients_select_guardian') then
    execute $p$
      create policy patients_select_guardian on public.patients for select to authenticated
      using (exists (
        select 1 from public.patients me
        where me.user_id = auth.uid() and me.id = patients.guardian_id
      ));
    $p$;
  end if;
end $$;
do $$ begin
  if not exists (select 1 from pg_policies where tablename='patients' and policyname='patients_update_guardian') then
    execute $p$
      create policy patients_update_guardian on public.patients for update to authenticated
      using (exists (
        select 1 from public.patients me
        where me.user_id = auth.uid() and me.id = patients.guardian_id
      ));
    $p$;
  end if;
end $$;
-- clinic member can read patients in their clinic
do $$ begin
  if not exists (select 1 from pg_policies where tablename='patients' and policyname='patients_select_clinic') then
    execute $p$
      create policy patients_select_clinic on public.patients for select to authenticated
      using (exists (
        select 1 from public.clinic_patients cp
        join public.clinic_members cm on cm.clinic_id = cp.clinic_id
        where cp.patient_id = patients.id
          and cm.user_id = auth.uid()
          and cm.is_active = true
      ));
    $p$;
  end if;
end $$;
-- clinic member (owner/reception) can insert new patients via RPC
do $$ begin
  if not exists (select 1 from pg_policies where tablename='patients' and policyname='patients_insert_clinic') then
    execute $p$
      create policy patients_insert_clinic on public.patients for insert to authenticated
      with check (true);
    $p$;
  end if;
end $$;
-- admin sees all
do $$ begin
  if not exists (select 1 from pg_policies where tablename='patients' and policyname='patients_select_admin') then
    execute $p$ create policy patients_select_admin on public.patients for select to authenticated using (public.is_admin()); $p$;
  end if;
end $$;

-- ---------- patient_medical_info ----------
-- patient can read/update their own
do $$ begin
  if not exists (select 1 from pg_policies where tablename='patient_medical_info' and policyname='pmi_self') then
    execute $p$
      create policy pmi_self on public.patient_medical_info for all to authenticated
      using (exists (select 1 from public.patients p where p.id = patient_id and p.user_id = auth.uid()))
      with check (exists (select 1 from public.patients p where p.id = patient_id and p.user_id = auth.uid()));
    $p$;
  end if;
end $$;
-- guardian can read/update their dependents
do $$ begin
  if not exists (select 1 from pg_policies where tablename='patient_medical_info' and policyname='pmi_guardian') then
    execute $p$
      create policy pmi_guardian on public.patient_medical_info for all to authenticated
      using (exists (
        select 1 from public.patients child
        join public.patients guardian on guardian.id = child.guardian_id
        where child.id = patient_id and guardian.user_id = auth.uid()
      ))
      with check (exists (
        select 1 from public.patients child
        join public.patients guardian on guardian.id = child.guardian_id
        where child.id = patient_id and guardian.user_id = auth.uid()
      ));
    $p$;
  end if;
end $$;
-- clinic member (of a clinic that has this patient) can read AND update
do $$ begin
  if not exists (select 1 from pg_policies where tablename='patient_medical_info' and policyname='pmi_clinic_select') then
    execute $p$
      create policy pmi_clinic_select on public.patient_medical_info for select to authenticated
      using (exists (
        select 1 from public.clinic_patients cp
        join public.clinic_members cm on cm.clinic_id = cp.clinic_id
        where cp.patient_id = patient_medical_info.patient_id
          and cm.user_id = auth.uid() and cm.is_active = true
      ));
    $p$;
  end if;
end $$;
do $$ begin
  if not exists (select 1 from pg_policies where tablename='patient_medical_info' and policyname='pmi_clinic_update') then
    execute $p$
      create policy pmi_clinic_update on public.patient_medical_info for update to authenticated
      using (exists (
        select 1 from public.clinic_patients cp
        join public.clinic_members cm on cm.clinic_id = cp.clinic_id
        where cp.patient_id = patient_medical_info.patient_id
          and cm.user_id = auth.uid() and cm.is_active = true
      ));
    $p$;
  end if;
end $$;
do $$ begin
  if not exists (select 1 from pg_policies where tablename='patient_medical_info' and policyname='pmi_select_admin') then
    execute $p$ create policy pmi_select_admin on public.patient_medical_info for select to authenticated using (public.is_admin()); $p$;
  end if;
end $$;

-- ---------- clinic_patients ----------
do $$ begin
  if not exists (select 1 from pg_policies where tablename='clinic_patients' and policyname='cp_crud_member') then
    execute $p$
      create policy cp_crud_member on public.clinic_patients for all to authenticated
      using (public.is_clinic_member(clinic_id)) with check (public.is_clinic_member(clinic_id));
    $p$;
  end if;
end $$;
do $$ begin
  if not exists (select 1 from pg_policies where tablename='clinic_patients' and policyname='cp_select_admin') then
    execute $p$ create policy cp_select_admin on public.clinic_patients for select to authenticated using (public.is_admin()); $p$;
  end if;
end $$;

-- ---------- visits ----------
do $$ begin
  if not exists (select 1 from pg_policies where tablename='visits' and policyname='visits_crud_member') then
    execute $p$
      create policy visits_crud_member on public.visits for all to authenticated
      using (public.is_clinic_member(clinic_id)) with check (public.is_clinic_member(clinic_id));
    $p$;
  end if;
end $$;
-- patient can read their own visits (across all clinics they've been to)
do $$ begin
  if not exists (select 1 from pg_policies where tablename='visits' and policyname='visits_select_self') then
    execute $p$
      create policy visits_select_self on public.visits for select to authenticated
      using (exists (select 1 from public.patients p where p.id = patient_id and p.user_id = auth.uid()));
    $p$;
  end if;
end $$;
do $$ begin
  if not exists (select 1 from pg_policies where tablename='visits' and policyname='visits_select_admin') then
    execute $p$ create policy visits_select_admin on public.visits for select to authenticated using (public.is_admin()); $p$;
  end if;
end $$;

-- ---------- payments ----------
do $$ begin
  if not exists (select 1 from pg_policies where tablename='payments' and policyname='payments_crud_member') then
    execute $p$
      create policy payments_crud_member on public.payments for all to authenticated
      using (public.is_clinic_member(clinic_id)) with check (public.is_clinic_member(clinic_id));
    $p$;
  end if;
end $$;
do $$ begin
  if not exists (select 1 from pg_policies where tablename='payments' and policyname='payments_select_self') then
    execute $p$
      create policy payments_select_self on public.payments for select to authenticated
      using (exists (select 1 from public.patients p where p.id = patient_id and p.user_id = auth.uid()));
    $p$;
  end if;
end $$;
do $$ begin
  if not exists (select 1 from pg_policies where tablename='payments' and policyname='payments_select_admin') then
    execute $p$ create policy payments_select_admin on public.payments for select to authenticated using (public.is_admin()); $p$;
  end if;
end $$;

-- ---------- daily_counters ----------
do $$ begin
  if not exists (select 1 from pg_policies where tablename='daily_counters' and policyname='dc_crud_member') then
    execute $p$
      create policy dc_crud_member on public.daily_counters for all to authenticated
      using (public.is_clinic_member(clinic_id)) with check (public.is_clinic_member(clinic_id));
    $p$;
  end if;
end $$;
do $$ begin
  if not exists (select 1 from pg_policies where tablename='daily_counters' and policyname='dc_select_admin') then
    execute $p$ create policy dc_select_admin on public.daily_counters for select to authenticated using (public.is_admin()); $p$;
  end if;
end $$;

-- ---------- audit_log — admin only ----------
do $$ begin
  if not exists (select 1 from pg_policies where tablename='audit_log' and policyname='audit_select_admin') then
    execute $p$ create policy audit_select_admin on public.audit_log for select to authenticated using (public.is_admin()); $p$;
  end if;
end $$;

-- ============================================================
-- SECTION 15: RPCs
-- ============================================================

-- find_or_create_patient:
-- Used by clinic reception when registering a new visit.
-- Looks up by phone OR national_id. If not found, creates new patient.
-- Then ensures clinic_patients link exists.
drop function if exists public.find_or_create_patient(uuid, text, text, text, text);
create or replace function public.find_or_create_patient(
  p_clinic_id    uuid,
  p_name         text,
  p_phone        text   default '',
  p_national_id  text   default null,
  p_address      text   default ''
)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_patient_id uuid;
begin
  if not public.is_clinic_member(p_clinic_id) then
    raise exception 'Not a clinic member';
  end if;

  -- try to find by phone first
  if p_phone <> '' then
    select id into v_patient_id from public.patients where phone = p_phone limit 1;
  end if;

  -- try by national_id if not found
  if v_patient_id is null and p_national_id is not null and p_national_id <> '' then
    select id into v_patient_id from public.patients where national_id = p_national_id limit 1;
  end if;

  -- not found — create new patient
  if v_patient_id is null then
    insert into public.patients (name, phone, national_id, address)
    values (
      trim(p_name),
      coalesce(nullif(trim(p_phone), ''), ''),
      nullif(trim(coalesce(p_national_id, '')), ''),
      coalesce(p_address, '')
    )
    returning id into v_patient_id;

    -- create empty medical info record
    insert into public.patient_medical_info (patient_id)
    values (v_patient_id)
    on conflict do nothing;
  end if;

  -- ensure clinic link exists
  insert into public.clinic_patients (clinic_id, patient_id, linked_by)
  values (p_clinic_id, v_patient_id, auth.uid())
  on conflict do nothing;

  return v_patient_id;
end $$;

-- link_patient_to_auth:
-- Called when a patient registers on the app.
-- Links their auth account to an existing patient record by phone or national_id.
create or replace function public.link_patient_to_auth()
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_user_id  uuid := auth.uid();
  v_phone    text;
  v_patient  uuid;
begin
  select phone into v_phone from public.profiles where id = v_user_id;

  select id into v_patient from public.patients
  where phone = v_phone and user_id is null
  limit 1;

  if v_patient is not null then
    update public.patients set user_id = v_user_id where id = v_patient;
  end if;
end $$;

-- allocate_ticket: atomically get next ticket number
create or replace function public.allocate_ticket(p_clinic_id uuid, p_day date)
returns int language plpgsql security definer set search_path = public as $$
declare v_ticket int; begin
  if not public.is_clinic_member(p_clinic_id) then raise exception 'Not a clinic member'; end if;
  insert into public.daily_counters (clinic_id, day, last_ticket) values (p_clinic_id, p_day, 0)
  on conflict (clinic_id, day) do nothing;
  update public.daily_counters set last_ticket = last_ticket + 1
  where clinic_id = p_clinic_id and day = p_day
  returning last_ticket into v_ticket;
  return v_ticket;
end $$;

-- call_next: advance queue
create or replace function public.call_next(p_clinic_id uuid, p_day date)
returns table (visit_id uuid) language plpgsql security definer set search_path = public as $$
declare v_next uuid; begin
  if not public.is_clinic_member(p_clinic_id) then raise exception 'Not a clinic member'; end if;
  update public.visits set status = 'done'
  where clinic_id = p_clinic_id and visit_date = p_day and status = 'serving';
  select v.id into v_next from public.visits v
  where v.clinic_id = p_clinic_id and v.visit_date = p_day and v.status = 'waiting'
  order by v.ticket asc limit 1 for update;
  if v_next is null then return; end if;
  update public.visits set status = 'serving' where id = v_next;
  return query select v_next;
end $$;

-- create_clinic_for_owner
drop function if exists public.create_clinic_for_owner(text, text, text, text);
create or replace function public.create_clinic_for_owner(
  p_clinic_name text, p_doctor_name text, p_address text default '', p_phone text default ''
)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_clinic_id uuid;
  v_name      text := trim(p_clinic_name);
  v_doctor    text := trim(p_doctor_name);
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  if v_name   = '' then raise exception 'Clinic name is required'; end if;
  if v_doctor = '' then raise exception 'Doctor name is required'; end if;
  insert into public.clinics (name, requested_by) values (v_name, auth.uid()) returning id into v_clinic_id;
  insert into public.clinic_members (clinic_id, user_id, role) values (v_clinic_id, auth.uid(), 'owner');
  insert into public.settings (clinic_id, clinic_name, doctor_name, address, phone)
  values (v_clinic_id, v_name, v_doctor, coalesce(p_address,''), coalesce(p_phone,''));
  return v_clinic_id;
end $$;

-- approve / reject clinic (admin only)
create or replace function public.approve_clinic(p_clinic_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Not an admin'; end if;
  update public.clinics set status='active', approved_by=auth.uid(), approved_at=now(),
    rejected_by=null, rejected_at=null, rejection_reason='' where id=p_clinic_id;
end $$;

create or replace function public.reject_clinic(p_clinic_id uuid, p_reason text default '')
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Not an admin'; end if;
  update public.clinics set status='rejected', rejected_by=auth.uid(), rejected_at=now(),
    rejection_reason=coalesce(p_reason,''), approved_by=null, approved_at=null where id=p_clinic_id;
end $$;

-- ============================================================
-- SECTION 16: GRANTS
-- ============================================================

grant usage on schema public to authenticated;

grant select                        on public.profiles             to authenticated;
grant select                        on public.clinics              to authenticated;
grant select                        on public.clinic_members       to authenticated;
grant select, update                on public.settings             to authenticated;
grant select, insert, update        on public.patients             to authenticated;
grant select, insert, update        on public.patient_medical_info to authenticated;
grant select, insert, update, delete on public.clinic_patients     to authenticated;
grant select, insert, update, delete on public.visits              to authenticated;
grant select, insert, update, delete on public.payments            to authenticated;
grant select, insert, update, delete on public.daily_counters      to authenticated;
grant select                        on public.audit_log            to authenticated;

grant execute on function public.is_admin()                                           to authenticated;
grant execute on function public.is_clinic_member(uuid)                               to authenticated;
grant execute on function public.my_clinic_role(uuid)                                 to authenticated;
grant execute on function public.find_or_create_patient(uuid,text,text,text,text)     to authenticated;
grant execute on function public.link_patient_to_auth()                               to authenticated;
grant execute on function public.allocate_ticket(uuid,date)                           to authenticated;
grant execute on function public.call_next(uuid,date)                                 to authenticated;
grant execute on function public.create_clinic_for_owner(text,text,text,text)         to authenticated;
grant execute on function public.approve_clinic(uuid)                                 to authenticated;
grant execute on function public.reject_clinic(uuid,text)                             to authenticated;

-- ============================================================
-- SECTION 17: REALTIME
-- ============================================================

do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin alter publication supabase_realtime add table public.visits;
    exception when duplicate_object then null; end;
  end if;
end $$;

commit;

-- ============================================================
-- SCHEMA SUMMARY
-- ============================================================
-- Tables (12):
--   app_admins · profiles · patients · patient_medical_info
--   clinics · clinic_members · settings · clinic_patients
--   visits · payments · daily_counters · audit_log
--
-- Key design decisions:
--   · patients is GLOBAL — no clinic_id — one record per person
--   · phone + national_id are globally unique identifiers
--   · clinic_patients bridges patients ↔ clinics (isolation via RLS)
--   · guardian_id self-reference handles children & elderly
--   · user_id nullable — patient may exist before registering
--   · audit_log tracks all changes to patients/medical/visits/payments
--   · vital_signs = JSONB (flexible, clinic-agnostic)
--   · payment_method + discount + status on payments
--   · doctor_id on visits
--   · is_active on clinic_members (soft-disable without deleting)
