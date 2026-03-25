# Backend Spec (Phase 2) — Supabase

> الهدف من الملف ده: يبقى “مرجع واحد” لكل الباك-إند اللي هنحتاجه، بحيث لما نبدأ تنفيذ Phase 2 ما نرجعش ندوّر تاني.

## 0) Scope

### Phase 2 (دلوقتي)

- **Single clinic** (Tenant واحد) + **Role-based** (`reception`, `doctor`).
- DB + Auth + Realtime على Supabase.
- بدون ميزات SaaS إضافية (billing/Stripe/multi-tenant الحقيقي) — دي Phase 3.

### Phase 3 (بعد كده)

- Multi-tenant: إضافة `clinic_id` لكل البيانات + إدارة مستخدمين لكل عيادة.

**قرار التنفيذ دلوقتي (علشان نحول الموجود بسرعة):**

- Phase 2 هتبقى **Single-clinic schema** (بدون `clinics` وبدون `clinic_id` في الجداول).
- لما نكبر بعدين، هنضيف `clinic_id` + سياسات RLS إضافية (موجودة كـ Appendix).

---

## 1) Data Model (Postgres)

### 1.1 Enums

```sql
do $$ begin
  create type visit_status as enum ('waiting', 'serving', 'done');
exception when duplicate_object then null; end $$;

do $$ begin
  create type visit_type as enum ('new', 'followup');
exception when duplicate_object then null; end $$;
```

### 1.2 Tables

#### `profiles` (user → role)

- تربط `auth.users` بالـ app roles.
- في Phase 2: مفيش `clinic_id`.

```sql
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('reception', 'doctor')),
  created_at timestamptz not null default now()
);

create index if not exists profiles_role_idx on public.profiles(role);
```

#### `settings` (singleton)

> Equivalent لـ `settings.json` في Flask.

```sql
create table if not exists public.settings (
  id int primary key default 1,
  clinic_name text not null default '',
  doctor_name text not null default '',
  address text not null default '',
  phone text not null default '',
  price_new int not null default 200,
  price_followup int not null default 100,
  updated_at timestamptz not null default now(),
  constraint settings_singleton check (id = 1)
);

insert into public.settings (id)
values (1)
on conflict (id) do nothing;
```

#### `patients`

```sql
create table if not exists public.patients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null default '',
  address text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists patients_name_idx on public.patients using gin (to_tsvector('simple', name));

-- Unique phone (مع تجاهل الفاضي)
create unique index if not exists patients_unique_phone
  on public.patients(phone)
  where phone <> '';
```

#### `visits`

> Equivalent لـ `visits` في Flask، وهي مصدر الـ queue.

ملاحظات تصميم:

- `visit_date` منفصلة (بدل `date` string) علشان التقارير والفلاتر.
- `ticket` لازم يبقى unique per `(visit_date)`.

```sql
create table if not exists public.visits (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,

  ticket int not null,
  visit_type visit_type not null default 'new',
  status visit_status not null default 'waiting',

  visit_date date not null,
  visit_time time not null,

  diagnosis text not null default '',
  prescription text not null default '',
  notes text not null default '',

  price int not null default 0,
  paid int not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists visits_date_status_idx
  on public.visits(visit_date, status, ticket);

create unique index if not exists visits_unique_ticket_per_day
  on public.visits(visit_date, ticket);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

do $$ begin
  create trigger visits_set_updated_at
  before update on public.visits
  for each row execute function public.set_updated_at();
exception when duplicate_object then null; end $$;
```

#### `payments`

> Equivalent لـ `payments` في Flask.

```sql
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  visit_id uuid references public.visits(id) on delete set null,
  amount int not null check (amount > 0),
  note text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists payments_patient_idx on public.payments(patient_id, created_at);
create index if not exists payments_visit_idx on public.payments(visit_id, created_at);
```

---

## 2) Counters & Atomicity (Tickets + Calling Next)

في Flask كان في `ticket_counter` في الميموري + recovery من DB. في Supabase لازم يبقى **atomic** علشان لو reception فتح من جهازين ما يحصلش duplicate.

### 2.1 `daily_counters`

```sql
create table if not exists public.daily_counters (
  day date not null,
  last_ticket int not null default 0,
  primary key (day)
);
```

### 2.2 RPC: allocate next ticket

```sql
create or replace function public.allocate_ticket(p_day date)
returns int
language plpgsql
security definer
as $$
declare
  v_ticket int;
begin
  insert into public.daily_counters (day, last_ticket)
  values (p_day, 0)
  on conflict (day) do nothing;

  update public.daily_counters
     set last_ticket = last_ticket + 1
   where day = p_day
   returning last_ticket into v_ticket;

  return v_ticket;
end $$;
```

### 2.3 RPC: call next patient (atomic)

> Equivalent لـ `/api/next`.

قواعد:

- لو في `serving` → يتحول `done`.
- أول `waiting` (أصغر ticket) → `serving`.

