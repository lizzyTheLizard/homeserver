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

The dev server is at `http://localhost:3000`. All routes are protected by OpenID Connect (Microsoft Azure AD by default). Migrations in [services/web/db/](services/web/db/) run automatically on first DB connection.

## Environment

See [infrastructure/env.example](infrastructure/env.example) for the full list. The most important ones:

| Variable                 | Purpose                                          |
|--------------------------|--------------------------------------------------|
| `APP_URL`                | Public URL of the app (used for OIDC redirect)   |
| `DB_CONNECTION_STRING`   | `postgres://user:pass@host:port/dbname`          |
| `ADMIN_EMAIL`            | Email allowed into the Admin app                 |
| `CLIENT_ID`/`CLIENT_SECRET`/`LOGIN_ISSUER` | OIDC application credentials   |
| `COOKIE_NAME`/`SESSION_PASSWORD` | iron-session cookie name + secret        |
| `AI_API_KEY`             | AI model endpoint credentials (Groq)             |
| `MICROSOFT_GRAPH_APPLICATION_ID`/`MICROSOFT_GRAPH_CLIENT_SECRET`/`MICROSOFT_GRAPH_ISSUER` | Microsoft Graph (Outlook) OIDC credentials |
| `LOG_URL`                | URL to log dashboard                             |

In production every required var must be set; the app fails fast on startup otherwise.

## Commands

| Command            | Description |
|--------------------|-------------|
| `pnpm dev`         | Run web + assistant + whatsapp together (dev server on :3000) |
| `pnpm build`       | Build all packages |
| `pnpm test`        | Run all tests in all packages |
| `pnpm test:watch`  | Tests in watch mode (all packages) |
| `pnpm lint`        | Lint all packages (with --fix) |
| `pnpm lint:ci`     | Lint all packages (no --fix, for CI) |
| `pnpm clean`       | Remove build artefacts in all packages |
| `pnpm --filter @homeserver/web storybook` | Storybook on port 6006 |
| `pnpm --filter @homeserver/web vitest run path/to/file.tests.ts` | Run a single test file |
| `docker compose exec backup node /usr/local/bin/restore-backup.mjs <file> <dev\|prod> [--yes]` | Restore a database backup into the dev or prod DB (see [infrastructure/README.md](infrastructure/README.md)) |

## Development workflow

Changes are spec-driven via [OpenSpec](https://github.com/Fission-AI/OpenSpec) and change-first: there is no GitHub issue, and the change name is the branch name.

The stock OpenSpec workflows drive the lifecycle end to end:

| Phase | Workflow | What happens |
|---|---|---|
| Explore | `openspec-explore` | Understand the problem — nothing is written |
| Propose | `openspec-propose` | Create the `<change>` branch, then the plan; commit it to that branch |
| Implement | `openspec-apply-change` | One task at a time: implement → review → commit → push |
| Ship | `openspec-archive-change` | Archive the change (sync delta specs), open the PR, enable auto-merge, watch CI |

The contract lives in `openspec/config.yaml` and is injected into the stock workflows: branch and commit rules in `context`/`rules`, the per-task commit format in `operations.apply.guidance`, the archive commit and pull request in `operations.archive.guidance`. The `Change guard` job in `change-guard.yml` enforces on every pull request that the change is archived, named after the branch, and its specs are synced.

The `openspec-*` skills are auto-generated and must not be edited by hand.

## Architecture

Next.js App Router with React Server Components by default. Mutations are exposed as Server Actions (`'use server'` files); there is no separate API layer.

`proxy.ts` runs before every route and handles authentication and request logging. It validates the iron-session cookie and redirects unauthenticated users to the OIDC provider; AJAX requests get a `401` instead. All `/shared/auth/*` paths, static assets, Next.js internals and `/api/ping` are allowed without authentication.

Postgres is accessed through one connection pool created lazily on first use. Two helpers in `app/shared/_external/db/access.ts` wrap every query:

- `transactional(fn)` — `BEGIN`/`COMMIT`/`ROLLBACK` around `fn`
- `nontransactional(fn)` — plain pool client

Per-row ownership is keyed on the user's email (`owner_email`). There is no `users` table — the email comes from the OIDC `email` claim and is denormalised onto every domain row.

## Repository layout

```
/
├── services/           Deployable services, one folder per container image
│   ├── web/            Next.js application
│   ├── assistant/      Standalone assistant service (port 8500, WebSocket)
│   ├── whatsapp/       WhatsApp bridge container (wacli + companion)
│   ├── wichteln/       Wichteln app (own migrations in web-style db/ folder)
│   └── dev-machine/    Development container (code-server, OpenCode, SSH)
├── infrastructure/     Self-hosted deployment: docker-compose stack on the home server (see [infrastructure/README.md](infrastructure/README.md))
├── .github/workflows/  CI/CD (per-service build/deploy + change guard)
├── .agents/skills/     Agent skills: the OpenSpec workflows (see Development workflow)
├── openspec/           Spec-driven change sets and main specs (see Development workflow)
```

Inside `app/`, folders that are not Next.js routes are prefixed with `_` (e.g. `shared/_components/`, `cash/_data/`, `coeditor/_external/`) to opt out of the router. Server-side action files use the `server.ts` suffix; integration tests use `server.tests.ts`; unit tests use `*.tests.ts`.

## Tests

Three vitest projects run in parallel:

- `unit` — `**/*.tests.ts` (excluding server tests), no DB
- `integration` — `**/server.tests.ts`, runs against an in-memory PGlite DB seeded with all migrations from `services/web/db/`
- `storybook` — Story interaction tests via Playwright/Chromium

`pnpm test` is configured with `--no-file-parallelism` because the integration tests share the PGlite instance.

## License

Private — all rights reserved.
