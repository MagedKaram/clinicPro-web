# Clinic Queue — TODO (Roadmap)

> القاعدة: UI-first دلوقتي. أي data/actions = mock لحد Phase 2.

## Phase 1 — UI (متابعة)

- [x] Scaffold Next داخل `web/` + Tailwind v4 + RTL + Cairo
- [x] Tokens-only في `globals.css`
- [x] Reception UI (تفكيك components + mock state)
- [x] مراجعة سريعة على `/[locale]/reception` في AR وEN (تأكد كل النصوص مترجمة)
- [x] تثبيت Routing UX: تحديد default locale (لو هنفتح `/` يروح لأنهي لغة؟)

## Phase 1.5 — i18n (إكمال)

- [x] `next-intl` setup + middleware + messages
- [x] Localized routes: `/ar/*` و`/en/*`
- [x] تعميم الترجمة على صفحات placeholders (`/display`, `/doctor`, `/reports`, `/login`)
- [x] إضافة namespace لكل صفحة (مثلاً: `doctor.*`, `display.*`, `reports.*`, `login.*`)

## Phase 1.6 — تحويل باقي الشاشات (UI only)

- [x] `/[locale]/display` — UI مطابق للتصميم القديم + mock queue
- [x] `/[locale]/doctor` — UI (Queue sidebar + current patient panel) + mock actions
- [x] `/[locale]/reports` — Placeholder UI + i18n
- [x] `/[locale]/login` — Placeholder UI + i18n
- [ ] `/[locale]/login` — role-based login UI (mock auth) + حماية صفحات حسب الدور

## Phase 1.7 — Marketing Landing (ويبسايت تعريفي)

- [ ] إضافة `/[locale]/landing` (MVP sections: Hero/Features/How/Pricing/Footer)
- [ ] إضافة `landing.*` translations في `web/messages/ar.json` و `web/messages/en.json`
- [ ] الالتزام بـ Tokens-only من `web/src/app/globals.css`

## Phase 2 — Supabase (Backend + Realtime)

- [x] إضافة deps: `@supabase/supabase-js` + `@supabase/ssr`
- [x] إعداد `.env.local` (URL + anon key)
- [x] Schema SQL (patients/visits/settings/queue)
- [x] استبدال mock data في Server pages بـ queries (مع fallback أثناء التطوير)
- [x] Realtime subscription على `visits` (بدون polling افتراضيًا)
- [x] Payments MVP: تحصيل/تحديث `paid` + تسوية المتبقيات + دفع إجمالي متبقي المريض
- [ ] Auth + middleware لحماية routes حسب role
- [ ] RLS policies + least-privilege (بدل UNRESTRICTED)

## Phase 2.5 — Ops / Monitoring (Supabase)

- [ ] Monitoring checklist: Logs/Realtime health/Backups/Alerts (وثّقها في docs)
- [ ] حماية الإنتاج: تقليل الصلاحيات (تجنب grants الواسعة) + تفعيل RLS تدريجيًا
- [ ] Rotate مفاتيح Supabase المستخدمة في التطوير لو تم مشاركتها/تسريبها

## Deployment

- [x] رفع المشروع على GitHub
- [x] إنشاء repo منفصل لـ `web/` لتسهيل Deploy على Vercel
- [ ] Vercel: ربط env vars + Deploy production + تثبيت الدومين

## بكرا نبدأ بإيه (اقتراح عملي)

- (1) Deploy production على Vercel (repo: clinicPro-web) + التأكد من `/ar/login`.
- (2) Auth/Roles: شاشة login حقيقية + حماية routes (Reception/Doctor).
- (3) RLS + سياسات مبدئية: منع أي كتابة من anon في الإنتاج.
- (4) Monitoring: Logs + Backups + Alerts + Realtime health checklist.

## Phase 3 — Polishing + Ops

- [ ] Tests (على الأقل smoke tests) + type-safety tightening
- [ ] Deployment checklist (envs, migrations, backups)

---

## Plan — الأسبوع الجاي (Sprint صغير)

1. Deploy ثابت
   - Vercel Import من `clinicPro-web` + Env vars + التأكد من Routes
2. أمان Supabase
   - تفعيل RLS تدريجيًا + أقل صلاحيات ممكنة
3. مراقبة وتشغيل
   - توثيق Monitoring/Backups/Realtime health + Checklist للطوارئ
4. تحسينات UX/Errors
   - توحيد رسائل أخطاء الدفع/الحدود وتوطينها (AR/EN)

---

## Definition of Done (مختصر)

- مفيش نصوص hard-coded في UI (كلها من `messages/*`)
- مفيش ألوان/ظلال hard-coded في JSX (Tokens-only)
- الصفحات Server افتراضيًا وClient فقط للي محتاج state/events