```sql
create or replace function public.call_next(p_day date)
returns table (visit_id uuid)
language plpgsql
security definer
as $$
declare
  v_next uuid;
begin
  -- اقفل أي serving موجود
  update public.visits
     set status = 'done'
   where visit_date = p_day
     and status = 'serving';

  select v.id into v_next
  from public.visits v
  where v.visit_date = p_day
    and v.status = 'waiting'
  order by v.ticket asc
  limit 1
  for update;

  if v_next is null then
    return;
  end if;

  update public.visits
     set status = 'serving'
   where id = v_next;

  return query select v_next;
end $$;
```

> ملاحظة أمنية: `security definer` لازم يتعمل له RLS سياسات محترمة (قسم 3) + تقييد التنفيذ على الأدوار المطلوبة.

---

## 3) Auth + Roles + RLS (مهم)

### 3.1 Roles المطلوبة

- `reception`: CRUD patients + register visits + add payments + update settings + read reports.
- `doctor`: قراءة queue + update visit medical fields + call next + add charge.
- `display`: read-only queue (ممكن بدون login أو باستخدام user role خاص read-only).

### 3.2 RLS skeleton

**خطوة 1:** شغّل RLS على الجداول.

```sql
alter table public.profiles enable row level security;
alter table public.settings enable row level security;
alter table public.patients enable row level security;
alter table public.visits enable row level security;
alter table public.payments enable row level security;
```

**Helpers (اختياري لكن عملي):**

```sql
create or replace function public.current_role()
returns text
language sql
stable
as $$
  select role from public.profiles where user_id = auth.uid();
$$;
```

**سياسات مثال (Patients):**

```sql
-- Read patients داخل نفس clinic لأي role
create policy "patients_select_same_clinic"
on public.patients for select
using (public.current_role() in ('reception', 'doctor'));

-- Insert/Update patients: reception فقط
create policy "patients_write_reception"
on public.patients for insert
with check (public.current_role() = 'reception');

create policy "patients_update_reception"
on public.patients for update
using (public.current_role() = 'reception')
with check (public.current_role() = 'reception');
```

**Visits policies (مختصر):**

- `select`: reception + doctor + (display لو موجود).
- `insert`: reception (register).
- `update`: doctor (medical fields + status serving/done via RPC) + reception (paid updates لو محتاج).

> تنفيذ السياسات بالكامل هيتكتب وقت التنفيذ، بس الهيكل ده هو اللي هنمشي عليه.

---

## 4) Backend Operations (Mapping من Flask)

القائمة دي بتربط `app.py` القديم باللي هننفذه في Supabase/Next.

### 4.0 Auth (Login/Logout)

في Flask كان فيه session-based auth وكلمات سر ثابتة.

في Supabase:

- نستخدم Supabase Auth (email/password أو OTP) + `profiles.role` علشان نحدد الصلاحيات.
- صفحة `/login` هتعمل sign-in ثم تعمل redirect حسب `profiles.role`.

Mapping:

- Flask: `POST /api/login` + `POST /api/logout`
  - Supabase:
    - `signInWithPassword` (أو أي method نختاره)
    - `signOut`

> بدل “role param” في Flask، الدور بيبقى من `profiles.role`.

### 4.1 Patients

- Flask: `GET /api/patients/check-phone?phone=...`
  - Supabase: `select id,name,phone,address from patients where phone = :phone and phone <> '' limit 1`

- Flask: `GET /api/patients/search?q=...`
  - Supabase: `ilike(name, %q%) or ilike(phone, %q%)` + `limit 10`

- Flask: `POST /api/patients`
  - Supabase: insert patient (reception) + enforce unique phone

- Flask: `PUT /api/patients/<pid>`
  - Supabase: update patient (reception)

### 4.2 Register (Reception)

- Flask: `POST /api/register`
  - Steps:
    1. find/insert patient
    2. allocate ticket = `allocate_ticket(today)`
    3. insert visit with `status='waiting'`, `visit_type`, `visit_date`, `visit_time`, `price` default from settings

**Default price**

- `settings.price_new` for `new`
- `settings.price_followup` for `followup`

### 4.3 Queue state

- Flask: `GET /api/state`
  - Supabase query:
    - `select * from visits where visit_date=today and status in ('waiting','serving') order by ticket`
  - `current` = ticket of serving (or 0)
  - `waiting_count` = count waiting

- Flask: `GET /api/current-serving-patient`
  - Supabase: fetch serving visit + patient + history (قسم 4.5)

- Flask: `POST /api/reset`
  - Supabase (reception): update كل زيارات اليوم `waiting/serving` → `done` (أو `canceled` لو قررنا نضيفها)
  - reset counter:
    - update `daily_counters.last_ticket = 0` لليوم (أو delete row)

### 4.4 Doctor actions

