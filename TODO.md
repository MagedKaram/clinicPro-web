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

## Phase 2 — Supabase (Backend + Realtime)

- [x] إضافة deps: `@supabase/supabase-js` + `@supabase/ssr`
- [x] إعداد `.env.local` (URL + anon key)
- [x] Schema SQL (patients/visits/settings/queue)
- [x] استبدال mock data في Server pages بـ queries (مع fallback أثناء التطوير)
- [x] Realtime subscription على `visits` (بدون polling افتراضيًا)
- [ ] Payments flow: تحصيل/تحديث `paid` + شاشة تسوية المتبقيات
- [ ] Auth + middleware لحماية routes حسب role
- [ ] RLS policies + least-privilege (بدل UNRESTRICTED)

## بكرا نبدأ بإيه (اقتراح عملي)

- (1) تثبيت Realtime 100%: تأكيد Replication/Realtime settings في Supabase + (اختياري) `REPLICA IDENTITY FULL` لو UPDATE مش بتتبعت.
- (2) Payments MVP: من الاستقبال نقدر نسجّل المدفوع على الزيارة وتحديث المتبقي.
- (3) Auth/Roles: شاشة login حقيقية + حماية routes (Reception/Doctor).

## Phase 3 — Polishing + Ops

- [ ] Tests (على الأقل smoke tests) + type-safety tightening
- [ ] Deployment checklist (envs, migrations, backups)

---

## Definition of Done (مختصر)

- مفيش نصوص hard-coded في UI (كلها من `messages/*`)
- مفيش ألوان/ظلال hard-coded في JSX (Tokens-only)
- الصفحات Server افتراضيًا وClient فقط للي محتاج state/events
