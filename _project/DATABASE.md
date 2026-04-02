# Clinic Queue — Database Reference
> الملف ده هو المرجع الكامل للداتابيز. أي agent أو session جديد يبدأ منه.
> آخر تحديث: بعد إنشاء الـ master schema + doctor_profiles migration

---

## Stack
- **Supabase** (Postgres + Auth + RLS + Realtime)
- **SQL files:** `11-master-schema.sql` + `12-migrate-doctor-profiles.sql`

---

## الجداول (13 جدول)

### 1. `app_admins`
أدمن التطبيق كله — مش أدمن عيادة.
```
user_id    uuid PK → auth.users
created_at timestamptz
```
- RLS: لا أحد يقرأها مباشرة — بس عبر `is_admin()`

---

### 2. `profiles`
mirror بسيط لـ auth.users — بيتعمل أوتوماتيك عبر trigger.
```
id         uuid PK → auth.users
email      text
phone      text default ''
created_at timestamptz
```
- RLS: كل user يشوف نفسه / admin يشوف الكل

---

### 3. `doctor_profiles`
بروفايل الدكتور — مستقل عن العيادة، جاهز للمستقبل.
```
user_id        uuid PK → auth.users
full_name      text
specialty      text   -- باطنة، رمد، أطفال، عظام...
bio            text
license_number text   -- رقم نقابة الأطباء
phone          text
created_at     timestamptz
updated_at     timestamptz
```
- RLS: الدكتور يعدل بروفايله / أعضاء نفس العيادة يقروه / admin يشوف الكل
- **ملاحظة:** مش كل user عنده doctor_profile — بس اللي role='doctor' في clinic_members

---

### 4. `clinics`
العيادات — بتمر بـ workflow موافقة قبل تشتغل.
```
id               uuid PK
name             text
status           clinic_status  -- pending | active | rejected
requested_by     uuid → auth.users (nullable)
requested_at     timestamptz
approved_by      uuid → auth.users (nullable)
approved_at      timestamptz (nullable)
rejected_by      uuid → auth.users (nullable)
rejected_at      timestamptz (nullable)
rejection_reason text
created_at       timestamptz
```
- RLS: أعضاء العيادة يشوفوها / admin يشوف ويعدل الكل
- Status flow: `pending` → `active` أو `rejected`

---

### 5. `clinic_members`
مين شغال في أنهي عيادة وبأي دور.
```
clinic_id  uuid PK → clinics
user_id    uuid PK → auth.users
role       text  -- 'owner' | 'doctor' | 'reception'
is_active  boolean default true
created_at timestamptz
```
- Indexes: `user_idx`, `clinic_idx`
- RLS: كل user يشوف memberships نفسه / أعضاء العيادة يشوفوا بعض / admin يشوف الكل
- **مهم:** `is_clinic_member()` بتتحقق إن `is_active=true` و `clinic.status='active'`

---

### 6. `settings`
إعدادات العيادة — واحد لكل عيادة (1-to-1).
```
clinic_id      uuid PK → clinics
clinic_name    text
doctor_name    text   -- اسم الدكتور للعرض (من settings مش doctor_profiles)
address        text
phone          text
price_new      int default 200
price_followup int default 100
updated_at     timestamptz
```
- RLS: أعضاء العيادة يقروا ويعدلوا / admin يقرأ الكل

---

### 7. `patients` ⭐ GLOBAL
المريض جدول عالمي — مش مربوط بعيادة معينة.
```
id               uuid PK
user_id          uuid → auth.users (nullable — مش شرط يكون مسجل)
guardian_id      uuid → patients (nullable — للأطفال وكبار السن)
name             text NOT NULL
phone            text unique globally (when not empty)
national_id      text unique globally (nullable)
date_of_birth    date (nullable)
gender           gender_type (nullable)  -- male | female
blood_type       blood_type_enum (nullable)  -- A+ A- B+ B- AB+ AB- O+ O-
address          text
profile_complete boolean default false
created_at       timestamptz
updated_at       timestamptz
```
- Indexes: `unique_user_id`, `unique_phone`, `unique_national_id`, `name_fts` (gin), `guardian_idx`, `user_idx`
- RLS:
  - المريض يشوف ويعدل نفسه (عبر `user_id`)
  - Guardian يشوف ويعدل أبناؤه
  - أعضاء العيادة يشوفوا مرضى عيادتهم (عبر `clinic_patients`)
  - admin يشوف الكل

**⚠️ مهم جداً:**
- مريض واحد = record واحد في التطبيق كله
- التعرف عليه بالـ phone أو national_id
- لو مش مسجل → `user_id = null`، بيتربط لما يسجل عبر `link_patient_to_auth()`
- Guardian = مريض تاني (الأب نفسه patient في النظام)

---

