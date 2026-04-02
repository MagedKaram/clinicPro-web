# Admin Console — TODO + Notes (Living Doc)

> Update this file every time we ship a new admin feature.
> هدف الملف: نخلي كل المراحل + ملاحظات الـ DB/RLS قدامنا عشان مننساش.

## Current Status (April 1, 2026)

### ✅ Done

- Admin approvals flow (pending → approve/reject) + secure gating.
- Admin dashboard (metrics + charts) + approvals view.
- Clinics list + clinic details.
- Clinic activate/deactivate buttons (mapped to approve/reject RPCs).
- Doctors list (unique users from `clinic_members`).
- Doctor details page (memberships + profile info).
- Patients list (cross-clinic).
- i18n coverage (AR/EN) for admin screens.
- Lint/build verified for current phase.

### ⏭ Next Up (Choose one)

- Patient details page + visits history.
- Clinic members CRUD (admin) + roles/permissions.

## UX Notes

- Sidebar: Fixed layout issue by correcting Tailwind grid template columns (invalid comma prevented 2-column layout).
- Design rules: tokens-only (no hard-coded colors), Server Components by default.

## Data / Security Notes (Supabase)

### Tables involved

- `clinics` has `status` enum: `pending | active | rejected`.
- `clinic_members` roles: `owner | doctor | reception`.
- `profiles` is a public mirror of auth emails.

### Important behavior today

- “Deactivate clinic” currently maps to `reject_clinic` → status becomes `rejected`.
  - If we want a true `inactive` state later: needs enum change + migration + UI updates.

### Admin capabilities vs RLS

- Listing pages work because admin policies / definer functions allow reads.
- True CRUD (update members/settings) should be done via:
  1. Security definer RPCs (recommended), OR
  2. Tight admin-only RLS policies for specific ops.

## Roadmap (Phased)

### Phase B — Patient Details

- Route: `/[locale]/admin/patients/[patientId]`
- Show: profile + clinic + visits + payments summary.
- Needs: safe query joins (`patients` → `visits` → `payments`).

### Phase C — Visits

- Route: `/[locale]/admin/visits`
- Minimal filters: date range + clinic + status.

### Phase D — Payments

- Route: `/[locale]/admin/payments`
- Daily totals + clinic totals.

### Phase E — Settings (Admin view)

- Route: `/[locale]/admin/settings` or under clinic details.
- Likely edit settings per clinic (requires RPC).

### Phase F — Members CRUD

- Add/Remove member, change role, enforce constraints.
- Add RPCs:
  - `admin_add_member(clinic_id, user_id, role)`
  - `admin_remove_member(clinic_id, user_id)`
  - `admin_set_member_role(clinic_id, user_id, role)`

### Phase G — Audit Log

- Table: `admin_audit_log` (who, what, target id, before/after JSON, timestamp).
- RPCs append audit rows.

### Phase H — Search + Pagination

- Simple search across clinics/doctors/patients.
- Pagination for large datasets.

### Later — Owner unified patients (no duplicates)

- Needs patient identity strategy (phone normalization, national id, or account-linking).

### Later — Patient accounts + auth linking

- Decide linking: `patient_id` ↔ `auth.user_id` mapping (multi-clinic).
