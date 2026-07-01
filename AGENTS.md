# AGENTS.md

## Key Commands

```bash
pnpm build        # Production build
pnpm test         # Run all tests once (unit, integration, Storybook)
pnpm lint         # Run ESLint
pnpm chromatic    # Run Chromatic visual regression tests
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

## Conventions

- Non-route folders in `app/` are prefixed with `_` to opt out of the Next.js router (e.g. `_components/`, `_data/`, `_external/`, `_helper/`)
- Server side actions for each page are defined in a `server.ts` located right beside the `page.ts`
- All CSS is written in CSS modules names `*.module.css` localted right beside the module. Do not add inlie CSS in HTML files
- To guard a component or block that must only render on the client, use the `useIsClient()` hook from `app/shared/_helper/useIsClient.ts`:

## Test Setup

Vitest runs three projects in parallel:
- `unit` — `**/*.tests.ts` (excludes server tests)
- `integration` — Each `erver.ts` has an integration test `server.tests.ts` which hits an in-memory PGlite DB seeded with all migrations from `db/`
- `storybook` — runs Story interaction tests via Playwright/Chromium

## Design

All design files are in the `design/` folder — component designs, screen mockups, and exported artifacts. Edit them with OpenDesign.

