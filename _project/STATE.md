# PROJECT_STATE.md — Clinic Queue SaaS

> **Single source of truth** for the Clinic Queue project.
> Last updated: 2026-04-02
> Build status: ✅ Clean (zero errors, zero warnings)

---

## 1. PROJECT OVERVIEW

**Clinic Queue** is a multi-clinic SaaS queue management system. Originated as a Flask + SQLite + Socket.IO monolith; migrated to a modern Next.js + Supabase stack.

### What It Does
- Clinics register and await admin approval before going live
- Reception staff register patients, issue queue tickets, track payments
- Doctors examine patients, fill diagnosis/prescription/notes, mark visits done
- A display screen shows the live queue to patients in the waiting room
- An admin console lets super-admins approve clinics, view metrics, manage users

### Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js (App Router) | 16.2.1 |
| UI Runtime | React | 19.2.4 |
| Language | TypeScript (strict) | ^5 |
| Styling | Tailwind CSS v4 (CSS-first tokens) | ^4 |
| Animation | Framer Motion | ^12.38.0 |
| i18n | next-intl | ^4.8.3 |
| Database | Supabase (PostgreSQL + RLS + Realtime) | — |
| Auth | Supabase Auth (email/password) | — |
| Supabase SSR | @supabase/ssr | ^0.9.0 |
| Supabase JS | @supabase/supabase-js | ^2.100.0 |
| Class helpers | clsx + tailwind-merge | ^2/^3 |
| Package manager | pnpm | — |

### Working Directory
```
e:\clinic_queue\website\web\    ← Next.js app root
e:\clinic_queue\website\docs\   ← SQL schema files
e:\clinic_queue\website\        ← Repo root (PROGRESS.md, CLAUDE.md, PRD.md)
```

---

## 2. FULL ROUTE MAP

All routes are under `src/app/[locale]/` where `locale` ∈ `{ar, en}` (default: `ar`).

### Public / Auth Routes

| Route | File | Description | Access |
|-------|------|-------------|--------|
| `/` | `app/page.tsx` | Redirects to `/[locale]` | Public |
| `/[locale]` | `app/[locale]/page.tsx` | Redirects to `/[locale]/landing` | Public |
| `/[locale]/landing` | `(marketing)/landing/page.tsx` | Marketing landing page (Hero, Features, Pricing) | Public |
| `/[locale]/features` | `(marketing)/features/page.tsx` | Feature details page | Public |
| `/[locale]/pricing` | `(marketing)/pricing/page.tsx` | Pricing plans | Public |
| `/[locale]/buy` | `(marketing)/buy/page.tsx` | Purchase flow (stub) | Public |
| `/[locale]/login` | `login/page.tsx` → `LoginClient` | Email/password login. Routes admins to `/admin`, pending clinics to `/clinic-status` | Public |
| `/[locale]/signup` | `signup/page.tsx` → `SignupClient` | 3-step form: Step 1 account (email+password), Step 2 clinic info (name, address, phone, prices), Step 3 doctor info (full_name, specialty, license, bio). Supports `?mode=clinic-only` to skip Step 1 for re-applicants. | Public |
| `/[locale]/forgot-password` | `forgot-password/page.tsx` | Send password reset email | Public |
| `/[locale]/reset-password` | `reset-password/page.tsx` | Set new password (from email link) | Public |
| `/[locale]/clinic-status` | `clinic-status/page.tsx` | Shows pending/rejected status with reason. Rejected clinics get "إعادة التقديم" button → `/signup?mode=clinic-only`. Redirects active clinics to `/reception` | Authenticated |

### App Routes (Clinic Required)

All guarded by `requireActiveClinicId({ locale })` — redirects if not authenticated, no membership, or clinic not active.

| Route | File | Description | Access |
|-------|------|-------------|--------|
| `/[locale]/reception` | `reception/page.tsx` → `ReceptionClient` | Main app: queue list, patient registration, billing, settings, daily balance | reception / owner |
| `/[locale]/doctor` | `doctor/page.tsx` → `DoctorClient` | Doctor dashboard: call next, current patient, exam form, medical history, patient search | doctor / owner |
| `/[locale]/display` | `display/page.tsx` → `DisplayClient` | Waiting room TV: current ticket, waiting list, ticker. Realtime updates | Any authenticated member |
| `/[locale]/reports` | `reports/page.tsx` | Stub page — "coming soon" | Any authenticated member |

### Admin Console Routes

All guarded by `requireAdminServer(locale)` — redirects non-admins to `/login`.

