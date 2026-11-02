# Gutschi.site

A personal, self-hosted multi-service application running on a home server. It consists of several independently deployed services — each with its own container image and CI/CD pipeline — that share one PostgreSQL database and are managed together in one pnpm workspace.

## Services

Each service lives in its own folder under `services/` and is published as its own container image.

### Web

[`services/web`](services/web) — the Next.js portal at [www.gutschi.site](https://www.gutschi.site) (dev: `http://localhost:3000`). It bundles several apps behind a shared Microsoft Azure AD (OpenID Connect) login:

| App          | Description |
|--------------|-------------|
| **Cash**     | Double-entry bookkeeping for private finances — projects, journals, accounts, reports, monthly closing |
| **CoEditor** | AI-powered document editor backed by an OpenAI-compatible model |
| **Admin**    | Administration dashboard — metrics, configuration, project management |
| **Startpage**| Browser start page with personal favourites |

### Assistant

[`services/assistant`](services/assistant) — the AI assistant service on port `8500`. It serves the assistant WebSocket (proxied through nginx, authenticated with the same session cookie as the web app) and internal REST APIs under `/microsoft/*` and `/whatsapp/*` that the web app calls via `ASSISTANT_INTERNAL_URL`. It manages Microsoft tokens, the mail/todo/calendar workers, weather and geolocation helpers, and background sync.

### WhatsApp bridge

[`services/whatsapp`](services/whatsapp) — runs the prebuilt [wacli](https://github.com/openclaw/wacli) WhatsApp client plus a small Express companion that drives it and exposes a REST API. Each user gets an isolated SQLite store in a Docker volume, which is deliberately not part of the database backup.

### Wichteln

[`services/wichteln`](services/wichteln) — a small standalone Next.js app for an anonymous Secret Santa ("Wichteln") at wichteln.gutschi.site (dev: `http://localhost:3001`). It does not use the portal's OIDC login; it has its own admin credentials and per-participant passwords. Its data lives in `wichteln_*`-prefixed tables in the shared database.

1. The **admin** signs in on the start page with `ADMIN_USER` / `ADMIN_PASSWORD`, creates a group and enters the participants' names. A password is generated for each person ("copy all credentials" to hand them out).
2. **Phase 1:** participants sign in with name + password and enter their wish (title + description); they can change it until phase 2 starts. The admin only sees *who* has already entered a wish.
3. Once all wishes are in, the admin starts **phase 2**.
4. Participants see the remaining unclaimed wishes of the others (without sender) and pick one. Their own wish is never offered, and only wishes are shown after which everyone left can still get someone else's wish — so nobody ends up with their own wish. The admin only sees *who* has already chosen.

### Dev machine

[`services/dev-machine`](services/dev-machine) — the development container on the home server, running code-server (VS Code in the browser), Claude Code Remote Control, Storybook and an SSH server. See [Getting started](#getting-started).

## Getting started

Development happens on the home server's **`dev-machine`** container — that is the
only supported environment, and the dev database already runs there. You do **not**
start the database manually with Docker Compose.

Connect to the dev machine (see [infrastructure/README.md](infrastructure/README.md)
for the full setup):

- **Browser VS Code:** <https://dev.gutschi.site:8443> (dev auth)
- **Claude Code (Remote Control):** the dev machine runs `claude remote-control`; connect from <https://claude.ai/code> or the Claude app after a one-time `claude /login` in the machine (requires an eligible Claude subscription)
- **VS Code Remote SSH:** `ssh dev@<host> -p 2222`

Inside the dev machine the repo is already cloned at `/home/dev/workspace` with
`pnpm` and the dev Postgres database available:

```bash
pnpm install
cp infrastructure/env.example services/.env   # then fill in the values
pnpm dev
```

The full stack (prod database, application, reverse proxies, DNS, backups, and the
`dev-machine` container with VS Code + Claude Code) is described in
[infrastructure/README.md](infrastructure/README.md).

The web app is at `http://localhost:3000`, where all routes are protected by OpenID Connect (Microsoft Azure AD by default); Wichteln is at `http://localhost:3001`. Web, assistant and Wichteln each run their own migrations (`services/<service>/db/`) automatically on first DB connection.

## Environment

In development all services read `services/.env`; see [infrastructure/env.example](infrastructure/env.example) for the full list. The most important ones:

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
| `SESSION_SECRET`/`ADMIN_USER`/`ADMIN_PASSWORD` | Wichteln cookie secret (≥ 32 chars) and admin credentials; in production mapped from `WICHTELN_*` by docker-compose |

In production every required var must be set; the services fail fast on startup otherwise (Wichteln reports `503` on `GET /api/health`).

## Commands

| Command            | Description |
|--------------------|-------------|
| `pnpm dev`         | Run web (:3000) + assistant + whatsapp + wichteln (:3001) together |
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

The contract lives in `openspec/config.yaml` and is injected into the stock workflows: branch and commit rules in `context`/`rules`, the per-task commit format in `operations.apply.guidance`, the archive commit and pull request in `operations.archive.guidance`.

The `openspec-*` skills are auto-generated and must not be edited by hand.

## Architecture

Each service is built into its own image (`ghcr.io/lizzythelizard/homeserver-<service>`) by its own workflow in `.github/workflows/` and deployed with `infrastructure/docker-compose.yml`. The web app calls the assistant over an internal URL, and the assistant talks to the WhatsApp bridge; web, assistant and Wichteln share the PostgreSQL database, each with its own migrations.

The **web** service uses the Next.js App Router with React Server Components by default. Mutations are exposed as Server Actions (`'use server'` files); there is no separate API layer.

`proxy.ts` runs before every route and handles authentication and request logging. It validates the iron-session cookie and redirects unauthenticated users to the OIDC provider; AJAX requests get a `401` instead. All `/shared/auth/*` paths, static assets, Next.js internals and `/shared/ping` are allowed without authentication.

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
│   ├── wichteln/       Wichteln Secret Santa app (own db/ migrations)
│   └── dev-machine/    Development container (code-server, Claude Code, SSH)
├── infrastructure/     Self-hosted deployment: docker-compose stack on the home server (see [infrastructure/README.md](infrastructure/README.md))
├── .github/workflows/  CI/CD (per-service build/deploy)
├── .claude/skills/     Agent skills: the OpenSpec workflows (see Development workflow)
├── openspec/           Spec-driven change sets and main specs (see Development workflow)
```

Inside `app/`, folders that are not Next.js routes are prefixed with `_` (e.g. `shared/_components/`, `cash/_data/`, `coeditor/_external/`) to opt out of the router. Server-side action files use the `server.ts` suffix; integration tests use `server.tests.ts`; unit tests use `*.tests.ts`.

## Tests

Three vitest projects run in parallel:

- `unit` — `**/*.tests.ts` (excluding server tests), no DB
- `integration` — `**/server.tests.ts`, runs against an in-memory PGlite DB seeded with all migrations from `services/web/db/`
- `storybook` — Story interaction tests via Playwright/Chromium

## License

Private — all rights reserved.
