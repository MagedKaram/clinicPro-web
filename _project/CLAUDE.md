## Agent Orientation — Read This First

All project context lives in _project/. Before doing ANY work, read:
1. _project/SPEC.md — steps tracker. Check what is done and what is planned
2. _project/STATE.md — current app state, routes, components, known issues
3. _project/DATABASE.md — full DB schema, tables, RPCs, RLS, design decisions
4. _project/CLAUDE.md — coding rules (this file)

When you finish any step:
- Mark it [x] in SPEC.md
- Add one line to _project/PROGRESS.md: "✅ [Step ID] — what you did — date"
- Update STATE.md if routes or components changed

Never rely on memory from a previous session. Always re-read _project/ first.

Current deployed schema: 11-master-schema.sql + 12-migrate-doctor-profiles.sql
Codebase status: still on OLD schema. Group A fixes this — do Group A first.

Role boundaries (never cross):
- Reception/Owner: adds patients, registers visits, handles billing
- Doctor: calls next, fills exam + vital_signs + medical_info, finishes visit
- Doctor profile (specialty, bio, license_number): collected at signup AND editable in settings

# Clinic Queue — Project Context for AI

## المشروع

نظام إدارة قوائم انتظار العيادات. تحويل من Flask + SQLite + Socket.IO إلى SaaS بـ Next.js.

**Working directory:** `e:\clinic_queue\website\web\`
**Original HTML templates:** `e:\clinic_queue\templates\` (5 files — المرجع للتصميم)
**Docs:** `e:\clinic_queue\website\docs\`
**Progress file:** `e:\clinic_queue\website\PROGRESS.md`

---

## الحالة الآن — Phase 1 ✅ مكتمل + UI Figma Polish ✅

البيلد شغال clean. كل النصوص مترجمة (AR/EN). الـ UI متطابق مع Figma.

**Stack:** Next.js 16 · TypeScript · Tailwind CSS v4 · shadcn/ui · framer-motion · next-intl

**5 صفحات:**

- `/login` → Client (form + animation)
- `/reception` → Client (tabs + stats bar + useQueue hook)
- `/doctor` → **Server** (RSC slots → DoctorTabs Client)
- `/display` → **Server** (RSC slots → CurrentNumberDisplay Client)
- `/reports` → **Server** (RSC slots → ReportsTabs Client)

**Server/Client rule:**

- الصفحات Server بـ default
- "use client" فقط عند: useState / events / browser APIs / framer-motion
- Pattern: Server page يمرر RSC slots لـ Client tab switcher
- **Exception:** إذا component imported من Client parent → لازم تكون Client أو تُمرَّر كـ slot

**Theme tokens** معرّفة في `globals.css` (`@theme inline`):

- `rec-*` → الاستقبال والتقارير (light blue)
- `doc-*` → الدكتور (dark blue)
- `dis-*` → شاشة العرض (very dark)
- `land-teal` → `#00c9b1` · `land-sky` → `#0ea5e9` (landing page)
- `warning` → `#f59e0b` · `success` → `#2e7d32` · `danger` → `#e53935`

**Utilities** معرّفة في `globals.css`:

- `bg-brand-gradient` → `linear-gradient(135deg, #00c9b1, #0ea5e9)`
- `text-brand-gradient` → gradient clip text (teal → sky)

**i18n:**

- كل النصوص في `messages/ar.json` و `messages/en.json`
- `useTranslations("namespace.key")` — يشتغل في Server و Client
- `useLocale()` في Client Components / `await getLocale()` في Server Components
- **Landing namespace:** `landing.nav` · `landing.hero` · `landing.stats` · `landing.features` · `landing.how` · `landing.pricing` · `landing.cta` · `landing.footer`

---

## صفحة الاستقبال — Layout

```
Header: الاستقبال | التقارير / شاشة الانتظار / الدكتور / إنهاء اليوم / خروج
Stats bar (أصفر): متبقيات اليوم — إجمالي | مدفوع | متبقي | تحديث
Tabs: 🏷️ تسجيل المريض | 📊 التقرير (link /reports) | ⚙️ الإعدادات
Content (تسجيل المريض tab):
  [Form — w-110, يمين في RTL] [Queue — flex-1, يسار في RTL]
```

## صفحة الدكتور — Layout

```
Header: 👨‍⚕️ لوحة الدكتور | Clock وسط | استقبال / عرض / إنهاء اليوم / خروج
Tabs: 🏥 الكشف | 🔍 البحث عن مريض | 📊 التقرير (link /reports)
Content (الكشف tab):
  [Queue sidebar — w-72, يسار] | [CurrentPatientPanel — flex-1, يمين]
    قائمة انتظار                  المريض الحالي + 3 stats + استدعاء التالي
```

---

## المرحلة القادمة — Phase 2: Supabase

الخطوات مكتوبة بالكامل في `e:\clinic_queue\website\docs\03-phase2-supabase.md`

ملخص سريع:

1. `pnpm add @supabase/supabase-js @supabase/ssr`
2. `.env.local` بـ Supabase URL + anon key
3. Schema SQL موجود في docs
4. استبدال `mockQueueState` في الـ Server pages بـ Supabase query
5. استبدال `useQueue.ts` بـ Supabase Realtime subscription
6. Auth middleware لحماية الـ routes

**أهم وظائف لازم تُبنى في Phase 2:**

- زر "استدعاء التالي" (يغير status المريض)
- زر "إنهاء الكشف" (يكمل الزيارة + حفظ notes)
- زر "إنهاء اليوم"
- البحث عن مريض موجود
- حفظ الإعدادات

---

## قواعد لازم تتبعها

### ❌ ممنوع منعاً باتاً

```
// ❌ inline style للألوان
style={{ background: "#00c9b1" }}
style={{ color: "#0a5c8a" }}
style={{ borderColor: "rgba(0,201,177,0.2)" }}

// ✅ بدلاً منه: Tailwind token
className="bg-land-teal"
className="text-rec-primary"
className="border-land-teal/20"
```

```
// ❌ نص مكتوب hard-coded
<span>الاستقبال</span>
<p>Reception</p>

// ✅ بدلاً منه: ترجمة دايماً
const t = useTranslations("namespace")
<span>{t("key")}</span>
```

**الاستثناء الوحيد** لـ inline style: القيم المعقدة اللي مفيش ليها token — زي:

- `radial-gradient(...)` في الخلفيات الديكورية
- `box-shadow` فريدة
- `backgroundSize: "40px 40px"` للـ dot grid pattern

### قواعد الـ Server/Client

- **لا "use client"** على الصفحة كلها — فصّل Server/Client
- `mock-data.ts` مؤقت — في Phase 2 كل page بتجيب data من Supabase
- لو component هيتـimport من Client parent → خليها Client وستخدام `useLocale()`

### لما تضيف token أو utility جديدة

1. أضفها في `globals.css` داخل `@theme inline {}` أو كـ `@utility`
2. دوّنها هنا في CLAUDE.md
3. استخدمها في كل المشروع — لا تكرر نفس اللون في أكثر من مكان