| Route | File | Description | Access |
|-------|------|-------------|--------|
| `/[locale]/admin` | `admin/page.tsx` | Dashboard (metrics + charts) or Approvals panel (via `?view=approvals`). Contains inline `approveAction` / `rejectAction` server actions | app_admins only |
| `/[locale]/admin/clinics` | `admin/clinics/page.tsx` | List all clinics with status badges. Links to details | app_admins only |
| `/[locale]/admin/clinics/[clinicId]` | `admin/clinics/[clinicId]/page.tsx` | Clinic details: name, status, members list. Activate/Deactivate buttons (via `approve_clinic` / `reject_clinic` RPCs) | app_admins only |
| `/[locale]/admin/doctors` | `admin/doctors/page.tsx` | Unique users from `clinic_members` (role=doctor\|owner). Shows clinic count per user | app_admins only |
| `/[locale]/admin/doctors/[userId]` | `admin/doctors/[userId]/page.tsx` | Doctor profile, email from `profiles`, all memberships with clinic status | app_admins only |
| `/[locale]/admin/patients` | `admin/patients/page.tsx` | Cross-clinic patient list (limit 200, ordered by created_at desc) | app_admins only |
| `/[locale]/admin/patients/[patientId]` | `admin/patients/[patientId]/page.tsx` | Patient detail: demographics, medical info, guardian/dependents, clinics visited, visit history, payments summary | app_admins only |
| `/[locale]/admin/visits` | *(planned — Group D)* | Admin visits table with filters (date, clinic, doctor, status, visit_type) | app_admins only |
| `/[locale]/admin/payments` | *(planned — Group D)* | Admin payments table with filters (date, clinic, method, status), footer totals | app_admins only |
| `/[locale]/admin/audit-log` | *(planned — Group D)* | Audit log viewer (table, action, who, when, diff) | app_admins only |

---

## 3. DATABASE SCHEMA

### Live Schema: docs/11-master-schema.sql + docs/12-migrate-doctor-profiles.sql

> ✅ Master schema v3 is the **deployed production schema**. All code has been updated to match.

#### Enums
```sql
visit_status     : 'waiting' | 'serving' | 'done'
visit_type       : 'new' | 'followup'
clinic_status    : 'pending' | 'active' | 'rejected'
gender_type      : 'male' | 'female'
blood_type_enum  : 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-'
payment_method   : 'cash' | 'card' | 'transfer'
payment_status   : 'paid' | 'partial' | 'pending'
audit_action     : 'INSERT' | 'UPDATE' | 'DELETE'
```

#### Tables

**`app_admins`** — privileged system users (no direct authenticated read)
| Column | Type | Notes |
|--------|------|-------|
| user_id | uuid PK | refs auth.users |
| created_at | timestamptz | |

RLS: No SELECT policy for authenticated users — only accessible via `is_admin()` security definer function.

---

**`profiles`** — public mirror of auth.users (auto-populated via trigger)
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | refs auth.users |
| email | text | |
| created_at | timestamptz | |

RLS: `profiles_select_self` (id = auth.uid()), `profiles_select_admin` (is_admin()).

---

**`clinics`** — core clinic records with approval workflow
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| name | text | |
| status | clinic_status | default 'pending' |
| requested_by | uuid | refs auth.users |
| requested_at | timestamptz | |
| approved_by | uuid | refs auth.users (nullable) |
| approved_at | timestamptz | nullable |
| rejected_by | uuid | refs auth.users (nullable) |
| rejected_at | timestamptz | nullable |
| rejection_reason | text | default '' |
| created_at | timestamptz | |

RLS: `clinics_select_member` (is member), `clinics_select_admin` (is_admin()), `clinics_update_admin` (is_admin()).

---

**`clinic_members`** — user↔clinic association
| Column | Type | Notes |
|--------|------|-------|
| clinic_id | uuid | refs clinics, FK cascade |
| user_id | uuid | refs auth.users, FK cascade |
| role | text | CHECK: 'owner'\|'doctor'\|'reception' |
| is_active | boolean | default true — soft disable per member |
| created_at | timestamptz | |

Primary key: (clinic_id, user_id). Indexes on user_id and clinic_id.
`is_clinic_member()` checks `m.is_active = true` AND `clinic.status = 'active'`. Function has `SECURITY DEFINER SET search_path = public` to prevent RLS recursion.
RLS: `clinic_members_select_self` (user_id = auth.uid()), `clinic_members_select_admin` (is_admin()).

---

**`settings`** — per-clinic configuration
| Column | Type | Notes |
|--------|------|-------|
| clinic_id | uuid PK | refs clinics, FK cascade |
| clinic_name | text | default '' |
| doctor_name | text | default '' |
| address | text | default '' |
| phone | text | default '' |
| price_new | int | default 200 |
| price_followup | int | default 100 |
| updated_at | timestamptz | |

RLS: `settings_select_member` (is_clinic_member()), `settings_update_member`, `settings_select_admin`.

---

**`patients`** — GLOBAL patient records (no clinic_id — shared across all clinics)
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| name | text | |
| phone | text | default '' |
| address | text | default '' |
| national_id | text | default '' |
| date_of_birth | date | nullable |
| gender | gender_type | nullable |
| blood_type | blood_type_enum | nullable |
| guardian_id | uuid | self-ref → patients (nullable, for children/elderly) |
| user_id | uuid | refs auth.users (nullable, for patient account linking) |
| profile_complete | boolean | default false |
| created_at | timestamptz | |

Unique index on phone WHERE phone ≠ ''. GIN index on name for full-text search.
RLS: members can select/insert/update via `clinic_patients` bridge. Admin can select all.

---

**`clinic_patients`** — bridge table: which patients each clinic has seen
| Column | Type | Notes |
|--------|------|-------|
| clinic_id | uuid | refs clinics, FK cascade |
| patient_id | uuid | refs patients, FK cascade |
| local_notes | text | default '' |
| linked_at | timestamptz | |
| linked_by | uuid | refs auth.users |

Primary key: (clinic_id, patient_id).
RLS: members can select/insert for their own clinic.

---