### 8. `patient_medical_info`
التاريخ الطبي — global زي patients، 1-to-1.
```
patient_id          uuid PK → patients
chronic_diseases    text[] default '{}'
allergies           text[] default '{}'
current_medications text
past_surgeries      text
family_history      text
notes               text
updated_at          timestamptz
updated_by          uuid → auth.users (nullable)
```
- RLS:
  - المريض نفسه يقرأ ويعدل
  - Guardian يقرأ ويعدل أبناؤه
  - أعضاء العيادة اللي المريض عندها يقروا ويعدلوا
  - admin يقرأ الكل
- **بيتعمل تلقائياً** مع كل patient جديد عبر `find_or_create_patient()`

---

### 9. `clinic_patients` ⭐ BRIDGE
العلاقة بين المريض والعيادة — هنا بيحصل العزل.
```
clinic_id   uuid PK → clinics
patient_id  uuid PK → patients
local_notes text   -- ملاحظات خاصة بالعيادة، المريض مش يشوفها
linked_at   timestamptz
linked_by   uuid → auth.users (nullable)
```
- Indexes: `patient_idx`, `clinic_idx`
- RLS: أعضاء العيادة CRUD / admin يقرأ الكل
- **المريض مش بيعرف راح كام عيادة** — كل عيادة تشوف بس اللي عندها

---

### 10. `visits`
الزيارات — مربوطة بالعيادة والمريض والدكتور.
```
id           uuid PK
clinic_id    uuid → clinics
patient_id   uuid → patients
doctor_id    uuid → auth.users (nullable)
ticket       int
visit_type   visit_type  -- new | followup
status       visit_status -- waiting | serving | done
visit_date   date
visit_time   time
vital_signs  jsonb (nullable)
             -- keys: weight_kg, height_cm, bp_systolic, bp_diastolic,
             --       pulse, temp_c, blood_sugar
diagnosis    text
prescription text
notes        text
price        int default 0
paid         int default 0
created_at   timestamptz
updated_at   timestamptz
```
- Indexes: `clinic_date_status_idx`, `unique_ticket_per_day`, `patient_idx`, `doctor_idx`
- RLS:
  - أعضاء العيادة CRUD
  - المريض يشوف زياراته (across all clinics)
  - admin يقرأ الكل
- Realtime enabled على هذا الجدول

---

### 11. `payments`
المدفوعات.
```
id             uuid PK
clinic_id      uuid → clinics
patient_id     uuid → patients
visit_id       uuid → visits (nullable)
amount         int (> 0)
discount       int default 0
payment_method payment_method  -- cash | card | transfer
status         payment_status  -- paid | partial | pending
note           text
created_at     timestamptz
```
- Indexes: `clinic_patient_idx`, `clinic_visit_idx`, `status_idx`
- RLS: أعضاء العيادة CRUD / المريض يشوف مدفوعاته / admin يقرأ الكل

---

### 12. `daily_counters`
عداد التذاكر اليومي لكل عيادة.
```
clinic_id   uuid PK → clinics
day         date PK
last_ticket int default 0
```
- RLS: أعضاء العيادة CRUD / admin يقرأ الكل

---

### 13. `audit_log` ⭐
سجل كل التغييرات على البيانات الحساسة.
```
id         bigint IDENTITY PK
table_name text
record_id  uuid
action     audit_action  -- insert | update | delete
old_data   jsonb (nullable)
new_data   jsonb (nullable)
changed_by uuid → auth.users (nullable)
changed_at timestamptz
clinic_id  uuid (nullable — للفلترة في التقارير)
```
- Indexes: `table_record_idx`, `changed_at_idx`, `clinic_idx`, `user_idx`
- RLS: admin فقط
- **Triggers تلقائية على:** patients, patient_medical_info, visits, payments

---

## Enums

| Enum | Values |
|------|--------|
| `visit_status` | waiting, serving, done |
| `visit_type` | new, followup |
| `clinic_status` | pending, active, rejected |
| `gender_type` | male, female |
| `blood_type_enum` | A+, A-, B+, B-, AB+, AB-, O+, O- |
| `payment_method` | cash, card, transfer |
| `payment_status` | paid, partial, pending |
| `audit_action` | insert, update, delete |

---

## Functions & RPCs

### Helper Functions (لا تُستدعى من التطبيق مباشرة)
```sql
is_admin() → boolean
-- هل المستخدم الحالي أدمن؟ (security definer)

is_clinic_member(p_clinic_id uuid) → boolean
-- هل المستخدم عضو نشط في عيادة نشطة؟

my_clinic_role(p_clinic_id uuid) → text
-- دور المستخدم في العيادة: owner | doctor | reception | null

set_updated_at() → trigger
-- trigger function لتحديث updated_at تلقائياً

audit_trigger_fn() → trigger
-- trigger function لتسجيل كل التغييرات في audit_log
```

