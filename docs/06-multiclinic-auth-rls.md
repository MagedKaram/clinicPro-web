# Phase 3 (Prep) — Multi‑Clinic + Doctor Signup + RLS

> الهدف: كل دكتور/عيادة تبقى معزولة بالكامل (patients/visits/payments/settings)، مع Signup/Login على Supabase Auth.

## 1) تعريف “التوكين”

بعد الـ Signup/Login باستخدام Supabase Auth، العميل يحصل على **Session JWT (Access Token)** + **Refresh Token** (بيتحفظوا في cookies عبر `@supabase/ssr`).

- ده هو الـ “token” اللي هنستخدمه في كل requests.
- **ممنوع** نعتمد على “API key” مخصص للعيادة داخل الواجهة.

## 2) Multi‑tenant Model (الموديل المقترح)

### Entities

- `clinics`: عيادة واحدة لكل حساب دكتور (في البداية).
- `clinic_members`: ربط مستخدم Supabase (`auth.users`) بعيادة + role.
- جداول التشغيل الأساسية (كلها تحمل `clinic_id`):
  - `patients`
  - `visits`
  - `payments`
  - `settings`
  - `daily_counters`

### Roles

في البداية يكفينا:

- `owner` (الدكتور صاحب العيادة)
- (لاحقًا) `reception` / `doctor`

## 3) Signup Flow (Trial)

1. على صفحة Signup/Buy:

- `supabase.auth.signUp({ email, password })`

2. بعد نجاح الـ signup (أو بعد login):

- استدعاء RPC: `create_clinic_for_owner(p_clinic_name, p_doctor_name, ...)`
  - تنشئ صف في `clinics`
  - تنشئ صف في `clinic_members` بدور `owner`
  - تنشئ `settings` للعيادة

3. كل queries بعد كده تعتمد على RLS و`clinic_id`.

## 4) RLS Principles (عزل البيانات)

- **القاعدة**: المستخدم يرى ويكتب فقط على rows الخاصة بعيادته.
- نستخدم helper function:
  - `is_clinic_member(p_clinic_id uuid)`

### Example RLS

- `patients`: select/insert/update/delete حيث `is_clinic_member(clinic_id)`.
- `visits`: نفس الفكرة.
- `payments`: نفس الفكرة.
- `settings`: select/update حيث clinic_id تبع العضوية.
- `daily_counters`: قراءة/تحديث لتخصيص tickets داخل نفس العيادة.

## 5) RPC changes (allocate_ticket / call_next)

لازم ندخل `clinic_id` في التخصيص والنداء:

- `allocate_ticket(p_clinic_id uuid, p_day date)`
- `call_next(p_clinic_id uuid, p_day date)`

## 6) Notes for the frontend (Next.js)

- استخدم `@supabase/ssr` (موجود) للـ server client والـ browser client.
- اكتب helper `getActiveClinicId()`:
  - يجيب clinic_id من `clinic_members` لأول clinic للـ user.
  - أو يخزنه في cookies/metadata لو عايز.

## 7) Deliverables

- SQL script: `docs/06-multiclinic-schema.sql`
- Update marketing/signup prompt: `.github/prompts/marketing-site-gemini-pro3.prompt.md`
