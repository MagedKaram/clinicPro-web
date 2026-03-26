# Phase 2 — Supabase (Backend + Realtime)

## الهدف

- استبدال الـ mock state بـ Supabase (DB + RPC + Realtime).
- تنفيذ كل الـ flows الأساسية عبر Server Actions.

> المرجع التفصيلي (Schema/RPC/RLS) في: `docs/04-backend-spec.md`.

---

## Dependencies (تم)

- `@supabase/supabase-js`
- `@supabase/ssr`

---

## Environment (لازم)

داخل `web/.env.local`:

- `NEXT_PUBLIC_SUPABASE_URL=...`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY=...`

Helpers:

- `web/src/lib/supabase/env.ts`

---

## Schema (تم)

نفّذ سكريبت الاسكيما:

- `docs/05-supabase-phase2-schema.sql`

بيعمل:

- enums: `visit_status`, `visit_type`
- tables: `patients`, `visits`, `settings`, `payments`, `daily_counters` (+ `profiles` للـ roles لاحقًا)
- RPCs: `allocate_ticket(date)` + `call_next(date)`

> ملاحظة: Payments موجودة في schema كجدول `payments` وتم استخدامها في الـ Payments MVP.

---

## Data Layer (قراءة) — تم

قراءات Server Components مع fallback لـ mock أثناء التطوير:

- `web/src/lib/data/server.ts`

---

## Server Actions (كتابة/تشغيل) — تم

كل الـ flows الأساسية موجودة هنا:

- `web/src/lib/actions/clinic.ts`

العمليات:

- `registerVisitAction` (تسجيل مريض + تخصيص ticket + insert visit)
- `callNextAction` (RPC `call_next`)
- `finishVisitAction` (update visit status + medical fields + price)
- `endDayAction` (إغلاق waiting/serving + reset daily counter)
- `saveSettingsAction` (update settings singleton)
- `getQueueStateAction` / `refreshDailyBalanceAction` (refresh سريع للـ UI)

---

## Realtime (تم)

Hook موحد للـ subscription على `public.visits`:

- `web/src/lib/hooks/useVisitsRealtime.ts`

ملاحظات مهمة:

- الـ hook realtime-only افتراضيًا (مفيش polling إلا لو مررت `fallbackPollMs`).
- يفضّل تفعيل fallback polling في الإنتاج كـ safety net لو realtime اتقطع (قيمة صغيرة مثل 5-10 ثواني).
- الاشتراك بدون server-side filter لتفادي فقد UPDATE events في بعض إعدادات replica identity.
- لو التاب hidden بنؤجل refresh لأول ما يرجع visible.

### تفعيل realtime على Supabase

تأكد إن `public.visits` موجودة في publication `supabase_realtime`.

SQL (اختياري):

```sql
do $$
begin
  if not exists (
    select 1 from pg_publication where pubname = 'supabase_realtime'
  ) then
    create publication supabase_realtime;
  end if;
end $$;

alter publication supabase_realtime add table public.visits;

-- لو UPDATE مش بتوصل realtime:
-- alter table public.visits replica identity full;
```

---

## Verification (سريع)

- افتح `/reception` و`/doctor` و`/display`.
- اعمل register من الاستقبال.
- تأكد إن الدكتور/الشاشة بيتحدثوا لحظيًا بدون refresh.

### Billing / Payments (سريع)

- أنهِ كشف من صفحة الدكتور (status -> done).
- تأكد إن الاستقبال يظهر له Billing popup تلقائيًا (أو ضمن "حسابات اليوم").
- سجل دفعة وتأكد أن المتبقي يتحدث وأن `visits.paid` يتم تحديثه.

### Production sanity (قبل نشر Vercel)

- تأكد أن env vars موجودة على Vercel (Production):
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- افتح `/ar/login` و`/en/login` بعد النشر.