### RPCs (تُستدعى من التطبيق)
```sql
find_or_create_patient(
  p_clinic_id   uuid,
  p_name        text,
  p_phone       text default '',
  p_national_id text default null,
  p_address     text default ''
) → uuid
-- ⭐ الأهم — بيدور على المريض بالتليفون أو national_id
-- لو مش موجود بيعمله record جديد
-- بيضمن وجود clinic_patients link
-- بيعمل patient_medical_info تلقائياً

link_patient_to_auth() → void
-- لما مريض يسجل حساب، بيربط auth account بـ patient record الموجود
-- بيدور بالـ phone

allocate_ticket(p_clinic_id uuid, p_day date) → int
-- بيجيب رقم التذكرة الجاي atomic

call_next(p_clinic_id uuid, p_day date) → table(visit_id uuid)
-- بيخلي الـ serving يبقى done
-- بيجيب أول waiting ويخليه serving

create_clinic_for_owner(
  p_clinic_name text,
  p_doctor_name text,
  p_address     text default '',
  p_phone       text default ''
) → uuid
-- بيعمل clinic + clinic_members (owner) + settings في خطوة واحدة

approve_clinic(p_clinic_id uuid) → void
-- admin فقط — بيغير status لـ active

reject_clinic(p_clinic_id uuid, p_reason text default '') → void
-- admin فقط — بيغير status لـ rejected
```

---

## Triggers

| Trigger | جدول | وقت التنفيذ |
|---------|------|------------|
| `on_auth_user_created` | auth.users | بعد insert — بيعمل profiles record |
| `patients_set_updated_at` | patients | قبل update |
| `patient_medical_info_set_updated_at` | patient_medical_info | قبل update |
| `doctor_profiles_set_updated_at` | doctor_profiles | قبل update |
| `visits_set_updated_at` | visits | قبل update |
| `audit_patients` | patients | بعد insert/update/delete |
| `audit_patient_medical_info` | patient_medical_info | بعد insert/update/delete |
| `audit_visits` | visits | بعد insert/update/delete |
| `audit_payments` | payments | بعد insert/update/delete |

---

## العلاقات المهمة

```
auth.users
  ├── profiles (1-to-1, auto via trigger)
  ├── doctor_profiles (1-to-1, optional — للدكاترة بس)
  ├── app_admins (1-to-1, optional)
  ├── clinic_members (1-to-many — في كام عيادة)
  └── patients.user_id (1-to-1, nullable — لما يسجل كمريض)

patients (GLOBAL)
  ├── patient_medical_info (1-to-1)
  ├── patients.guardian_id (self-reference — للأطفال)
  ├── clinic_patients (1-to-many — في كام عيادة)
  ├── visits (1-to-many)
  └── payments (1-to-many)

clinics
  ├── settings (1-to-1)
  ├── clinic_members (1-to-many)
  ├── clinic_patients (1-to-many) ← عزل المرضى
  ├── visits (1-to-many)
  ├── payments (1-to-many)
  └── daily_counters (1-to-many)
```

---

## قرارات معمارية مهمة

### 1. المريض Global
`patients` مفيش فيه `clinic_id`. المريض له هوية واحدة في التطبيق كله.
العزل بيحصل عبر `clinic_patients` + RLS.

### 2. التعرف على المريض
بالـ phone أو national_id — مش بالـ ID.
`find_or_create_patient()` بتتعامل مع كل الحالات.

### 3. Guardian System
`guardian_id` self-reference في patients.
الأب (كـ patient) يتحكم في بيانات ابنه (patient تاني).
لو الطفل كبر وسجل، بيربط `user_id` بنفسه.

### 4. Vital Signs = JSONB
مرن لأن كل تخصص عنده measurements مختلفة.
Expected keys: `weight_kg, height_cm, bp_systolic, bp_diastolic, pulse, temp_c, blood_sugar`

### 5. Doctor = clinic_member بـ role='doctor'
دلوقتي التطبيق = عيادة بدكتور واحد (owner).
`doctor_profiles` جاهز للمستقبل لما نحتاج multi-doctor.
`visits.doctor_id` موجود من الأول لنفس السبب.

### 6. Audit Log تلقائي
كل تغيير على patients/medical_info/visits/payments بيتسجل.
لا يحتاج أي كود في التطبيق.

### 7. Clinic Isolation
العيادة مش بتعرف المريض راح كام عيادة.
كل عيادة تشوف بس `clinic_patients` بتاعتها عبر RLS.

---

## SQL Files

| ملف | محتوى |
|-----|--------|
| `11-master-schema.sql` | الـ schema الكامل من الصفر |
| `12-migrate-doctor-profiles.sql` | إضافة جدول doctor_profiles |

---

## Roadmap (مش implemented لسه)

- `clinic_schedule` — مواعيد الدوام لكل عيادة
- `appointments` — حجز مسبق
- `notifications` — إشعارات
- Multi-doctor clinics — لما نحتاج أكتر من دكتور في عيادة واحدة
- Patient portal — المريض يشوف ملفه وزياراته
