-- =============================================================
-- 14-fix-rls.sql
-- Fix 1: Ensure is_clinic_member() has SECURITY DEFINER so
--         it bypasses RLS when querying clinic_members,
--         preventing infinite RLS recursion.
-- Fix 2: Simplify patients_select_clinic policy to call
--         is_clinic_member() (which is SECURITY DEFINER) instead
--         of directly joining clinic_members (which triggers its
--         own RLS and re-enters the recursion chain).
-- Fix 3: Fix audit_trigger_fn — TG_OP is uppercase but
--         audit_action enum values are lowercase.
-- =============================================================

-- ---------------------------------------------------------------
-- FIX 1: is_clinic_member — add SECURITY DEFINER + search_path
-- ---------------------------------------------------------------
create or replace function public.is_clinic_member(p_clinic_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
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

-- ---------------------------------------------------------------
-- FIX 2: patients_select_clinic — use is_clinic_member()
--         instead of a raw join that triggers clinic_members RLS
-- ---------------------------------------------------------------
drop policy if exists patients_select_clinic on public.patients;

create policy patients_select_clinic on public.patients
for select to authenticated
using (
  exists (
    select 1 from public.clinic_patients cp
    where cp.patient_id = patients.id
      and public.is_clinic_member(cp.clinic_id)
  )
);

-- ---------------------------------------------------------------
-- FIX 3: audit_trigger_fn — two bugs fixed:
--   a) lower(TG_OP) — TG_OP is uppercase; audit_action enum is lowercase
--   b) record_id via row_to_json — some tables use patient_id/clinic_id
--      as PK (not "id"), so OLD.id / NEW.id crashes on those tables.
--      row_to_json(...) ->> 'id' returns NULL safely when field is absent.
-- ---------------------------------------------------------------
create or replace function public.audit_trigger_fn()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row       jsonb;
  v_clinic_id uuid;
  v_record_id uuid;
begin
  -- Serialize the relevant row to JSON so we can extract fields safely
  -- regardless of whether the table has an "id" column or not.
  if TG_OP = 'DELETE' then
    v_row := to_jsonb(OLD);
  else
    v_row := to_jsonb(NEW);
  end if;

  -- Prefer "id" as record identifier; fall back to "patient_id" for tables
  -- like patient_medical_info whose PK is patient_id.
  v_record_id := coalesce(
    (v_row ->> 'id')::uuid,
    (v_row ->> 'patient_id')::uuid
  );

  -- clinic_id may not exist on every table — null is fine.
  v_clinic_id := (v_row ->> 'clinic_id')::uuid;

  insert into public.audit_log(
    table_name, record_id, action,
    old_data, new_data,
    changed_by, changed_at, clinic_id
  )
  values (
    TG_TABLE_NAME,
    v_record_id,
    lower(TG_OP)::public.audit_action,
    case TG_OP when 'INSERT' then null else to_jsonb(OLD) end,
    case TG_OP when 'DELETE' then null else to_jsonb(NEW) end,
    auth.uid(),
    now(),
    v_clinic_id
  );

  return coalesce(NEW, OLD);
end;
$$;
