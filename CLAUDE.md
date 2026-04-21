# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

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

To run a single test file, use vitest directly:
```bash
pnpm vitest run path/to/file.tests.ts
```

## Architecture

**Next.js App Router** — pages are React Server Components by default. Use `"use client"` only when browser interactivity is required. Data mutations go through Next.js Server Actions, not a separate API layer.

**`proxy.ts`** is the Next.js Middleware that runs before every route. It validates the session and redirects unauthenticated users to Microsoft Azure AD (OpenID Connect) login. AJAX requests get a 401 instead.

**Database** uses `pg` (PostgreSQL) with a connection pool initialized once at startup in `app/shared/_external/db/setup.ts`. All DB access goes through two wrappers in `app/shared/_external/db/access.ts`:
- `transactional(fn)` — wraps `fn` in a BEGIN/COMMIT/ROLLBACK
- `nontransactional(fn)` — plain pool client, no transaction

Custom PG type parsers are set in `TYPE_MAPPINGS` (dates stay as strings, numerics become JS numbers). Migrations in `db/` run automatically on pool startup.

**Test setup** (`vitest.setup.ts`) spins up an in-memory PGlite database, applies all SQL migrations from `db/`, and mocks `transactional`/`nontransactional` to use PGlite. Three vitest projects run in parallel:
- `unit` — `**/*.tests.ts` (excludes server tests)
- `integration` — `**/server.tests.ts` (hits the mocked DB)
- `storybook` — runs Story interaction tests via Playwright/Chromium

## Repository conventions

Within `app/`, non-route folders are prefixed with `_` to opt out of the Next.js router (e.g. `_components/`, `_data/`, `_external/`, `_helper/`).

Test files use `.tests.ts` suffix. Integration tests (those needing the DB) are named `server.tests.ts`.
