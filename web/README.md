# Clinic Queue — Web (Next.js)

Clinic Queue SaaS — Next.js App Router + TypeScript + Tailwind CSS v4 + `next-intl` + Supabase.

## Run locally

```bash
cd web
pnpm install
pnpm dev
```

Open `http://localhost:3000`.

## Scripts

```bash
pnpm lint
pnpm build
pnpm start
```

## Routing (i18n)

- Localized routes: `/ar/*` and `/en/*`.
- `/` redirects to the default locale.
- `/<locale>` redirects into the app after checking the active clinic.

## Styling rules

- Tokens-only styling: prefer theme tokens from `src/app/globals.css`.
- Avoid hard-coded colors in JSX.
