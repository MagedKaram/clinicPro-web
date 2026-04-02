<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

---

# Clinic Queue (web/) — AI Map

This file is a high-signal map of the codebase for AI agents (and humans).
Goal: quickly answer “where is X implemented?” and “what does this function do?”

## App Overview

- **Framework**: Next.js App Router + TypeScript + Tailwind v4 + next-intl
- **Auth & Data**: Supabase (SSR client for Server Components + Browser client for Client Components)
- **Phases**: UI-first with mock fallback; Phase 2 wires Supabase fully.

## Folder Map

### Routing

- `src/app/[locale]/...` — Localized routes.
- Pages are **Server Components by default**. Client interactivity is isolated into client components.

### Supabase helpers

- `src/lib/supabase/env.ts` — Reads Supabase env vars.
- `src/lib/supabase/server.ts` — `createSupabaseServerClient()` (SSR cookies).
- `src/lib/supabase/client.ts` — `createSupabaseBrowserClient()` singleton (prevents multiple realtime sockets).

### Clinic access guard

- `src/lib/clinic/activeClinic.ts`
  - `requireActiveClinicId({ locale })`: resolves clinic membership and enforces `clinics.status == 'active'`.
  - Redirects:
    - unauthenticated → `/{locale}/login`
    - no clinic membership → `/{locale}/signup`
    - clinic pending/rejected → `/{locale}/clinic-status`
  - `requireActiveClinicIdForAction()`: same idea, but throws instead of redirect.

### Server data (RSC)

- `src/lib/data/server.ts` — barrel exports.
- `src/lib/data/settings.ts` — `getSettingsServer()` (mock fallback if Supabase not configured).
- `src/lib/data/patients.ts` — `getPatientsServer()`.
- `src/lib/data/queue.ts` — `getQueueStateServer()`.
- `src/lib/data/dailyBalance.ts` — `getDailyBalanceServer()`.
- `src/lib/data/_shared.ts` — shared fallback warning + `todayISODate()`.

### Server actions (mutations)

- `src/lib/actions/clinic.ts` — **public API** used by client components.
- `src/lib/actions/clinic/*` — implementation split by domain:
  - `queue.ts`: queue reads + `call_next` RPC
  - `visits.ts`: `registerVisitForClinic()`, `finishVisitForClinic()`
  - `billing.ts`: wrapper that re-exports billing actions
  - `billing/*`: visit billing + payments distribution
  - `patientFile.ts`: patient history
  - `reports.ts`: daily report + balance + end-day close
  - `settings.ts`: save settings
  - `time.ts`: date/time helpers

If you need to add a new mutation, prefer adding a small function in the matching module and wiring it through the wrapper.

### UI components

- `src/components/reception/*` — reception UI.
- `src/components/doctor/*` — doctor UI.
- `src/components/display/*` — display UI.
- `src/components/auth/*` — login/signup/password flows.

## Core Flows

### Doctor signup → clinic approval

1. Doctor signs up and requests a clinic.
2. Clinic is created with `status = 'pending'`.
3. Owner/Admin approves from `/{locale}/admin`.
4. Approved clinic becomes `active` and doctor can access app pages.

### Owner/Admin access

- Admin is a Supabase user that exists in `public.app_admins`.
- Page `src/app/[locale]/admin/page.tsx` checks `is_admin()` and shows pending clinic requests.
- Login flow routes admins directly to `/{locale}/admin`.

## Database Scripts (repo root)

- `docs/08-supabase-multiclinic-clean.sql` — bootstrap for **new** projects.
- `docs/09-migrate-admin-clinic-approval.sql` — migration for **existing** projects.

Tip: `create table if not exists` does not add missing columns; use the migration script when upgrading.

## Build & Commands

- `pnpm -C web lint`
- `pnpm -C web build`
- `pnpm -C web dev`

## Design & Scope Constraints

- Use Tailwind tokens only (no hard-coded colors).
- Keep pages Server Components unless client-only behavior is required.
- No extra UX beyond the requested spec.
