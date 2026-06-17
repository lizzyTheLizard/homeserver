# AGENTS.md

## Key Commands

```bash
pnpm dev          # Start Next.js dev server (localhost:3000)
pnpm build        # Production build
pnpm test         # Run all tests once (unit, integration, Storybook)
pnpm test:watch   # Run tests in watch mode
pnpm lint         # Run ESLint
pnpm lint:fix     # Run ESLint with auto-fix
pnpm storybook    # Start Storybook on port 6006
pnpm chromatic    # Run Chromatic visual regression tests
pnpm clean        # Remove build artifacts
```

To run a single test file:
```bash
pnpm vitest run path/to/file.tests.ts
```

## Architecture

**Next.js App Router** — pages are React Server Components by default. Use `"use client"` only when browser interactivity is required. Data mutations go through Next.js Server Actions, not a separate API layer.

**Authentication** — `proxy.ts` middleware runs before every route. It validates the session and redirects unauthenticated users to Microsoft Azure AD (OpenID Connect) login. AJAX requests get a 401 instead.

**Database** — PostgreSQL with `pg` driver. Connection pool initialized once at startup in `app/shared/_external/db/setup.ts`. All DB access goes through two wrappers in `app/shared/_external/db/access.ts`:
- `transactional(fn)` — wraps `fn` in a BEGIN/COMMIT/ROLLBACK
- `nontransactional(fn)` — plain pool client, no transaction

Custom PG type parsers in `TYPE_MAPPINGS` (dates stay as strings, numerics become JS numbers). Migrations in `db/` run automatically on pool startup.

## Repository Conventions

- Non-route folders in `app/` are prefixed with `_` to opt out of the Next.js router (e.g. `_components/`, `_data/`, `_external/`, `_helper/`)
- Test files use `.tests.ts` suffix
- Integration tests (those needing the DB) are named `server.tests.ts`
- Server-side action files use the `server.ts` suffix

## Test Setup

Vitest runs three projects in parallel:
- `unit` — `**/*.tests.ts` (excludes server tests)
- `integration` — `**/server.tests.ts` (hits an in-memory PGlite DB seeded with all migrations from `db/`)
- `storybook` — runs Story interaction tests via Playwright/Chromium

## Client-only Rendering

To guard a component or block that must only render on the client, use the `useIsClient()` hook from `app/shared/_helper/useIsClient.ts`:

```ts
const isClient = useIsClient()
if (!isClient) return null
```

This returns `false` on the server and `true` after hydration — no extra render, no flash of empty content.

## Design

All design files are in the `design/` folder — component designs, screen mockups, and exported artifacts. Edit them with OpenDesign.

## Environment Variables

Required in production (see `.env.example` for full list):
- `APP_URL` — Public URL of the app (used for OIDC redirect)
- `DB_CONNECTION_STRING` — PostgreSQL connection string
- `ADMIN_EMAIL` — Email allowed into the Admin app
- `CLIENT_ID`/`CLIENT_SECRET`/`ISSUER` — OIDC application credentials
- `COOKIE_NAME`/`SESSION_PASSWORD` — iron-session cookie name + secret
- `OPENAI_API_KEY` — Required for CoEditor AI features