**`patient_medical_info`** — chronic diseases, allergies, medications (global, not per-clinic)
| Column | Type | Notes |
|--------|------|-------|
| patient_id | uuid PK | refs patients, FK cascade |
| chronic_diseases | text[] | default '{}' |
| allergies | text[] | default '{}' |
| current_medications | text | default '' |
| past_surgeries | text | default '' |
| family_history | text | default '' |
| notes | text | default '' |
| updated_at | timestamptz | |

RLS: clinic members can select/update. Admin can select all.

---

**`doctor_profiles`** — optional extended profile for doctor/owner users
| Column | Type | Notes |
|--------|------|-------|
| user_id | uuid PK | refs auth.users |
| full_name | text | nullable |
| specialty | text | nullable |
| bio | text | nullable |
| license_number | text | nullable |
| phone | text | nullable |
| updated_at | timestamptz | |

RLS: user can select/upsert own profile. Admin can select all. Created at signup, editable in settings.

---

**`visits`** — queue + billing core
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| clinic_id | uuid | refs clinics, FK cascade |
| patient_id | uuid | refs patients, FK cascade |
| doctor_id | uuid | refs auth.users (nullable) — set by doctor on finish |
| ticket | int | |
| visit_type | visit_type | default 'new' |
| status | visit_status | default 'waiting' |
| visit_date | date | |
| visit_time | time | |
| diagnosis | text | default '' |
| prescription | text | default '' |
| notes | text | default '' |
| vital_signs | jsonb | nullable — `{weight_kg, height_cm, bp_systolic, bp_diastolic, pulse, temp_c, blood_sugar}` |
| price | int | default 0 |
| paid | int | default 0 |
| created_at | timestamptz | |
| updated_at | timestamptz | auto-updated via trigger |

Indexes: composite (clinic_id, visit_date, status, ticket), unique (clinic_id, visit_date, ticket).
Realtime: enabled via `supabase_realtime` publication.
RLS: `visits_select_member`, `visits_insert_member`, `visits_update_member`, `visits_select_admin`.

---

**`payments`** — payment transaction log
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| clinic_id | uuid | |
| patient_id | uuid | refs patients |
| visit_id | uuid | refs visits (nullable, ON DELETE SET NULL) |
| amount | int | CHECK amount > 0 |
| discount | int | default 0 |
| payment_method | payment_method | default 'cash' |
| status | payment_status | default 'paid' |
| note | text | default '' |
| created_at | timestamptz | |

Indexes: (clinic_id, patient_id), (clinic_id, visit_id).
RLS: `payments_select_member`, `payments_insert_member`, `payments_select_admin`.

---

**`daily_counters`** — ticket number sequencing per clinic per day
| Column | Type | Notes |
|--------|------|-------|
| clinic_id | uuid | refs clinics |
| day | date | |
| last_ticket | int | default 0 |

Primary key: (clinic_id, day).
RLS: `daily_counters_select_member`, `daily_counters_insert_member`, `daily_counters_update_member`, `daily_counters_select_admin`.

---

#### RPCs (Security Definer)

| RPC | Parameters | Returns | Purpose |
|-----|-----------|---------|---------|
| `is_admin()` | — | boolean | Checks if current user is in app_admins |
| `is_clinic_member(clinic_id)` | uuid | boolean | Checks membership + clinic.status='active' |
| `allocate_ticket(clinic_id, day)` | uuid, date | int | Atomically increments + returns next ticket |
| `call_next(clinic_id, day)` | uuid, date | table(visit_id uuid) | Marks serving→done, waiting→serving |
| `create_clinic_for_owner(name, doctor, addr?, phone?)` | text×4 | uuid | Creates clinic(pending) + member(owner) + settings |
| `approve_clinic(clinic_id)` | uuid | void | Admin: sets status=active, clears rejected fields |
| `reject_clinic(clinic_id, reason?)` | uuid, text | void | Admin: sets status=rejected, saves reason |
| `find_or_create_patient(clinic_id, name, phone?, national_id?, address?)` | — | uuid | Global patient lookup/create + auto-links to clinic_patients |
| `upsert_patient_medical_info(patient_id, ...)` | — | void | Doctor: upserts patient_medical_info record |
| `my_clinic_role(clinic_id)` | uuid | text | Returns current user's role in the given clinic |

**`audit_log`** — auto-generated change log (triggers on patients, visits, payments, patient_medical_info)
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| table_name | text | |
| record_id | uuid | |
| action | audit_action | INSERT/UPDATE/DELETE |
| old_data | jsonb | nullable |
| new_data | jsonb | nullable |
| changed_by | uuid | refs auth.users |
| changed_at | timestamptz | |
| clinic_id | uuid | nullable |

RLS: admin-only SELECT.

---

## 4. LIB FILES

### `src/lib/supabase/`

