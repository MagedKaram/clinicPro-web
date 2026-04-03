# Clinic Queue — Spec & Step Tracker

## Coding Rules (enforce always)

### Architecture

- Server Components by default. "use client" ONLY for: event handlers, useState/useEffect, browser APIs
- DB access only in: Server Components, Server Actions, Route Handlers
- Never import server code into client components
- Max ~150 lines per file — split by concern if larger
- One component per file

### SEO

- Every page.tsx exports metadata or generateMetadata()
- Semantic HTML: one h1 per page, proper heading hierarchy
- next/image for all images
- sitemap.ts + robots.ts

### Styling

- Tokens only: rec-_, doc-_, dis-\*, semantic (success/warning/danger)
- No hardcoded hex. No arbitrary Tailwind values [#xxx]
- RTL-safe: use start/end instead of left/right

### i18n

- All user strings via useTranslations() or getTranslations()
- No hardcoded Arabic or English text in components

### DB

- supabase as any is acceptable (no generated types file)
- Always call requireActiveClinicIdForAction() in mutations
- RPCs preferred over direct table mutations for complex operations

---

## Role Boundaries (critical — never cross these)

### Reception / Owner

- Adds and searches patients (find_or_create_patient RPC)
- Registers visits (ticket, visit_type, price)
- Handles billing and payments
- Manages clinic settings

### Doctor

- Calls next patient (call_next RPC)
- Fills exam: diagnosis, prescription, notes, vital_signs
- Edits patient medical info (chronic_diseases, allergies, medications...)
- Finishes visit (status → done)
- NEVER registers patients or touches billing

### Owner (at signup + settings)

- Provides clinic info: name, address, phone, price_new, price_followup
- Provides doctor info: doctor_name (settings), specialty, bio, license_number (doctor_profiles)
- doctor_profiles is created right after create_clinic_for_owner RPC succeeds

---

## Steps

### ✅ Completed

- [x] Multi-clinic Supabase schema (08 + 09)
- [x] Auth flow (login, signup, forgot/reset password)
- [x] Reception page (queue, registration, billing, settings, reports)
- [x] Doctor page (exam form, medical history, search)
- [x] Display page (realtime queue screen)
- [x] Admin console v1 (clinics, doctors, patients list)
- [x] Marketing pages v1 (landing, features, pricing — to be redesigned)
- [x] Master DB schema v3 (11-master-schema.sql) — deployed to Supabase
- [x] Doctor profiles migration (12-migrate-doctor-profiles.sql) — deployed
- [x] Project files reorganized into \_project/
- [x] DB-FIX: RLS policies rebuilt to avoid recursion (visits, patients, clinic_members, clinic_patients)
- [x] DB-FIX: audit_trigger_fn fixed (lower TG_OP + safe id/clinic_id extraction)
- [x] DB-FIX: patients queries split — removed all patients.clinic_id references from codebase
- [x] A1–A11: All Group A schema sync steps fully fixed and confirmed working

### 🔄 In Progress

(nothing currently in progress)

### 📋 Planned Steps

---

#### GROUP A — Schema sync (do all together, they depend on each other)

- [x] A1: Update TypeScript types
      File: src/lib/types.ts
      Add/change:
      Patient — remove clinic_id, add user_id (nullable), guardian_id (nullable),
      national_id, date_of_birth, gender, blood_type, profile_complete
      ClinicPatient — new: { clinic_id, patient_id, local_notes, linked_at, linked_by }
      PatientMedicalInfo — new: { patient_id, chronic_diseases[], allergies[],
      current_medications, past_surgeries, family_history, notes }
      DoctorProfile — new: { user_id, full_name, specialty, bio, license_number, phone }
      Visit — add doctor_id (nullable), vital_signs (VitalSigns | null)
      VitalSigns — new: { weight_kg?, height_cm?, bp_systolic?, bp_diastolic?,
      pulse?, temp_c?, blood_sugar? }
      Payment — add payment_method ('cash'|'card'|'transfer'),
      discount (number), status ('paid'|'partial'|'pending')
      AuditLog — new: { id, table_name, record_id, action, old_data, new_data,
      changed_by, changed_at, clinic_id }

- [x] A2: Update visits server action — reception side
      File: src/lib/actions/clinic/visits.ts
      Changes:
      registerVisitForClinic: call find_or_create_patient RPC instead of
      direct patients insert. RPC signature:
      find_or_create_patient(clinic_id, name, phone?, national_id?, address?) → uuid
      Reception provides: name, phone, address (NOT doctor — never)

- [x] A3: Update visits server action — doctor side
      File: src/lib/actions/clinic/visits.ts
      Changes:
      finishVisitForClinic: accept vital_signs (VitalSigns) + doctor_id (auth.uid())
      Save both to visits row on finish

- [x] A4: Update patient file action
      File: src/lib/actions/clinic/patientFile.ts
      Changes:
      Fetch patient from global patients table (no clinic_id filter)
      Also fetch patient_medical_info for this patient
      Return both in PatientFile type

- [x] A5: Update billing actions
      File: src/lib/actions/clinic/billing/addPayment.ts
      Changes:
      Accept payment_method ('cash'|'card'|'transfer') — default 'cash'
      Accept discount (number) — default 0
      Save both to payments row

- [x] A6: Update data fetchers
      File: src/lib/data/patients.ts
      Changes:
      patients no longer have clinic_id
      Query: patients join clinic_patients on patient_id
      Filter by clinic_id via clinic_patients table

- [x] A7: Update RegistrationCard — reception only
      File: src/components/reception/RegistrationCard.tsx
      Changes:
      Phone lookup calls find_or_create_patient RPC
      If patient found globally → show "مريض موجود" + his name + confirm
      If not found → show full registration form (name, phone, national_id, address)
      No doctor involvement here at all

- [x] A8: Update BillingPopup — payment method
      File: src/components/reception/BillingPopup.tsx
      Changes:
      Add payment method selector: cash / card / transfer (default cash)
      Pass method to addPaymentForClinic action

- [x] A9: Update VisitForm — doctor side only
      File: src/components/doctor/VisitForm.tsx
      Changes:
      Add vital_signs section: weight, height, BP (systolic/diastolic), pulse, temp, blood_sugar
      All fields optional
      doctor_id set automatically from auth.uid() — not shown to user

- [x] A10: Update MedicalHistoryPopup — show + edit medical info
      File: src/components/doctor/MedicalHistoryPopup.tsx
      Changes:
      Show patient_medical_info: chronic_diseases, allergies, current_medications,
      past_surgeries, family_history, notes
      Doctor can edit medical info (upsert_patient_medical_info RPC)
      Reception cannot see or edit this section

- [x] A11: Update admin patients page
      File: src/app/[locale]/admin/patients/page.tsx
      Changes:
      Patients now global — remove clinic_id filter
      Show: name, phone, gender, blood_type, date_of_birth, clinic count

---

#### GROUP B — Signup + Doctor profile (independent)

- [x] B1: Extend SignupClient — collect doctor profile at signup
      File: src/components/auth/SignupClient.tsx
      Changes:
      After clinic name + doctor name fields, add:
      specialty (text input — e.g. باطنة، رمد، أطفال)
      bio (textarea — optional)
      license_number (text — optional)
      After create_clinic_for_owner RPC succeeds → insert into doctor_profiles:
      { user_id: auth.uid(), full_name: doctor_name, specialty, bio, license_number }

- [x] B2: Doctor profile in settings tab
      File: src/components/reception/SettingsPanel.tsx
      Changes:
      Add "Doctor Profile" section (owner only — hide for reception role)
      Fields: full_name, specialty, bio, license_number, phone
      Save to doctor_profiles via server action

- [x] B3: New server action — saveDoctorProfile
      File: src/lib/actions/clinic/doctorProfile.ts (new file)
      Exports: saveDoctorProfileAction(input: DoctorProfileInput) → { ok: true }
      Upserts into doctor_profiles for auth.uid()

- [x] B4: Admin doctors page — show specialty
      File: src/app/[locale]/admin/doctors/page.tsx
      Changes: join doctor_profiles, show specialty column

- [x] B5: Admin doctor detail page — full profile
      File: src/app/[locale]/admin/doctors/[userId]/page.tsx
      Changes: show full doctor_profiles data + visit stats

---

#### GROUP C — Patient profile admin (depends on Group A)

- [x] C1: Admin patient detail page
      Route: /[locale]/admin/patients/[patientId]
      File: src/app/[locale]/admin/patients/[patientId]/page.tsx (new)
      Server rendered. Shows:
      Demographics (name, phone, gender, blood_type, date_of_birth, national_id)
      Medical info (chronic_diseases, allergies, medications...)
      Clinics visited (from clinic_patients)
      Visits history (across all clinics — admin only)
      Payments summary

- [x] C2: Guardian display
      File: same as C1
      If patient has guardian_id → show guardian name + link
      If patient has dependents → show list of dependents

---

#### GROUP B-FIX — Bugs from Group B (do before Group D)

- [x] BF1: Fix admin doctors page — show full_name from doctor_profiles,
           fallback to profiles.email. Show specialty under name.
           Files: admin/doctors/page.tsx, admin/doctors/[userId]/page.tsx

- [x] BF2: Signup multi-step form (3 steps)
           Step 1: email + password
           Step 2: clinic name + address + phone + prices
           Step 3: doctor full_name (required) + specialty (required) +
                   license_number (optional) + bio (optional) + avatar (optional)
           Step indicator at top: ① ② ③
           Validate each step before next
           doctor_profiles save is now REQUIRED (not best-effort); shows error on failure
           avatar_url field added to doctor_profiles + DoctorProfile type
           avatar shown in admin doctors list + detail pages
           File: src/components/auth/SignupClient.tsx

- [x] BF3: Re-application flow for rejected clinics
           /clinic-status: if rejected → show reason + "إعادة التقديم" button
           Button → /signup?mode=clinic-only (skip Step 1)
           If email exists at signup → show "مسجل بالفعل، سجل دخول"
           File: src/app/[locale]/clinic-status/page.tsx,
                 src/components/auth/SignupClient.tsx

---

#### GROUP D — Admin dashboard — legendary (independent)

- [x] D1: Dashboard overview — stat cards
      Metrics (parallel server fetch):
      Total active clinics
      Total suspended clinics  
       Total pending approvals
      Total patients (global)
      Total visits today (all clinics)
      Total visits this month
      Revenue today (all clinics)
      Revenue this month
      Active doctors count
      New patients this week
      New clinics this month

- [x] D2: Charts — visits & revenue - Line: daily visits last 30 days - Line: daily revenue last 30 days - Bar: top 10 clinics by visits this month - Donut: clinic status (active/pending/suspended/rejected) - Donut: payment method distribution (cash/card/transfer) - Donut: visit type (new/followup)

- [ ] D3: Real-time activity feed
      Last 20 audit_log entries — live updates
      Types: patient created, visit started, visit done, payment added,
      clinic registered, clinic approved/suspended

- [ ] D4: Pending approvals widget (on main dashboard)
      Show pending clinics inline with quick approve/reject buttons
      No need to navigate to clinics page

- [ ] D5: Admin clinics page — full control
      Route: /[locale]/admin/clinics
      Filters: status, specialty, date range
      Actions per clinic: approve, reject, suspend, reactivate
      Shows: name, doctor, specialty, members count, visits count, revenue

- [ ] D6: Clinic detail page — full management
      Route: /[locale]/admin/clinics/[clinicId]
      Sections:
      Clinic info + status badge
      Doctor profile (specialty, bio, license)
      Members list + CRUD (add/remove/role/toggle is_active)
      Visit stats (today / week / month)
      Revenue stats
      Recent visits table
      Recent payments table
      Suspend / Reactivate / Reject buttons

- [ ] D7: Admin doctors page
      Route: /[locale]/admin/doctors
      Shows: name, specialty, bio, clinic count, visit count, last active
      Filters: specialty, clinic

- [ ] D8: Admin doctor detail page
      Route: /[locale]/admin/doctors/[userId]
      Shows: full doctor_profiles + all clinics + visit history + stats

- [ ] D9: Admin patients page
      Route: /[locale]/admin/patients
      Shows: name, phone, gender, blood_type, age, clinic count, visit count
      Filters: gender, blood_type, has guardian, date range
      Search: by name or phone

- [ ] D10: Admin patient detail page
      Route: /[locale]/admin/patients/[patientId]
      Sections:
      Demographics + medical info
      Guardian / dependents
      Clinics visited
      Full visit history (all clinics)
      Full payment history
      Audit trail for this patient

- [ ] D11: Admin visits page
      Route: /[locale]/admin/visits
      Filters: date range, clinic, doctor, status, visit_type
      Shows: ticket, patient, clinic, doctor, specialty, status, price, paid
      Export: CSV (future)

- [ ] D12: Admin payments page
      Route: /[locale]/admin/payments
      Filters: date range, clinic, method, status
      Shows: amount, discount, net, method, status, patient, clinic
      Footer totals: per method + grand total

- [ ] D13: Admin audit log page
      Route: /[locale]/admin/audit-log
      Filters: table, action, date range, user
      Shows: table, action, who, when, diff (old→new)

- [ ] D14: Clinic suspend / reactivate
      Adds new clinic_status: 'suspended'
      SQL: alter type clinic_status add value 'suspended';
      Admin can: active → suspended → active
      Suspended clinic: members cannot login to app
      RLS: is_clinic_member() checks status IN ('active') only

- [ ] D15: Admin search (global)
      Route: /[locale]/admin/search?q=
      Searches across: clinics, doctors, patients simultaneously
      Server rendered with search params

---

#### GROUP E — Marketing site v2 (fully independent, full redesign)

- [x] E1: Marketing layout + header + footer
- [x] E2: Landing page v2 — Hero, Stats, Features, HowItWorks, Testimonials, Pricing preview, FAQ, CTA + metadata
- [x] E3: Features page v2 — full breakdown + metadata
- [x] E4: Pricing page v2 — 3 tiers + FAQ + CTA + metadata
- [x] E5: About page — mission, story, values, team + metadata
- [x] E6: Contact page — static form UI + metadata
- [x] E7: Blog stub — coming soon + metadata
- [x] E8: SEO — sitemap.ts + robots.ts + metadata on all pages

---

#### GROUP F — Performance audit (after all above)

- [ ] F1: Audit all "use client" — convert to server where possible
- [ ] F2: Split any file over 150 lines into smaller focused files
- [ ] F3: Add loading.tsx to all dynamic routes
- [ ] F4: Add error.tsx to all dynamic routes
