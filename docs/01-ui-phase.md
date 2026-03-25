# Phase 1 — UI (Next.js)

## الهدف

- بناء UI كاملة (Reception/Doctor/Display/Reports/Login) باستخدام mock state فقط.

## قواعد لازمة

- Tokens-only (من غير ألوان/ظلال hard-coded داخل JSX).
- Server Components by default.
- "use client" فقط عند الحاجة (state/events/effects).
- أي UI تتكرر 2+ مرات → shared component.

## الوضع الحالي

- Reception UI متنفذة داخل `web/src/components/reception/*`.
- Types: `web/src/types/clinic.ts`.
- Mock data: `web/src/lib/mock-data.ts`.

## DoD

- كل صفحة تفتح بدون أخطاء على `/ar/...` و`/en/...`.
- كل النصوص مترجمة (messages).
- الستايل كله مبني على tokens.