| File | Exports | Purpose |
|------|---------|---------|
| `env.ts` | `getSupabaseEnvOptional()`, `isSupabaseConfigured()`, `getSupabaseEnv()` | Reads `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Throws if missing. |
| `server.ts` | `createSupabaseServerClient()` | Creates SSR Supabase client that reads/writes session cookies. Used in Server Components + Server Actions. |
| `client.ts` | `createSupabaseBrowserClient()` | Returns singleton browser Supabase client (stored on globalThis). Prevents multiple realtime WebSocket connections. |

### `src/lib/clinic/`

| File | Exports | Purpose |
|------|---------|---------|
| `activeClinic.ts` | `requireActiveClinicId({ locale })`, `requireActiveClinicIdForAction()` | Resolves and validates clinic ID for current user. `requireActiveClinicId` redirects (for pages). `requireActiveClinicIdForAction` throws (for Server Actions). Both enforce clinic.status='active'. |

### `src/lib/admin/`

| File | Exports | Purpose |
|------|---------|---------|
| `requireAdmin.ts` | `requireAdminServer(locale)` | Verifies user is authenticated and in `app_admins` (via `is_admin()` RPC). Redirects to `/login` if not. Returns `{ supabase, user }`. Imports `server-only`. |
| `metrics.ts` | `getAdminDashboardMetrics(supabase, { todayISO })`, `getLastNDaysISO(days, endDay)`, `sumPaymentsAmount(rows)` | Parallel-fetches 11 Supabase queries for dashboard metrics: clinic counts by status, unique user counts by role, patient/visit totals, 7-day charts for visits + payments. |

### `src/lib/data/` (Server-side RSC fetchers with mock fallback)

| File | Exports | Purpose |
|------|---------|---------|
| `_shared.ts` | `warnSupabaseFallback(scope, reason)`, `todayISODate()`, `ensureSupabaseConfiguredOr(scope, fallback)` | Shared utilities. Warns once in dev when falling back to mock data. |
| `settings.ts` | `getSettingsServer(locale?, clinicId?)` | Fetches clinic settings. Falls back to locale-aware mock if Supabase not configured or clinicId missing. |
| `patients.ts` | `getPatientsServer(clinicId?)` | Fetches patients (limit 200, ordered by created_at desc). Falls back to `mockPatients`. |
| `queue.ts` | `getQueueStateServer(day?, clinicId?)` | Fetches waiting+serving visits + resolves patient names. Falls back to `mockQueueState`. |
| `dailyBalance.ts` | `getDailyBalanceServer(day?, clinicId?)` | Sums price/paid from visits table for the day. Falls back to `mockDailyBalance`. |
| `server.ts` | barrel re-export | Re-exports all 4 fetchers. |

### `src/lib/actions/clinic/` (Server Actions — mutations)

| File | Exports | Purpose | DB Tables |
|------|---------|---------|-----------|
| `time.ts` | `todayISODate()`, `nowTimeHHMMSS()` | Date/time helpers. | — |
| `queue.ts` | `getQueueStateForDay(clinicId, day)`, `callNextForDay(clinicId, day)` | Read current queue; call `call_next` RPC. | visits, patients |
| `visits.ts` | `registerVisitForClinic(input)`, `finishVisitForClinic(input)` | Register patient + allocate ticket (with 3-retry collision handling); finish visit (update status=done, fields). | patients, visits, daily_counters |
| `reports.ts` | `getDayVisitsForClinic(clinicId, day)`, `getDailyBalanceForClinic(clinicId, day)`, `endDayForClinic(clinicId, day)` | Fetch day's visit list; sum price/paid; close all non-done visits. | visits, patients |
| `settings.ts` | `saveSettingsForClinic(clinicId, input)` | Update settings row. | settings |
| `patientFile.ts` | `getPatientFileForClinic({ clinicId, patientId, currentVisitId? })` | Fetch patient record + all done visits ordered by date/ticket desc. | patients, visits |
| `billing.ts` | barrel re-export | Re-exports the 3 billing functions. | — |
| `billing/helpers.ts` | `sumNumberField(rows, field)` | Safe sum reducer for arrays. | — |
| `billing/getVisitBilling.ts` | `getVisitBillingForClinic(clinicId, visitId)` | Fetches visit + patient + all charged (done visits) + all payments to compute per-visit and per-patient totals. | visits, patients, payments |
| `billing/getPatientBillingSummary.ts` | `getPatientBillingSummaryForClinic(clinicId, patientId)` | Counts done visits; sums charged and paid for patient. | visits, payments |
| `billing/addPayment.ts` | `addPaymentForClinic(input)` | Validates remaining balance; distributes payment across done visits (current visit first, then FIFO); creates payment rows + updates visit.paid. Returns updated VisitBilling. | visits, payments |
| `doctorProfile.ts` | `saveDoctorProfileAction(input: DoctorProfileInput)` | Upserts `doctor_profiles` for `auth.uid()`. Requires active clinic membership. | doctor_profiles |

### `src/lib/actions/clinic.ts` (Public Server Action API)

All functions require `"use server"` and call `requireActiveClinicIdForAction()` internally.

| Function | Returns |
|----------|---------|
| `callNextAction(day?)` | `{ ok: true }` |
| `registerVisitAction(input)` | `{ ticket, waitingAhead, patient }` |
| `finishVisitAction(input)` | `{ ok: true }` |
| `addPaymentAction(input)` | `VisitBilling` |
| `getVisitBillingAction(visitId)` | `VisitBilling` |
| `getPatientBillingSummaryAction(patientId)` | `PatientBillingSummary` |
| `getPatientFileAction(patientId, currentVisitId?)` | `PatientFile` |
| `saveSettingsAction(input)` | `Settings` |
| `endDayAction(day?)` | `{ ok: true }` |
| `refreshDailyBalanceAction(day?)` | `DailyBalance` |
| `getDayVisitsAction(day?)` | `DailyVisitRow[]` |
| `getQueueStateAction(day?)` | `QueueState` |

### `src/lib/hooks/`

| File | Exports | Purpose |
|------|---------|---------|
| `useVisitsRealtime.ts` | `useVisitsRealtime(options)` | Client-only hook. Subscribes to Postgres Changes on `visits` table filtered by `clinic_id`. Debounces onChange (default 250ms). Respects tab visibility (defers refresh when hidden). Optional polling fallback (`fallbackPollMs`, default 0=off). |

### `src/lib/`

| File | Exports | Purpose |
|------|---------|---------|
| `utils.ts` | `cn(...inputs)` | Combines clsx + tailwind-merge for safe class merging. |
| `mock-data.ts` | `getMockSettings(locale)`, `mockQueueState`, `mockDailyBalance`, `mockPatients` | Development mock data. Used as fallback when Supabase is not configured. |

### `src/i18n/`

| File | Exports | Purpose |
|------|---------|---------|
| `routing.ts` | `locales`, `AppLocale`, `defaultLocale`, `isAppLocale()`, `dirForLocale()` | Locale config: `["ar", "en"]`, default `"ar"`. RTL/LTR helper. |
| `request.ts` | `getRequestConfig` | next-intl server config: loads messages JSON per locale via dynamic import. |

---

## 5. STATE MANAGEMENT

There is **no global state library** (no Zustand, no Redux, no Context API stores). State strategy:

| Layer | Mechanism |
|-------|-----------|
| **Server state** | RSC fetches on each page load (force-dynamic) |
| **Client UI state** | Local `useState` in each Client Component |
| **Real-time sync** | `useVisitsRealtime` hook → calls server action on change → updates local state |
| **Form state** | Uncontrolled inputs + local state in each form component |
| **Auth state** | Supabase session cookies (SSR) — no client-side auth context |
| **Singleton** | `globalThis.__clinicQueueSupabaseBrowserClient` — prevents duplicate WS connections |

The pattern used across the app:
1. Server page fetches initial data → passes as props to Client component
2. Client component stores data in `useState` (initialValue = server-fetched props)
3. `useVisitsRealtime` triggers `onChange` callback on DB changes
4. `onChange` calls server action to re-fetch fresh data → `setState`

---

## 6. SERVER ACTIONS — COMPLETE LIST

All defined in `src/lib/actions/clinic.ts` (public API) backed by `src/lib/actions/clinic/*` (implementation).

```typescript
// Queue
callNextAction(day?: string): Promise<{ ok: true }>
getQueueStateAction(day?: string): Promise<QueueState>

// Visits
registerVisitAction(input: {
  patientId?: string; name: string; phone?: string; address?: string;
  visitType: VisitType; price: number; day?: string;
}): Promise<{ ticket: number; waitingAhead: number; patient: Patient }>

finishVisitAction(input: {
  visitId: string; diagnosis: string; prescription: string;
  notes: string; price: number; day?: string;
}): Promise<{ ok: true }>

// Billing
addPaymentAction(input: {
  patientId: string; visitId: string; amount: number; note?: string;
}): Promise<VisitBilling>

getVisitBillingAction(visitId: string): Promise<VisitBilling>
getPatientBillingSummaryAction(patientId: string): Promise<PatientBillingSummary>

// Patient
getPatientFileAction(patientId: string, currentVisitId?: string): Promise<PatientFile>

// Settings
saveSettingsAction(input: Settings): Promise<Settings>

// Reports
endDayAction(day?: string): Promise<{ ok: true }>
refreshDailyBalanceAction(day?: string): Promise<DailyBalance>
getDayVisitsAction(day?: string): Promise<DailyVisitRow[]>
```

**Inline Server Actions** (defined inside page components):
- `admin/page.tsx`: `approveAction(formData)`, `rejectAction(formData)` — call `approve_clinic` / `reject_clinic` RPCs, then `revalidatePath`
- `admin/clinics/[clinicId]/page.tsx`: `activateAction()`, `deactivateAction()` — same RPCs

---

## 7. TYPES

All in `src/types/clinic.ts`.

```typescript
type Role = "reception" | "doctor"

type VisitStatus = "waiting" | "serving" | "done"
type VisitType   = "new" | "followup"

type Patient = {
  id: string; name: string; phone?: string; address?: string; createdAt?: string;
}

type Visit = {
  id: string; patientId: string; ticket: number; visitType: VisitType;
  status: VisitStatus; date?: string; time?: string;
  diagnosis?: string; prescription?: string; notes?: string;
  price: number; paid: number;
}

type QueueState = {
  current: number | null;
  waitingCount: number;
  waitingPatients: Array<{ ticket: number; name: string; visitType: VisitType; visitId?: string; patientId?: string }>;
  queue: Visit[];
}

type Settings = {
  clinicName: string; doctorName: string; address: string; phone: string;
  priceNew: number; priceFollowup: number;
}

type PatientFileVisit = {
  id: string; ticket?: number; date?: string; time?: string;
  visitType: VisitType; diagnosis?: string; prescription?: string; notes?: string;
  price: number; paid: number;
}

type PatientFile = {
  patient: Patient | null; visits: PatientFileVisit[];
  lastVisit: PatientFileVisit | null; currentVisitId?: string;
}

type DailyBalance = { total: number; paid: number; remaining: number; }

type DailyVisitRow = {
  id: string; patientId: string; name: string; ticket: number;
  visitType: VisitType; status: VisitStatus; diagnosis: string; price: number; paid: number;
}

type VisitBilling = {
  visitId: string; patient: Patient; ticket: number; visitType: VisitType;
  visitPrice: number; visitPaid: number; visitRemaining: number;
  patientCharged: number; patientPaid: number; patientRemaining: number;
}

type PatientBillingSummary = {
  patientId: string; visitsCount: number; charged: number; paid: number; remaining: number;
}
```

**Additional types** defined locally in their files:
- `AdminDashboardMetrics` — in `src/lib/admin/metrics.ts`
- `AdminView`, `AdminNavKey` — in `src/components/admin/AdminShell.tsx`
- `UseVisitsRealtimeOptions` — in `src/lib/hooks/useVisitsRealtime.ts`
- `AppLocale` — in `src/i18n/routing.ts`
- `SupabaseEnv` — in `src/lib/supabase/env.ts`

---

## 8. DESIGN TOKENS (globals.css)

All colors are CSS variables mapped to Tailwind v4 tokens via `@theme inline`. **Never use hex colors in JSX** — always use the Tailwind class.

### Reception Theme (`rec-*`)
| Token | Value | Tailwind Class |
|-------|-------|----------------|
| rec-primary | `#0a5c8a` | `text-rec-primary`, `bg-rec-primary` |
| rec-primary-light | `#1a7ab5` | `border-rec-primary-light` |
| rec-accent | `#00c9b1` | `bg-rec-accent` |
| rec-bg | `#f0f4f8` | `bg-rec-bg` |
| rec-card | `#ffffff` | `bg-rec-card` |
| rec-text | `#1a2636` | `text-rec-text` |
| rec-muted | `#7a8fa6` | `text-rec-muted` |
| rec-border | `#dce5ef` | `border-rec-border` |
| rec-new | `#0a5c8a` | `text-rec-new` |
| rec-followup | `#00897b` | `text-rec-followup` |
| rec-soft-primary | color-mix(rec-primary 10%, white) | `bg-rec-soft-primary` |
| rec-soft-primary-2 | color-mix(rec-primary 18%, white) | `bg-rec-soft-primary-2` |
| rec-soft-followup | color-mix(rec-followup 12%, white) | `bg-rec-soft-followup` |
| rec-soft-accent | color-mix(rec-accent 14%, white) | `bg-rec-soft-accent` |

### Doctor Theme (`doc-*`)
| Token | Value |
|-------|-------|
| doc-bg | `#0d1f33` |
| doc-card | `#132840` |
| doc-card-2 | `#1a3455` |
| doc-text | `#e8f0f8` |
| doc-muted | `#6b8aaa` |
| doc-border | `#1e3d5c` |
| doc-accent | `#00c9b1` |
| doc-accent-2 | `#f59e0b` |
| doc-new | `#3b9eed` |
| doc-followup | `#00c9b1` |

### Display Theme (`dis-*`)
| Token | Value |
|-------|-------|
| dis-bg | `#050e1a` |
| dis-accent | `#00e5cc` |
| dis-accent-2 | `#f59e0b` |
| dis-text | `#ffffff` |
| dis-muted | color-mix(dis-text 45%, transparent) |
| dis-card | color-mix(dis-text 5%, transparent) |
| dis-border | color-mix(dis-text 8%, transparent) |
| dis-topbar | color-mix(black 30%, transparent) |

### Semantic Tokens
| Token | Value | Tailwind Class |
|-------|-------|----------------|
| success | `#2e7d32` | `text-success`, `bg-success` |
| warning | `#f59e0b` | `text-warning`, `bg-warning` |
| danger | `#e53935` | `text-danger`, `bg-danger` |
| success-soft | color-mix(success 14%, white) | `bg-success-soft` |
| warning-soft | color-mix(warning 18%, white) | `bg-warning-soft` |
| danger-soft | color-mix(danger 14%, white) | `bg-danger-soft` |
| warning-ink | color-mix(warning 55%, black) | `text-warning-ink` |
| warning-ink-strong | color-mix(warning 68%, black) | `text-warning-ink-strong` |

### Utility Classes
| Class | CSS |
|-------|-----|
| `shadow-rec` | `box-shadow: 0 4px 24px rgba(10,92,138,0.1)` |
| `shadow-header` | `box-shadow: 0 2px 12px rgba(0,0,0,0.18)` |
| `shadow-doc` | `box-shadow: 0 8px 32px rgba(0,0,0,0.35)` |
| `max-w-panel` | `max-width: 1100px` |

---

## 9. TODO / ROADMAP

### TODO Comments in Source Code
**Zero** — no `TODO`, `FIXME`, `HACK`, or `XXX` comments found in any source file.

### Stub Pages
- `/[locale]/reports` — shows "coming soon" message. Has `reports.title` and `reports.comingSoon` i18n keys.

### ADMIN_CONSOLE_TODO.md Roadmap

**Phase B** — Patient details page
- Route: `/[locale]/admin/patients/[patientId]`
- Show: profile + clinic + visits + payments summary
- Needs: safe query joins (patients → visits → payments)

**Phase C** — Visits admin view
- Route: `/[locale]/admin/visits`
- Filters: date range + clinic + status

**Phase D** — Payments admin view
- Route: `/[locale]/admin/payments`
- Daily totals + clinic totals

**Phase E** — Settings admin view
- Route: `/[locale]/admin/settings` or under clinic details
- Requires admin RPC to update settings

**Phase F** — Members CRUD
- Add/remove members, change roles
- RPCs needed: `admin_add_member`, `admin_remove_member`, `admin_set_member_role`

**Phase G** — Audit log
- Table: `admin_audit_log` (who, what, target_id, before/after JSON, timestamp)
- Already in master schema v3 as `audit_log` with generic trigger

**Phase H** — Search + pagination
- Simple search across clinics/doctors/patients
- Pagination for large datasets

**Later** — Patient account linking
- Multi-clinic patient identity strategy (phone normalization, national_id, auth linking)
- Already designed in master schema v3

---

## 10. AGENT/MONITORING FILES

### Proxy (formerly Middleware)
**`src/proxy.ts`** — next-intl locale routing proxy. Handles locale detection and URL rewriting.
```typescript
import createMiddleware from "next-intl/middleware";
// Locales: ["ar", "en"], defaultLocale: "ar"
// Matcher: "/", "/(ar|en)/:path*", "/((?!_next|.*\\..*).*)
```
> Note: Renamed from `middleware.ts` to `proxy.ts` to comply with Next.js 16 deprecation.

### Error Tracking
**None configured.** No Sentry, LogRocket, or similar. Only `console.warn` in development for:
- Supabase fallback to mock data (`warnSupabaseFallback`)
- Realtime channel errors (`useVisitsRealtime`)

### Background Jobs / Cron
**None.** No scheduled tasks, cron jobs, or background workers.

### Logging
**None beyond dev warnings.** Production logs rely on Supabase dashboard + Next.js hosting platform (Vercel) logs.

---

## 11. CURRENT KNOWN ISSUES

### ✅ Fixed: `bg-rec-surface` token added
Token `--rec-surface` added to `globals.css`. Used in admin list items.

### ✅ Fixed: `owner_user_id` → `requested_by`
`admin/clinics/[clinicId]/page.tsx` corrected to use actual `requested_by` column.

### ✅ Fixed: `middleware.ts` → `proxy.ts`
Renamed to comply with Next.js 16 deprecation. Build clean.

### ✅ Fixed: `is_clinic_member()` RLS recursion
Function recreated with `SECURITY DEFINER SET search_path = public` to prevent infinite recursion when clinic RLS policies call it.

### ✅ Fixed: Approvals page silent empty result
`admin/page.tsx` approvals fetch was using a PostgREST join (`settings(...)`) that silently returned null. Fixed by splitting into two parallel queries + Map merge.

### ✅ Fixed: Admin doctors page — UUID shown instead of name (BF1)
`admin/doctors/page.tsx` and `admin/doctors/[userId]/page.tsx` now fetch both `doctor_profiles` (full_name, specialty) and `profiles` (email). Display chain: `full_name || email || userId`.

### ✅ Fixed: Signup redesigned as 3-step form (BF2)
`SignupClient.tsx` is now a multi-step wizard (Step 1: account, Step 2: clinic, Step 3: doctor). Per-step validation. Step indicator at top.

### ✅ Fixed: Re-application flow for rejected clinics (BF3)
`clinic-status/page.tsx` shows "إعادة التقديم" button for rejected clinics → `/signup?mode=clinic-only`. `SignupClient` handles `isClinicOnly` prop (skips Step 1). Email-already-exists error shows inline link to login.

### ℹ️ Info: TypeScript `any` casts in actions/data files
All files in `src/lib/actions/clinic/` and `src/lib/data/` use `supabase as any`. Intentional — avoids maintaining a generated types file. Files have `/* eslint-disable @typescript-eslint/no-explicit-any */`.

### ✅ No TypeScript errors
### ✅ No ESLint errors
### ✅ Build: clean (40 routes generated)

---

## 12. ENVIRONMENT VARIABLES

All vars used across the project (values are in `.env.local`, never committed):

| Variable | Where Used | Required |
|----------|-----------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | `src/lib/supabase/env.ts` | Yes (falls back to mock if absent) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `src/lib/supabase/env.ts` | Yes (falls back to mock if absent) |

> Both are prefixed `NEXT_PUBLIC_` so they are available in Client Components as well as Server Components.

No other env vars are used. If Supabase vars are absent, the app runs in mock-data mode (dev only — production will fail auth).

---

## 13. COMPONENT INVENTORY

### `src/components/reception/`
| Component | Type | Purpose |
|-----------|------|---------|
| `ReceptionClient.tsx` | Client | Main container. Manages state, realtime subscription, billing popup trigger, day-diff detection. |
| `ReceptionHeader.tsx` | Client | Clinic name, nav links (display/doctor/end-day/logout), locale-aware hrefs. |
| `ReceptionTabs.tsx` | Client | Tab switcher: Registration / Report / Settings. |
| `QueuePanel.tsx` | Client | Current patient card + waiting list. |
| `QueueList.tsx` | Client | Scrollable list of waiting patient cards. |
| `RegistrationCard.tsx` | Client | Patient registration form. Phone lookup, existing patient detection, visit type/price. |
| `TicketArea.tsx` | Client | Ticket printout display after successful registration. |
| `ReportPanel.tsx` | Client | Daily balance stats + visit table. End-day button. |
| `SettingsPanel.tsx` | Client | Settings form (clinic name, doctor name, prices, etc.). |
| `BillingPopup.tsx` | Client | Payment modal. Shows visit + patient balance. Amount input + "fill remaining" button. |
| `BalanceBar.tsx` | Client | Yellow stats bar: total / paid / remaining for the day. |
| `Card.tsx` | Client | Simple `div` wrapper with `rec-card` styling and forwarded className. |

### `src/components/doctor/`
| Component | Type | Purpose |
|-----------|------|---------|
| `DoctorClient.tsx` | Client | Main container. Auto-opens medical history on first visit per session. |
| `DoctorHeader.tsx` | Client | Doctor name + clock (center) + nav links. |
| `DoctorTabs.tsx` | Client | Tab switcher: Exam / Search / Report. |
| `CurrentPatientPanel.tsx` | Client | Current visit info + VisitForm. |
| `VisitForm.tsx` | Client | Diagnosis/prescription/notes/price inputs + finish button. |
| `QueueSidebar.tsx` | Client | Call Next button + waiting queue list. |
| `SearchPanel.tsx` | Client | Patient search by name/phone. |
| `MedicalHistoryPopup.tsx` | Client | Modal showing previous done visits (date, type, diagnosis, financials). Auto-closes on patient switch. |

### `src/components/display/`
| Component | Type | Purpose |
|-----------|------|---------|
| `DisplayClient.tsx` | Client | Main container. Realtime refresh. |
| `DisplayTopbar.tsx` | Client | System name + language switcher. |
| `NowServingPanel.tsx` | Client | Large current ticket number display. |
| `WaitingPanel.tsx` | Client | Next 5-10 waiting patients. |
| `DisplayTicker.tsx` | Client | Animated scrolling announcements text. |

### `src/components/auth/`
| Component | Type | Purpose |
|-----------|------|---------|
| `LoginClient.tsx` | Client | Email/password login. Routes: admin → `/admin`, pending → `/clinic-status`, active → `/reception`. |
| `SignupClient.tsx` | Client | Two-mode: create-account (email+password+clinic) or create-clinic-only (already signed in). Calls `create_clinic_for_owner` RPC. |
| `ForgotPasswordClient.tsx` | Client | Sends Supabase password reset email. |
| `ResetPasswordClient.tsx` | Client | Sets new password via Supabase `updateUser`. |
| `AuthInputs.tsx` | Client | Reusable form primitives: `InputLabel`, `TextInput`, `PasswordInput`, `PrimaryButton`. |
| `SignOutButton.tsx` | Client | Calls `supabase.auth.signOut()` → navigates to `/login`. |

### `src/components/admin/`
| Component | Type | Purpose |
|-----------|------|---------|
| `AdminShell.tsx` | Server | Two-column layout: sticky sidebar nav + main content slot. Handles RTL column swap. Approval badge on nav item. |
| `AdminDashboard.tsx` | Server | Stat cards grid + bar chart (visits 7d) + donut chart (clinic status) + payments bar chart. |
| `AdminStatCard.tsx` | Server | Single metric card: label + value + optional hint. |
| `AdminCharts.tsx` | Server | `AdminBarChart` (inline SVG-free CSS bar chart) + `AdminDonutChart` (SVG strokeDasharray donut). No external chart library. |

### `src/components/landing/`
| Component | Type | Purpose |
|-----------|------|---------|
| `MarketingHeader.tsx` | Client | Nav: Features, How It Works, Pricing, Login, Signup. |
| `HeroSection.tsx` | Client | Main pitch + CTA buttons + animation. |
| `FeaturesSection.tsx` | Client | 4 feature cards with icons. |
| `HowItWorksSection.tsx` | Client | 3-step process visual. |
| `PricingSection.tsx` | Client | 3 pricing tiers (Starter/Professional/Enterprise). |
| `MarketingFooter.tsx` | Client | Copyright, links. |

---

## 14. i18n NAMESPACES

Files: `web/messages/ar.json` + `web/messages/en.json` (identical structure, ~590 lines each).

| Namespace | Usage location |
|-----------|---------------|
| `reception.*` | ReceptionClient + all reception sub-components |
| `doctor.*` | DoctorClient + all doctor sub-components |
| `display.*` | DisplayClient + display sub-components |
| `login.*` | LoginClient |
| `signup.*` | SignupClient |
| `forgotPassword.*` | ForgotPasswordClient |
| `resetPassword.*` | ResetPasswordClient |
| `landing.*` | All marketing components (nav, hero, features, how, pricing, cta, footer) |
| `admin.*` | All admin pages + AdminShell |
| `clinicStatus.*` | clinic-status page |
| `reports.*` | reports page |
| `common.*` | Generic labels |

---

## 15. SQL FILES REFERENCE

| File | Use case | Lines |
|------|----------|-------|
| `docs/08-supabase-multiclinic-clean.sql` | Bootstrap for **new** Supabase projects | 792 |
| `docs/09-migrate-admin-clinic-approval.sql` | Migration for **existing** projects (adds approval workflow) | 289 |
| `Downloads/11-master-schema.sql` | Future **v3 schema** — global patients, medical info, audit log, guardian system. **Not yet deployed.** | 925 |

---

## 16. BUILD & COMMANDS

```bash
# Working directory: e:\clinic_queue\website\web\

pnpm install          # Install dependencies
pnpm dev              # Dev server (localhost:3000)
pnpm build            # Production build (TypeScript + lint + static generation)
pnpm start            # Start production server
pnpm lint             # ESLint

# From repo root:
pnpm -C web lint
pnpm -C web build
pnpm -C web dev
```

**Build output (40 routes):** Mix of static (●), dynamic (ƒ), and proxy middleware.

---

*Generated by deep project scan on 2026-04-01. Update this file when adding new routes, tables, actions, or known issues.*
