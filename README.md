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

Development happens on the home server's **`dev-machine`** container — that is the
only supported environment, and the dev database already runs there. You do **not**
start the database manually with Docker Compose.

Connect to the dev machine (see [infrastructure/README.md](infrastructure/README.md)
for the full setup):

- **Browser VS Code:** <https://dev.gutschi.site:8443> (dev auth)
- **OpenCode:** <https://dev.gutschi.site:8444> (dev auth)
- **VS Code Remote SSH:** `ssh dev@<host> -p 2222`

Inside the dev machine the repo is already cloned at `/home/dev/workspace` with
`pnpm` and the dev Postgres database available:

```bash
pnpm install
cp infrastructure/env.example .env   # then fill in the values
pnpm dev
```

The full stack (prod database, application, reverse proxies, DNS, backups, and the
`dev-machine` container with VS Code + OpenCode) is described in
[infrastructure/README.md](infrastructure/README.md).

The dev server is at `http://localhost:3000`. All routes are protected by OpenID Connect (Microsoft Azure AD by default). Migrations in [db/](db/) run automatically on first DB connection.

## Environment

See [infrastructure/env.example](infrastructure/env.example) for the full list. The most important ones:

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
| `pnpm test`        | All tests once (unit + integration + Storybook) plus the docker-compose stack smoke suite (requires Docker) |
| `pnpm test:watch`  | Tests in watch mode |
| `pnpm vitest run path/to/file.tests.ts` | Run a single file |
| `pnpm lint`        | ESLint |
| `pnpm lint:fix`    | ESLint with auto-fix |
| `pnpm storybook`   | Storybook on port 6006 |
| `pnpm chromatic`   | Visual regression tests |
| `pnpm clean`       | Remove build artefacts |
| `docker compose exec backup node /usr/local/bin/restore-backup.mjs <file> <dev\|prod> [--yes]` | Restore a database backup into the dev or prod DB (see [infrastructure/README.md](infrastructure/README.md)) |

## Architecture

Next.js App Router with React Server Components by default. Mutations are exposed as Server Actions (`'use server'` files); there is no separate API layer.

`proxy.ts` runs before every route and handles authentication and request logging. It validates the iron-session cookie and redirects unauthenticated users to the OIDC provider; AJAX requests get a `401` instead. All `/shared/auth/*` paths, static assets, Next.js internals and `/api/ping` are allowed without authentication.

Postgres is accessed through one connection pool created lazily on first use. Two helpers in `app/shared/_external/db/access.ts` wrap every query:

- `transactional(fn)` — `BEGIN`/`COMMIT`/`ROLLBACK` around `fn`
- `nontransactional(fn)` — plain pool client

Per-row ownership is keyed on the user's email (`owner_email`). There is no `users` table — the email comes from the OIDC `email` claim and is denormalised onto every domain row.

## Design

All design files live in [design/](design/) and can be edited with [OpenDesign](https://open-design.ai/). The folder contains component designs, screen mockups, and exported artifacts for the various apps.

## Repository layout

```
/
├── web/                Next.js application (apps under web/app/)
├── assistant/          Standalone assistant service (port 8500, WebSocket)
├── whatsapp-bridge/    WhatsApp bridge container (wacli + companion)
├── integration-test/   Smoke tests for the full docker-compose stack (Vitest + Playwright)
├── db/                 SQL migration scripts (see [db/README.md](db/README.md))
├── infrastructure/     Self-hosted deployment: docker-compose stack on the home server (see [infrastructure/README.md](infrastructure/README.md))
├── .github/workflows/  CI/CD (lint → test → Chromatic → Docker build → integration smoke → deploy)
├── .storybook/         Storybook configuration
├── Dockerfile          Production image (Node 24 Alpine)
├── proxy.ts             Request proxy (auth, logging)
```

Inside `app/`, folders that are not Next.js routes are prefixed with `_` (e.g. `shared/_components/`, `cash/_data/`, `coeditor/_external/`) to opt out of the router. Server-side action files use the `server.ts` suffix; integration tests use `server.tests.ts`; unit tests use `*.tests.ts`.

## Tests

Three vitest projects run in parallel:

- `unit` — `**/*.tests.ts` (excluding server tests), no DB
- `integration` — `**/server.tests.ts`, runs against an in-memory PGlite DB seeded with all migrations from `db/`
- `storybook` — Story interaction tests via Playwright/Chromium

`pnpm test` is configured with `--no-file-parallelism` because the integration tests share the PGlite instance.

### Smoke tests (docker-compose stack)

The `integration-test/` package verifies the **full** docker-compose stack
(`infrastructure/docker-compose.yml` plus the
`integration-test/docker-compose.ci.yml` test-mode override) end to end:

- SSH on port 2222 (dev-machine) and bind9 DNS answering `gutschi.site`
- Dozzle and Pgweb UIs over HTTPS with HTTP basic auth
- application healthy, `/shared/ping` and the root page reachable through nginx
- authenticated pages in headless Chromium: the assistant greeting (WebSocket,
  requires `AI_API_KEY`) and the WhatsApp bridge pairing QR code

The suite can be run manually using

```bash
# 1. self-signed certificates for the smoke domains
pnpm --filter @homeserver/integration-test certs

# 2. smoke hosts must resolve to 127.0.0.1
#    (CI adds them with `sudo tee -a /etc/hosts`; add them once locally)

# 3. compose project .env for ${VAR} interpolation
#    (mirrors env.test when missing; never touches the real .env)
[ -f infrastructure/.env ] || cp integration-test/env.test infrastructure/.env

# 4. boot the stack (AI_API_KEY is the only real secret)
docker compose -f infrastructure/docker-compose.yml \
  -f integration-test/docker-compose.ci.yml \
  up -d --wait --wait-timeout 300 --remove-orphans

# 5. run all checks (Vitest: infra checks + headless-browser checks)
pnpm --filter @homeserver/integration-test test

# 6. tear down (also on failure)
docker compose -f infrastructure/docker-compose.yml \
  -f integration-test/docker-compose.ci.yml \
  down --remove-orphans -v
```

Requirements and behaviour:

- **Docker** with the compose plugin is required. `docker compose up --wait`
  covers the healthchecked services; the checks poll the rest (bind9, dozzle,
  pgwebprod, dev-machine) themselves, so each service failing reports its own
  name.
- **No Entra credentials needed** — the test stack uses a mock OIDC provider
  (`integration-test/mock-oidc/`, built on the maintained `oidc-provider`
  library; HTTPS with a self-signed cert, login auto-approved), fixed
  non-secret values from `integration-test/env.test`, and an ephemeral WhatsApp
  data directory (`down -v` removes it, so the bridge is unpaired on every run).
- The only secret used is **`AI_API_KEY`** for the assistant greeting check; CI
  passes it to the `docker compose up` step as the `AI_API_KEY` secret. Locally,
  add it to `infrastructure/.env` or export it before step 4 (the checks
  themselves need no secret).
- Self-signed certificates are generated into
  `infrastructure/certbot/conf/live/<domain>/` (git-ignored) before every run
  (`pnpm certs`), and the hosts `dev/www/logs.gutschi.site` +
  `mock-oidc-server` must resolve to `127.0.0.1` — CI adds the entries with
  `sudo` before the suite; local users add them once by hand.
- The stack never touches the real `.env` or the real stack: the project name
  is `homeserver-smoke` and `env_file` values from `env.test` win over any
  `infrastructure/.env`.

## License

Private — all rights reserved.
