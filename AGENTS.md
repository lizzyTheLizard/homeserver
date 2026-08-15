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

## Issue Workflow (OpenCode Skills)

Six skills manage the full issue lifecycle in the Homeserver project. Each handles a specific phase:

| Skill | Triggers from → to | What it does |
|---|---|---|
| `create-issue` | Idea → Planning / UI / Todo | Gathers requirements, creates the GitHub issue, links to the Homeserver project, sets status and milestone |
| `refine-issue` | Planning → UI / Todo | Refines an unclear issue by asking questions, updating the body, and transitioning to the next stage |
| `start-implementing` | Todo / UI | Validates issue state, creates `issue-#N-kebab-title` branch from latest `origin/main`, pushes it |
| `implement-ui-design` | UI → Todo | Shows UI changes to make, implements them in `design/` only, commits, transitions status to Todo |
| `implement-issue` | Todo | Derives a change list from the issue body, implements selected items, commits, updates the issue |
| `implementation-finish` | Todo → Done | Runs all checks (lint, test, build, Chromatic), verifies tasks complete, creates a PR with auto-merge |

**Typical flow:** `create-issue` → `refine-issue` (if needed) → `implement-ui-design` (if needed) → `start-implementing` → `implement-issue` → `implementation-finish`

**Fast track:** `implement-without-issue` skips GitHub issue creation entirely — it drafts requirements in-chat for user approval, implements everything on an `issue-XXX-<kebab-title>` branch, runs all checks, and ships a PR.

## Architecture

**Next.js App Router** — pages are React Server Components by default. Use `"use client"` only when browser interactivity is required. Data mutations go through Next.js Server Actions, not a separate API layer.

**Authentication** — `server.ts` is the custom HTTP server that runs before every route. It validates the iron-session cookie and redirects unauthenticated users to Microsoft Azure AD (OpenID Connect) login via the `startLogin()` function in `app/shared/auth/auth.ts`. AJAX requests get a 401 instead. All `/shared/auth/*` paths bypass authentication (e.g. the login callback).

**Database** — PostgreSQL with `pg` driver. Connection pool initialized once at startup in `app/shared/_external/db/setup.ts`. All DB access goes through two wrappers in `app/shared/_external/db/access.ts`:
- `transactional(fn)` — wraps `fn` in a BEGIN/COMMIT/ROLLBACK
- `nontransactional(fn)` — plain pool client, no transaction

Custom PG type parsers in `TYPE_MAPPINGS` (dates stay as strings, numerics become JS numbers). Migrations in `db/` run automatically on pool startup.

## Conventions

- Non-route folders in `app/` are prefixed with `_` to opt out of the Next.js router (e.g. `_components/`, `_data/`, `_external/`, `_helper/`)
- Server side actions for each page are defined in a `server.ts` located right beside the `page.ts`
- All CSS is written in CSS modules names `*.module.css` localted right beside the module. Do not add inlie CSS in HTML files
- To guard a component or block that must only render on the client, use the `useIsClient()` hook from `app/shared/_helper/useIsClient.ts`:
- Keep "import" statements on one line, do not add newlines within an import statement
- Write each react component into its dedicated file, do not have multiple components in one file
- Put external or test functions first in file, and move internal helper functions to the end of the file

## Test Setup

Vitest runs three projects in parallel:
- `unit` — `**/*.tests.ts` (excludes server tests)
- `integration` — Each `erver.ts` has an integration test `server.tests.ts` which hits an in-memory PGlite DB seeded with all migrations from `db/`
- `storybook` — runs Story interaction tests via Playwright/Chromium

## Design

All design files are in the `design/` folder — component designs, screen mockups, and exported artifacts. Edit them with OpenDesign.

## Database Backup

The `backup` service in `infrastructure/docker-compose.yml` (image sources in `infrastructure/db-backup/`) takes a full `pg_dump` (custom format) of the PROD database every night (cron schedule via `BACKUP_SCHEDULE`, default `0 3 * * *`), stores it in `/opt/homeserver/backup` on the host, deletes local files older than `RETENTION_DAYS` (default 31), and uploads each dump to a **personal** OneDrive account via Microsoft Graph (no npm deps, plain fetch). Auth uses a delegated `ONEDRIVE_REFRESH_TOKEN` (obtained once with `get-onedrive-token.mjs` via device-code login) exchanged for an access token on every run; uploads target `/me/drive`. The dev-machine mounts that folder read-only at `/opt/homeserver/backup`.

`pnpm restoreBackup <file> <dev|test|prod> [--yes]` (`app/shared/_external/db/restoreBackup.ts`) replaces the target database with a backup: drops/recreates the `public` schema, then runs `pg_restore`. Bare filenames are resolved against `/opt/homeserver/backup`. Connection strings: `dev` → `DB_CONNECTION_STRING` (default local dev DB), `test` → `DB_CONNECTION_STRING_TEST`, `prod` → `DB_CONNECTION_STRING_PROD` (requires typing `restore prod` or `--yes`).

## Infrastructure

The full stack is self-hosted on a home server via `infrastructure/docker-compose.yml` (no cloud provider / Terraform). It runs the prod/dev Postgres databases, the `applicationprod` container (`homeserver:latest`, built from the repo `Dockerfile` on `node:24-alpine`), the `nginx` + `caddy` reverse proxies, `bind9` DNS, `certbot`, `dozzle`/`pgwebprod` viewers, the `backup` service, and a `dev-machine` container.

Development happens inside `dev-machine` (see `infrastructure/README.md`): it runs **code-server** (VS Code in the browser, `dev.gutschi.site:8443`), **OpenCode** (`opencode serve`, `dev.gutschi.site:8444`), and Storybook (`:8445`), plus an SSH server on port `2222` for VS Code Remote. The repo is cloned into `/home/dev/workspace`; OpenCode and `pnpm` are available there.

## Whatsapp Bridge

`Whatsapp/` is a standalone Go module (not part of the pnpm/Next.js toolchain). It is a bridge process that connects a WhatsApp account via [whatsmeow](https://github.com/tulir/whatsmeow) using Postgres (pgx driver) as the session store.

- Usage: `whatsapp <user-id> <postgres-connection-string> <dev>` — the `dev` flag (`true`/`false`) selects the device name shown in WhatsApp's linked devices list (`Gutschi.Site (dev)` vs `Gutschi.Site`). The name is only sent at pairing time, so existing sessions keep their old name until re-paired.
- Reads commands as JSON lines from stdin (`send_message`, `archive_chat`, `mark_chat_read`), publishes events as JSON lines on stdout (`connection_established`, `qr_code`, `error`). Nothing else may be written to stdout — keep whatsmeow logging disabled (`waLog.Noop`).
- All received messages (live and history sync) are stored in the `whatsmeow_messages` table, created automatically at startup.
- Build/test it with the standard Go toolchain (`go build ./...`, `go vet ./...`, `go test ./...`) inside `Whatsapp/`.
- CI: the `whatsapp` job in `.github/workflows/homeserver.yml` runs build, vet and tests; the `whatsapp-builder` stage in the `Dockerfile` compiles the binary into the final image at `/app/whatsapp`.

