# Clinic Queue — Progress Log

> الغرض: تسجيل كل اللي اتعمل (بشكل مختصر وواضح) علشان ما نضيعش السياق.

## 0) Legacy (Flask) — فهم النظام الحالي ✅

- تم قراءة وفهم: `app.py` + HTML templates (`login.html`, `reception.html`, `doctor.html`, `display.html`, `reports.html`).
- تم توثيق الـ flows الأساسية (Login/Reception/Doctor/Display/Reports) وملخص للأحداث (Socket.IO) ونقاط التحويل لـ SaaS.

## 1) Next.js UI Phase — تأسيس المشروع ✅

- تم إنشاء مشروع Next داخل `web/` (App Router + TypeScript).
- تم إعداد Tailwind v4 (CSS-first) + RTL + خط Cairo.
- تم إنشاء tokens/utility classes في `web/src/app/globals.css` وفق قاعدة: Tokens-only (بدون ألوان hard-coded داخل JSX).
- تم إضافة helper `cn()` (clsx + tailwind-merge) لتجميع الكلاسات.

## 2) Reception UI — تحويل واجهة الاستقبال ✅

- تم تحويل `reception.html` إلى صفحة Next `/[locale]/reception` مع تفكيك المكونات داخل:
  - `web/src/components/reception/*`
- تم إنشاء Types UI-first:
  - `web/src/types/clinic.ts`
- تم إنشاء mock data لتشغيل الواجهة بدون Backend:
  - `web/src/lib/mock-data.ts`

## 3) Hydration Mismatch — حل تحذير التشغيل ✅

- ظهر hydration mismatch في dev بسبب Browser Extension يضيف attributes للـ `<body>`.
- تم التعامل معه (وتم توثيق السبب) بحيث ما يمنعش التطوير.

## 4) i18n (AR/EN) — تأسيس bilingual routing ✅

- تم تثبيت `next-intl`.
- تم إضافة بنية i18n:
  - `web/src/i18n/*`
  - `web/src/middleware.ts`
  - `web/messages/ar.json` و `web/messages/en.json`
- تم نقل الصفحات إلى Route structure مبني على locale:
  - `web/src/app/[locale]/**`
- تم إنشاء placeholders للصفحات المرتبطة من الهيدر:
  - `/[locale]/display`, `/[locale]/doctor`, `/[locale]/reports`, `/[locale]/login`

## 5) Reception i18n — تحويل النصوص داخل الواجهة ✅

- تم استبدال النصوص hard-coded داخل مكونات الاستقبال لاستخدام `useTranslations('reception')`.
- تم جعل روابط الهيدر locale-aware (تفتح `/ar/...` أو `/en/...`).

## 6) Supabase (Phase 2) — Backend + Server Actions ✅

- تم إضافة Supabase deps: `@supabase/supabase-js` و `@supabase/ssr`.
- تم إضافة helpers للـ env + clients:
  - `web/src/lib/supabase/env.ts`
  - `web/src/lib/supabase/server.ts`
  - `web/src/lib/supabase/client.ts`
- تم إنشاء/تحديث Schema SQL داخل docs:
  - `docs/05-supabase-phase2-schema.sql`
- تم بناء Data layer للقراءة من Supabase مع fallback لـ mock أثناء التطوير:
  - `web/src/lib/data/server.ts`
- تم تنفيذ Server Actions للـ flows الأساسية:
  - تسجيل مريض + إصدار تذكرة (allocate ticket + insert visit)
  - استدعاء التالي (RPC)
  - إنهاء الكشف (update visit)
  - إنهاء اليوم (إغلاق الزيارات + reset counter)
  - حفظ الإعدادات
  - تحديث متبقيات اليوم
  - `web/src/lib/actions/clinic.ts`
- تم جعل صفحات الاستقبال/الدكتور/العرض dynamic لتجنب staleness:
  - `export const dynamic = "force-dynamic"`

## 7) Realtime — تحديث لحظي حقيقي ✅

- تم إضافة hook موحد للـ realtime على جدول `visits`:
  - `web/src/lib/hooks/useVisitsRealtime.ts`
- تم تثبيت Supabase Browser client كـ singleton لتجنب فتح sockets متعددة.
- تم جعل الـ hook “realtime-only” افتراضيًا (بدون polling) + تحسين سلوك tab visibility:
  - لو التاب hidden بنؤجل الـ refresh لحد ما يرجع visible.
- تم تفعيل publication للـ realtime على `public.visits` (Supabase `supabase_realtime`).

## 8) Payments + Billing (MVP) — تحصيل وتسوية المتبقيات ✅

- تم إضافة Flow للمدفوعات عبر جدول `payments` مع الحفاظ على `visits.paid` للتقارير السريعة.
- تم تنفيذ منطق دفع “إجمالي المتبقي على المريض” وتوزيع الدفع على زيارات اليوم المنتهية (done) بدون overpay.
- تم تحديث واجهة الاستقبال:
  - Billing popup مبسط + زر تعبئة المتبقي (Remaining) + تعطيل الأزرار أثناء طلبات الباك.
  - إغلاق الـ popup تلقائيًا بعد نجاح الدفع.
- تم إضافة كروت/قائمة “حسابات اليوم” (اليوم الذي تم إنهاء كشفه ومازال عليه متبقي) مع إمكانية إعادة فتح التحصيل.

## 9) Reception UX Parity — سلوك مطابق للتطبيق القديم ✅

- لو تم إدخال رقم موبايل يخص ملف موجود بدون اختيار "مريض موجود" يتم عرض تحذير + زر "استخدام الملف".
- عند اختيار مريض موجود يتم عرض ملخص مالي مختصر (إجمالي/مدفوع/متبقي/عدد الزيارات).
- تم تعطيل زر التسجيل أثناء الإضافة + عمل reset للفورم بعد نجاح التسجيل.

## 10) Doctor — ملف المريض (Medical History) ✅

- تم إضافة نافذة "سجل المريض" داخل الدكتور لعرض الزيارات السابقة المنتهية (done) مع التفاصيل والملخص المالي.
- Auto-open مرة واحدة لكل زيارة حالية (serving) لو فيه تاريخ سابق.

## 11) Realtime Reliability — حماية من انقطاع الأحداث ✅

- تم دعم fallback polling (اختياري) في hook الـ realtime كـ safety net عند مشاكل publication/replica identity.
- تم الاعتماد في الاستقبال على “تحديث التقرير ثم diff” لإظهار Billing popup للزيارة التي انتهت للتو (حتى لو realtime missed event).

## 12) Deployment Prep — GitHub + Vercel ✅

- تم رفع المشروع على GitHub.
- تم تجهيز ريبو منفصل لجزء `web/` فقط لتفادي مشاكل Root Directory أثناء النشر على Vercel.

## 13) Docs + Gemini Handoff — تجهيز للمراجعة/التسليم ✅

- تم إضافة ملف `GEMINI.md` في الجذر لتجميع السياق + قواعد التنفيذ + المطلوب لصفحة Landing.
- تم تحديث `web/README.md` ليعكس أوامر التشغيل الفعلية بدل قالب Next الافتراضي.
- تم التأكد إن `pnpm lint` و `pnpm build` بيعدّوا بنجاح (مع تحذير واحد بخصوص convention `middleware`).

---

## ملاحظات

- Phase 2 شغّالة (Supabase + actions + realtime + payments MVP). المتبقي: Auth/Roles + RLS + تحسينات تشغيل/مراقبة DB حسب الأولوية.
