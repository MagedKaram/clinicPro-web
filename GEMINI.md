# Gemini Handoff — Clinic Queue (Marketing / Landing)

## الهدف

عايزك تبني **ويبسايت تعريفي (Landing Page)** لمشروع **Clinic Queue SaaS** داخل نفس مشروع Next.js الموجود في `web/`، **بدون ما تكسر صفحات التطبيق الحالية** (Reception/Doctor/Display/Reports).

## بنية الريبو

- `web/` هو مشروع Next.js (App Router) وهو اللي هنشتغل فيه.
- باقي ملفات الجذر (`app.py` + ملفات HTML) هي Legacy Flask (مرجع فقط للتصميم/الـ flows)، مش مطلوب تعديلها.

## قواعد لازم تلتزم بيها (مهمة)

1. **Tokens-only في الستايل**
   - ممنوع ألوان/ظلال/فونتات hard-coded داخل JSX.
   - استخدم الـ tokens والـ utilities الموجودة في `web/src/app/globals.css`.
   - مسموح inline style فقط للحاجات المعقدة جدًا (زي `radial-gradient` / `background-size`) وبأقل قدر.

2. **i18n إلزامي (AR/EN)**
   - أي نص لازم ييجي من `web/messages/ar.json` و `web/messages/en.json`.
   - استخدم `next-intl`:
     - Server Components: `setRequestLocale(locale)`
     - Client Components: `useTranslations("landing")`

3. **Server Components by default**
   - صفحة الـ landing تكون Server افتراضيًا.
   - استخدم `"use client"` فقط لو في تفاعل حقيقي (state/effects/events).

4. **بدون UX إضافي**
   - اعمل المطلوب لصفحة تعريفية فقط.
   - ما تضيفش مودالز/فلاتر/حركات مش لازمة.

## المطلوب تنفيذه (اقتراح مسار آمن بدون كسر التطبيق)

- أضف route جديد للـ landing:
  - `web/src/app/[locale]/landing/page.tsx`
- **ما تغيّرش** behavior الحالي لـ `web/src/app/[locale]/page.tsx` (ده بيروح لـ Reception بعد auth/active clinic).
- خلي صفحة الـ landing **مش محتاجة auth** ومش بتستدعي `requireActiveClinicId`.

## تنظيم الكود المقترح

- Components للـ landing في:
  - `web/src/components/landing/*`
- Keys للترجمة تحت namespace:
  - `landing.*` في `web/messages/ar.json` و `web/messages/en.json`

## محتوى الـ Landing (MVP)

- Sections بسيطة وواضحة:
  - Header/Nav بسيط
  - Hero (value proposition + CTA)
  - Features (3–6 نقاط)
  - How it works (3 خطوات)
  - Pricing (plans بسيطة)
  - Footer

## تشغيل/تحقق

- أوامر التشغيل:
  - `cd web && pnpm dev`
- تحقق إن:
  - `pnpm lint` و `pnpm build` بيعدّوا
  - مفيش نصوص hard-coded
  - مفيش ألوان hard-coded

## ملاحظات

- الصفحات الحالية مبنية على localized routing (`/ar/*` و `/en/*`).
- خليك ملتزم بالستايل العام الموجود في المشروع (tokens/classes) ومتضيفش theme جديد.
