---
description: "Gemini Pro 3 prompt: build a modern minimal bilingual (AR/EN) marketing site + login + purchase pages for Clinic Queue using Next.js App Router, next-intl, and Tailwind tokens only."
---

# Gemini Pro 3 — Prompt (ClinicPro Marketing Site + Login + Purchase)

You are implementing a marketing website inside an existing Next.js (App Router) codebase.

## Goal

Create a modern minimal bilingual (Arabic/English) marketing site that introduces the product and leads doctors to start a trial by signing up.

Must include:

- Marketing pages
- Signup (trial) that creates a doctor account and a clinic
- Login
- Purchase page UI (optional / stub)

After signup/login, the user must have a **token** (Supabase Auth session JWT) and all data must be scoped to the user’s **clinic**.

## Non‑Negotiables (must follow)

1. **Next.js App Router + TypeScript**
2. **Internationalization** using `next-intl`:
   - All text must come from `messages/ar.json` and `messages/en.json`.
   - Use existing i18n routing pattern: locale segment is `src/app/[locale]/**`.
3. **Styling**
   - Use Tailwind CSS v4 and existing theme tokens only.
   - Do **NOT** add hard-coded colors/shadows/fonts inside JSX.
   - Prefer existing tokens such as `land-teal`, `land-sky`, and existing utilities defined in `globals.css`.
4. **Server/Client split**
   - Pages (`page.tsx`, `layout.tsx`) should be **Server Components by default**.
   - Add `"use client"` only to components that need state/effects/events or `framer-motion`.
   - Use the **RSC slots pattern** when a client component needs to render server-built sections.
5. **No extra UX beyond spec**
   - Build only what is requested: marketing pages + login page + purchase page.
   - No extra modals, dashboards, or admin panels.

6. **Supabase Auth + Multi‑clinic scoping**
   - Use Supabase Auth for signup/login.
   - Treat the “token” as the Supabase session (JWT) managed via `@supabase/ssr` cookies.
   - Every row in operational tables must be scoped by `clinic_id` and protected by RLS.

## Scope / Pages to implement

All pages must be under the locale segment: `/ar/...` and `/en/...`.

1. **Marketing Home**
   - Route: `src/app/[locale]/landing/page.tsx`
   - IMPORTANT: Do NOT change `src/app/[locale]/page.tsx` (it currently redirects into the clinic app after auth/active clinic checks).
   - Sections (single page):
     - Hero (product title + short description + primary CTA)
     - Social proof / stats (small)
     - Features (3–6 cards)
     - How it works (3 steps)
     - Pricing teaser (link to pricing page)
     - Final CTA (go to buy)

2. **Features page**
   - Route: `src/app/[locale]/features/page.tsx`
   - Minimal list of features with short descriptions.

3. **Pricing page**
   - Route: `src/app/[locale]/pricing/page.tsx`
   - Show 2–3 plans max (e.g., Starter/Pro/Clinic). Keep it simple.
   - Each plan has: name, price, bullets, CTA → buy.

4. **Purchase page** (UI-only checkout)
   - Route: `src/app/[locale]/buy/page.tsx`
   - Minimal form: clinic name, doctor name, email, phone, selected plan.
   - CTA button “Start trial / Proceed” should:
     - Create account (Signup) if not logged in
     - Create clinic for the owner (RPC)
     - Show success state (inline) and link to login
   - Payment can be stubbed (no Stripe now).

5. **Signup page**
   - Route: `src/app/[locale]/signup/page.tsx`
   - Minimal form: clinic name, doctor name, email, password
   - On submit:
     - `supabase.auth.signUp({ email, password })`
     - then call RPC `create_clinic_for_owner(...)`
     - show success state + link to login

6. **Login page**
   - Route: `src/app/[locale]/login/page.tsx` (already exists in the app; refine it to match the marketing style)
   - Use Supabase Auth login (email/password) for the doctor.
   - Role-based UI can remain minimal (trial = doctor only).

## Navigation requirements

- Create a simple top navigation shared across marketing pages:
  - Links: Home, Features, Pricing, Login
  - Primary CTA button: Buy
  - Locale switcher (AR/EN) that preserves current path.

## Design direction

