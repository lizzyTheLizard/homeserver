# Gutschi.site

A personal multi-application portal running at [www.gutschi.site](https://www.gutschi.site). Built with Next.js, it bundles a few apps behind a shared layer.

## Applications

| App          | Description |
|--------------|-------------|
| **Cash**     | Double-entry bookkeeping for private finances — projects, journals, accounts, reports, monthly closing |
| **CoEditor** | AI-powered document editor backed by an OpenAI-compatible model |
| **Admin**    | Administration dashboard — metrics, configuration, project management |
| **Startpage**| Browser start page with personal favourites |

## Getting started

**Prerequisites:** Node 24, pnpm 10, a PostgreSQL 14+ instance.

```bash
pnpm install
cp .env.example .env   # then fill in the values
pnpm dev
```

The dev server is at `http://localhost:3000`. All routes are protected by OpenID Connect (Microsoft Azure AD by default). Migrations in [db/](db/) run automatically on first DB connection.

## Environment

See [.env.example](.env.example) for the full list. The most important ones:

| Variable                 | Purpose                                          |
|--------------------------|--------------------------------------------------|
| `APP_URL`                | Public URL of the app (used for OIDC redirect)   |
| `DB_CONNECTION_STRING`   | `postgres://user:pass@host:port/dbname`          |
| `ADMIN_EMAIL`            | Email allowed into the Admin app                 |
| `CLIENT_ID`/`CLIENT_SECRET`/`LOGIN_ISSUER` | OIDC application credentials         |
| `COOKIE_NAME`/`SESSION_PASSWORD` | iron-session cookie name + secret        |
| `AI_API_KEY`/`AI_BASE_URL` | AI model endpoint credentials        |
| `MICROSOFT_GRAPH_APPLICATION_ID`/`MICROSOFT_GRAPH_CLIENT_SECRET`/`MICROSOFT_GRAPH_ISSUER` | Microsoft Graph (Outlook) OIDC credentials |
| `LOG_URL` | URL to log dashboard         |

In production every required var must be set; the app fails fast on startup otherwise.

## Commands

| Command            | Description |
|--------------------|-------------|
| `pnpm dev`         | Next.js dev server (hot reload) |
| `pnpm build`       | Production build |
| `pnpm start`       | Run the production build |
| `pnpm test`        | All tests once (unit + integration + Storybook) |
| `pnpm test:watch`  | Tests in watch mode |
| `pnpm vitest run path/to/file.tests.ts` | Run a single file |
| `pnpm lint`        | ESLint |
| `pnpm lint:fix`    | ESLint with auto-fix |
| `pnpm storybook`   | Storybook on port 6006 |
| `pnpm chromatic`   | Visual regression tests |
| `pnpm clean`       | Remove build artefacts |

## Architecture

Next.js App Router with React Server Components by default. Mutations are exposed as Server Actions (`'use server'` files); there is no separate API layer.

`server.ts` is a custom HTTP server that wraps Next.js and handles authentication before every route. It validates the iron-session cookie and redirects unauthenticated users to the OIDC provider; AJAX requests get a `401` instead. All `/shared/auth/*` paths are allowed without authentication.

Postgres is accessed through one connection pool created lazily on first use. Two helpers in `app/shared/_external/db/access.ts` wrap every query:

- `transactional(fn)` — `BEGIN`/`COMMIT`/`ROLLBACK` around `fn`
- `nontransactional(fn)` — plain pool client

Per-row ownership is keyed on the user's email (`owner_email`). There is no `users` table — the email comes from the OIDC `email` claim and is denormalised onto every domain row.

## Design

All design files live in [design/](design/) and can be edited with [OpenDesign](https://open-design.ai/). The folder contains component designs, screen mockups, and exported artifacts for the various apps.

## Repository layout

```
/
├── app/
│   ├── admin/          Admin portal
│   ├── cash/           Bookkeeping app  (see [app/cash/CASH.md](app/cash/CASH.md))
│   ├── coeditor/       AI editor
│   ├── startpage/      Personal startpage settings and components
│   └── shared/         Cross-cutting helpers, components, DB access, authentication
├── db/                 SQL migration scripts (see [db/README.md](db/README.md))
├── infrastructure/     Terraform (Scaleway, Terraform Cloud, see [infrastructure/README.md](infrastructure/README.md))
├── .github/workflows/  CI/CD (lint → test → Chromatic → Docker build → deploy)
├── .storybook/         Storybook configuration
├── Dockerfile          Production image (Node 20 Alpine)
├── server.ts            Custom HTTP server (auth, WS)
```

Inside `app/`, folders that are not Next.js routes are prefixed with `_` (e.g. `shared/_components/`, `cash/_data/`, `coeditor/_external/`) to opt out of the router. Server-side action files use the `server.ts` suffix; integration tests use `server.tests.ts`; unit tests use `*.tests.ts`.

## Tests

Three vitest projects run in parallel:

- `unit` — `**/*.tests.ts` (excluding server tests), no DB
- `integration` — `**/server.tests.ts`, runs against an in-memory PGlite DB seeded with all migrations from `db/`
- `storybook` — Story interaction tests via Playwright/Chromium

`pnpm test` is configured with `--no-file-parallelism` because the integration tests share the PGlite instance.

## License

Private — all rights reserved.
