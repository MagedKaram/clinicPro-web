# Phase 2 — Supabase (Backend + Realtime)

## الهدف

- استبدال الـ mock state بـ Supabase (DB + Auth + Realtime).

> التفاصيل الكاملة (Schema/RLS/RPC/Realtime) في: `docs/04-backend-spec.md`.

## Dependencies

- `@supabase/supabase-js`
- `@supabase/ssr`

## Environment

- `.env.local`
  - `NEXT_PUBLIC_SUPABASE_URL=...`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY=...`

## خطوات التنفيذ (مقترحة)

1. Schema + Migrations

- جداول أساسية: `patients`, `visits`, `settings`, `queue_state` (أو modeling مناسب).

2. Data layer

- Server fetch للصفحات Server Components.

3. Realtime

- Subscription لتحديث الـ queue تلقائيًا (بدل mock).

4. Auth & Roles

- حماية routes حسب role: `reception` و`doctor`.

## DoD

- Reception: تسجيل مريض → يولد Visit/Ticket في DB.
- Doctor: استدعاء التالي + إنهاء الكشف يحدّث status.
- Display: يعرض current + waiting من DB مع تحديث realtime.
- Reports: تعتمد على visits فعليًا.