- Modern + minimal.
- Reuse existing design system / tokens; do not introduce new colors.
- Add subtle motion with `framer-motion` (small, not flashy). Avoid big page transitions.
- Must look good in RTL for Arabic.

## Recommended component breakdown (keep files small)

Create components under `src/components/marketing/`:

- `MarketingTopBar` (Server) — receives labels via translations.
- `LocaleSwitcher` (Client) — handles switching locale.
- `HeroSection` (Client, framer-motion)
- `StatsRow` (Server)
- `FeaturesGrid` (Server) + `FeatureCard` (Client motion optional)
- `HowItWorks` (Server)
- `PricingCards` (Server)
- `CTASection` (Client motion optional)
- `Footer` (Server)

Purchase page components under `src/components/marketing/buy/`:

- `PlanPicker` (Client)
- `CheckoutForm` (Client)

Login page components under `src/components/auth/`:

- `LoginCard` (Client, framer-motion optional)

## Data model (UI-first)

Marketing is UI-first, but **Signup/Login must be real** using Supabase Auth.

Use Supabase clients:

- Server: existing `createSupabaseServerClient()`
- Client: existing `createSupabaseBrowserClient()`

Do not invent new env vars. Use:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### What “token” means

Use Supabase session JWT (access token) managed via cookies by `@supabase/ssr`. Do not implement custom API tokens.

### Active clinic

After login, resolve an `activeClinicId` (first membership) by querying `clinic_members`.

## i18n keys to add

Add a new namespace: `landing.*` and `buy.*` and extend `login.*` / `signup.*` if needed.
Examples (expand as needed):

- `landing.nav.home`, `landing.nav.features`, `landing.nav.pricing`, `landing.nav.login`, `landing.nav.buy`
- `landing.hero.title`, `landing.hero.subtitle`, `landing.hero.ctaPrimary`, `landing.hero.ctaSecondary`
- `landing.features.title`, `landing.features.items.<id>.title`, `landing.features.items.<id>.desc`
- `landing.how.title`, `landing.how.steps.<id>.title`, `landing.how.steps.<id>.desc`
- `landing.pricing.title`, `landing.pricing.plans.<id>.name`, `landing.pricing.plans.<id>.price`, `landing.pricing.plans.<id>.cta`
- `buy.title`, `buy.form.clinicName`, `buy.form.doctorName`, `buy.form.email`, `buy.form.phone`, `buy.form.plan`, `buy.submit`, `buy.success.title`, `buy.success.body`, `buy.success.loginLink`

## Technical constraints from this codebase

- Uses `next-intl` plugin in `next.config.ts`.
- Messages are loaded dynamically from `messages/${locale}.json`.
- Keep routes under `/[locale]/...`.

## Database contract (Multi‑Clinic)

Implement the database following these docs in the repo:

- `docs/06-multiclinic-auth-rls.md`
- `docs/06-multiclinic-schema.sql`

### Required tables

- `clinics(id, name, created_at)`
- `clinic_members(clinic_id, user_id, role, created_at)`
- `settings(clinic_id, clinic_name, doctor_name, address, phone, price_new, price_followup, updated_at)`
- `patients(..., clinic_id, ...)`
- `visits(..., clinic_id, ...)`
- `payments(..., clinic_id, ...)`
- `daily_counters(clinic_id, day, last_ticket)`

### Required RPCs

- `create_clinic_for_owner(p_clinic_name, p_doctor_name, p_address, p_phone) -> clinic_id`
- `allocate_ticket(p_clinic_id, p_day) -> int`
- `call_next(p_clinic_id, p_day) -> visit_id`

### RLS requirement

RLS must ensure a logged-in user can only read/write rows where they are a member of the row’s `clinic_id`.

## Acceptance checklist

- Build passes: `pnpm build`.
- No hard-coded text in JSX.
- No hard-coded colors/shadows in JSX.
- AR/EN both work with correct RTL/LTR.
- Marketing pages accessible from navigation.
- Signup creates an account and clinic (trial) and shows success state.
- Buy page can reuse signup/clinic-creation flow and shows success state.
- Login works and user stays signed-in (session cookies).

## Output format (what you should return)

- List all files you created/edited.
- Provide the final code for each new/updated file.
- Keep changes minimal and consistent with existing patterns.
