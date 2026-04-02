-- ============================================================
-- 13-rls-fixes.sql
-- RLS & trigger fixes applied directly to Supabase during
-- debugging (2026-04-02). These are NOT migrations — they were
-- applied manually. Document here so future agents know the
-- current DB state diverges from 11-master-schema.sql in these
-- specific places.
-- ============================================================

-- ------------------------------------------------------------
-- 1. audit_trigger_fn — fixed TG_OP casing + missing id guard
-- ------------------------------------------------------------
-- Problem: TG_OP returns uppercase ('INSERT'/'UPDATE'/'DELETE')
--          but the original used mixed case. Also crashed when
--          table had no `id` column.
-- Fix applied:
CREATE OR REPLACE FUNCTION audit_trigger_fn()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_record_id uuid;
  v_clinic_id  uuid;
BEGIN
  -- Safely read id (NULL if column doesn't exist on this table)
  BEGIN
    IF TG_OP = 'DELETE' THEN
      v_record_id := OLD.id;
    ELSE
      v_record_id := NEW.id;
    END IF;
  EXCEPTION WHEN undefined_column THEN
    v_record_id := NULL;
  END;

  -- Safely read clinic_id (not all audited tables have it)
  BEGIN
    IF TG_OP = 'DELETE' THEN
      v_clinic_id := OLD.clinic_id;
    ELSE
      v_clinic_id := NEW.clinic_id;
    END IF;
  EXCEPTION WHEN undefined_column THEN
    v_clinic_id := NULL;
  END;

  INSERT INTO audit_log (
    table_name, record_id, action,
    old_data, new_data, changed_by, clinic_id
  ) VALUES (
    TG_TABLE_NAME,
    v_record_id,
    lower(TG_OP)::audit_action,   -- <-- lower() is the fix
    CASE WHEN TG_OP = 'DELETE' OR TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN to_jsonb(NEW) ELSE NULL END,
    auth.uid(),
    v_clinic_id
  );
  RETURN NULL;
END;
$$;

-- ------------------------------------------------------------
-- 2. is_clinic_member — rebuilt with SECURITY DEFINER
-- ------------------------------------------------------------
-- Problem: the original SECURITY INVOKER function caused RLS
--          recursion when called from within RLS policies.
-- Fix: rebuild as SECURITY DEFINER so it runs as the function
--      owner (bypasses RLS on clinic_members).
CREATE OR REPLACE FUNCTION is_clinic_member(p_clinic_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM   clinic_members cm
    JOIN   clinics c ON c.id = cm.clinic_id
    WHERE  cm.clinic_id  = p_clinic_id
    AND    cm.user_id    = auth.uid()
    AND    cm.is_active  = true
    AND    c.status      = 'active'
  );
END;
$$;

-- ------------------------------------------------------------
-- 3. visits RLS — rebuilt without is_clinic_member() call
-- ------------------------------------------------------------
-- Problem: calling is_clinic_member() from visits RLS caused
--          infinite recursion through clinic_members RLS.
-- Fix: inline the membership check directly using a JOIN.

-- Drop old policy
DROP POLICY IF EXISTS visits_crud_member ON visits;

-- New policy — direct join, no helper function call
CREATE POLICY visits_crud_member ON visits
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM   clinic_members cm
      JOIN   clinics c ON c.id = cm.clinic_id
      WHERE  cm.clinic_id = visits.clinic_id
      AND    cm.user_id   = auth.uid()
      AND    cm.is_active = true
      AND    c.status     = 'active'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM   clinic_members cm
      JOIN   clinics c ON c.id = cm.clinic_id
      WHERE  cm.clinic_id = visits.clinic_id
      AND    cm.user_id   = auth.uid()
      AND    cm.is_active = true
      AND    c.status     = 'active'
    )
  );

-- ------------------------------------------------------------
-- 4. clinic_members RLS — removed recursive policy
-- ------------------------------------------------------------
-- Problem: clinic_members_select_member used is_clinic_member()
--          which reads clinic_members → infinite recursion.
-- Fix: drop that policy entirely. Keep only:
--   - clinic_members_select_self  (user sees own rows)
--   - clinic_members_select_admin (admin sees all)

DROP POLICY IF EXISTS clinic_members_select_member ON clinic_members;

-- Verify the remaining policies still exist (no-op if already present):
-- clinic_members_select_self: WHERE user_id = auth.uid()
-- clinic_members_select_admin: WHERE is_admin()

-- ------------------------------------------------------------
-- 5. patients RLS — patients_select_clinic rebuilt
-- ------------------------------------------------------------
-- Problem: called is_clinic_member() → recursion.
-- Fix: inline the join.

DROP POLICY IF EXISTS patients_select_clinic ON patients;

CREATE POLICY patients_select_clinic ON patients
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM   clinic_patients cp
      JOIN   clinic_members cm ON cm.clinic_id = cp.clinic_id
      JOIN   clinics c         ON c.id         = cp.clinic_id
      WHERE  cp.patient_id = patients.id
      AND    cm.user_id    = auth.uid()
      AND    cm.is_active  = true
      AND    c.status      = 'active'
    )
  );

-- ------------------------------------------------------------
-- 6. clinic_patients RLS — cp_crud_member rebuilt
-- ------------------------------------------------------------
-- Problem: called is_clinic_member() → recursion.
-- Fix: inline the join.

DROP POLICY IF EXISTS cp_crud_member ON clinic_patients;

CREATE POLICY cp_crud_member ON clinic_patients
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM   clinic_members cm
      JOIN   clinics c ON c.id = cm.clinic_id
      WHERE  cm.clinic_id = clinic_patients.clinic_id
      AND    cm.user_id   = auth.uid()
      AND    cm.is_active = true
      AND    c.status     = 'active'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM   clinic_members cm
      JOIN   clinics c ON c.id = cm.clinic_id
      WHERE  cm.clinic_id = clinic_patients.clinic_id
      AND    cm.user_id   = auth.uid()
      AND    cm.is_active = true
      AND    c.status     = 'active'
    )
  );

-- ============================================================
-- CODEBASE FIXES (applied in TypeScript, not SQL)
-- ============================================================
-- The following queries were also broken because they filtered
-- patients by clinic_id — a column that does NOT exist on the
-- patients table (patients is a global table; clinic isolation
-- is done via clinic_patients + RLS).
--
-- Fixed in:
--   src/lib/actions/clinic/reports.ts
--     .from("patients").select("id, name")
--     removed: .eq("clinic_id", clinicId)   ← was invalid
--
--   src/lib/actions/clinic/billing/getVisitBilling.ts
--     .from("patients").select("id, name, phone, address")
--     removed: .eq("clinic_id", clinicId)   ← was invalid
--
-- In both cases, RLS (patients_select_clinic above) correctly
-- restricts which patients are visible — no app-level filter
-- on clinic_id is needed or valid.
-- ============================================================