- Flask: `POST /api/next`
  - Supabase: `rpc('call_next', { p_day })` ثم fetch visit full data

- Flask: `PUT /api/visits/<vid>` (update diagnosis/prescription/notes/price)
  - Supabase: update `visits` fields (doctor)

- Flask: `POST /api/visits/<vid>/finish`
  - Supabase: update visit status → `done` + medical fields + price
  - Reception “billing popup” يتبني من realtime update (status done) + reads patient balance

- Flask: `POST /api/visits/<vid>/add-charge`
  - Supabase: update visit `price = price + amount`

### 4.5 Patient file (Doctor)

- Flask: `GET /api/patient-file/<patient_id>?visit_id=...`
  - Supabase:
    - patient row
    - visits history: `select * from visits where patient_id=:pid and status='done' order by visit_date desc, created_at desc`
    - last_visit: أول visit `done` غير current

### 4.6 Payments + Balance

- Flask: `POST /api/payments` (reception)
  - Supabase:
    1. insert payment (patient_id, visit_id?, amount, note)
    2. update `visits.paid = visits.paid + amount` لو visit_id موجود (زي Flask)

- Flask: `GET /api/payments/visit/<visit_id>`
  - Supabase:
    - `select * from payments where visit_id = :visit_id order by created_at`
    - `total` = sum(amount)

- Flask balance logic (مرجع):
  - `charged` = sum(price) for visits status done
  - `paid` = sum(payments.amount)
  - `balance` = charged - paid

> في Supabase يفضل نعمل View أو RPC `get_patient_balance(patient_id)` بدل ما نحسب في JS كل مرة.

### 4.7 Reports

- Flask: `GET /api/report` (today)
- Flask: `GET /api/reports/financial?from&to`
- Flask: `GET /api/reports/patient?patient_id`
- Flask: `GET /api/reports/debtors?q&min_balance`

في Supabase:

- ننفّذها كـ SQL queries في Server Components (الأسهل)، أو RPCs لو محتاجين logic معقد.

---

## 5) Realtime (بديل Socket.IO)

بدل events المخصصة في Flask، نستخدم Supabase Realtime (Postgres changes):

### Pages subscriptions

- Reception:
  - subscribe على `visits` (insert/update) لليوم
  - subscribe على `payments` (insert) علشان تحديث balances بسرعة

- Doctor:
  - subscribe على `visits` (insert/update) لعرض queue sidebar

- Display:
  - subscribe على `visits` (update status→serving) علشان يعرض current + يعمل صوت

### بديل “billing_popup”

- في Flask كان في event `billing_popup`.
- هنا: لما visit يتحول `done` (update) وبيبقى فيه `diagnosis/prescription/price`، الاستقبال يلتقطه realtime ويعرض نفس الـ popup.

---

## 6) Next.js Integration Checklist

### Packages

- `@supabase/supabase-js`
- `@supabase/ssr`

### Env

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Folders (اقتراح)

- `web/src/lib/supabase/server.ts` (server client)
- `web/src/lib/supabase/client.ts` (browser client)
- `web/src/lib/supabase/middleware.ts` (auth cookies helpers)

### Guarding routes

- middleware + role guard:
  - `/[locale]/reception` → role reception
  - `/[locale]/doctor` → role doctor
  - `/[locale]/display` → read-only (قرار)
  - `/[locale]/reports` → reception (أو both)

---

## 7) Open decisions (نحسمها قبل التنفيذ)

1. **Display auth**

- هل شاشة العرض تبقى public read-only؟ ولا user خاص display؟

2. **Denormalized `visits.paid`**

- نكمل زي Flask (نحدّث paid مع كل payment)؟
- ولا نحسب paid من payments فقط (أصح)؟

3. **RPC Security**

- نقيّد `allocate_ticket` و `call_next` لمين؟ (غالباً reception للأولى وdoctor للتانية)

---

## Appendix B — لما نكبر بعدين (Multi-tenant)

لما نحتاج Multi-tenant، الخطة تكون:

- إضافة جدول `clinics`.
- إضافة عمود `clinic_id` لكل الجداول الرئيسية (`patients`, `visits`, `payments`, `settings`, `daily_counters`).
- تعديل `profiles` لإضافة `clinic_id`.
- تحديث كل RLS policies لتتحقق من `clinic_id = current_clinic_id()`.
- تحديث RPCs (`allocate_ticket`, `call_next`) لإضافة `p_clinic_id` أو الاعتماد على `current_clinic_id()`.

---

## Appendix A — Legacy reference (Flask)

**Database tables (SQLite):**

- `patients(id, name, phone, address, created_at)`
- `visits(id, patient_id, ticket, visit_type, date, time, status, diagnosis, prescription, notes, price, paid, created_at)`
- `payments(id, patient_id, visit_id, amount, note, created_at)`

**Socket.IO events:**

- `state_update`
- `new_patient_called`
- `patient_ready`
- `billing_popup`
- `charge_added`
