# Infrastructure

The entire stack is **self-hosted on a home server** (no cloud provider / Terraform).
Everything is orchestrated by a single `docker-compose.yml` that brings up the
databases, the application, the reverse proxies, DNS, log/DB viewers, nightly
backups, and a dedicated `dev-machine` container used for development with
**VS Code (code-server)** and **OpenCode**.

## Overview

| Concern            | Component(s)                                   |
|--------------------|------------------------------------------------|
| App (prod)         | `applicationprod` (image `homeserver:latest`)  |
| Databases          | `postgresprod`, `postgresdev` (postgres:16)    |
| Reverse proxy      | `nginx` (TLS + routing) → `caddy` (auth)       |
| DNS                | `bind9` (authoritative for `*.gutschi.site`)   |
| TLS certificates   | `certbot` (Let's Encrypt, auto-renew)          |
| Observability      | `dozzle` (container logs), `pgwebprod` (DB UI) |
| Backups            | `backup` (nightly `pg_dump` → OneDrive)        |
| Development        | `dev-machine` (code-server, OpenCode, SSH)     |

All services are defined in [`docker-compose.yml`](docker-compose.yml). Copy
[`env.example`](env.example) to `.env` and fill in the real values before
starting the stack.

## Services

### Databases

- **`postgresprod`** — `Prod-Database`, postgres:16-alpine, `homeserver`/`homeserver`
  DB. No published host port; only reachable from other containers.
- **`postgresdev`** — `Dev-Database`, postgres:16-alpine, same credentials, publishes
  **5432:5432** for local development. Start it on its own with
  `docker compose up postgresdev -d`.

### Application

- **`applicationprod`** — `Prod-Application`, built from the repo `Dockerfile`
  (`node:24-alpine`). Sets `NODE_ENV=production`, `APP_URL`, and the prod
  `DB_CONNECTION_STRING` pointing at `postgresprod:5432`. Healthy when
  `http://applicationprod:3000/api/ping` returns `200`.

### Reverse proxy & routing

- **`nginx`** terminates TLS (Let's Encrypt certs from `certbot`) and routes by
  hostname/port. It proxies to `applicationprod`, `dev-machine`, and `caddy`
  (see [`nginx/nginx.conf`](nginx/nginx.conf)).
- **`caddy`** sits behind nginx and adds HTTP basic-auth in front of the
  internal tools. Endpoints ([`caddy/Caddyfile`](caddy/Caddyfile)):

  | Port  | Auth        | Backend                | Purpose              |
  |-------|-------------|------------------------|----------------------|
  | 8370  | admin       | `dozzle:8080`          | Container logs       |
  | 8371  | admin       | `pgwebprod:8081`       | Prod DB web UI       |
  | 8443  | dev         | `dev-machine:8080`     | VS Code (code-server)|
  | 8444  | dev         | `dev-machine:4096`     | OpenCode             |
  | 8445  | dev         | `dev-machine:6006`     | Storybook            |

  Password hashes are derived at startup from `ADMIN_PASSWORD` / `DEV_PASSWORD`
  via `caddy hash-password`.

### DNS

- **`bind9`** — `Bind9`, authoritative DNS for `gutschi.site`, so the various
  subdomains (`www-devserver`, `dev`, `logs`) resolve to the home server. The
  zone template [`bind9/db.gutschi.site`](bind9/db.gutschi.site) is rendered with
  `HOST_IP` substituted at container start.

### TLS

- **`certbot`** issues and auto-renews Let's Encrypt certificates into
  `./certbot/conf`; nginx reloads every 6h to pick up renewed certs.

### Observability

- **`dozzle`** — live container logs (`--enable-actions --enable-shell`).
- **`pgwebprod`** — web UI for the prod database.

## Development machine (`dev-machine`)

The `dev-machine` container ([`dev/`](dev/)) is a full Linux dev environment
(ubuntu:24.04) with Node 24, pnpm, Go, the GitHub CLI, PostgreSQL client tools,
**code-server** (VS Code in the browser) and the **OpenCode** CLI preinstalled.
It is managed by `supervisord` ([`dev/supervisord.conf`](dev/supervisord.conf)):

| Program     | Command                                      | Port (via caddy/nginx) |
|-------------|----------------------------------------------|------------------------|
| `sshd`      | `sshd -D` on port **2222** (key-only)        | `2222` (host)          |
| `code-server` | `code-server --auth none` on `:8080`       | `dev.gutschi.site:8443`|
| `opencode`  | `opencode serve --port 4096` on `:4096`      | `dev.gutschi.site:8444`|

Stories (Storybook) run on `:6006` → `dev.gutschi.site:8445`.

On startup the entrypoint ([`dev/entrypoint.sh`](dev/entrypoint.sh)) configures
git, installs the SSH key from `DEV_SSH_KEY_PUB`, clones `REPO_URL` into
`/home/dev/workspace`, and launches supervisord. The dev home is persisted in the
`dev_home` volume, and the host backup folder is mounted read-only at
`/opt/homeserver/backup` so `pnpm restoreBackup` works from inside the machine.

Access options:
- **VS Code Remote SSH** → `ssh dev@<host> -p 2222` (use the key from `DEV_SSH_KEY_PUB`).
- **Browser VS Code** → `https://dev.gutschi.site:8443` (dev auth).
- **OpenCode** → `https://dev.gutschi.site:8444` (dev auth).

## Database backup

The `backup` service ([`db-backup/`](db-backup/)) runs a full nightly
`pg_dump` (custom format) of the **prod** database, stores it in
`/opt/homeserver/backup` on the host (kept `RETENTION_DAYS`, default 31), and
uploads each dump to a **personal** OneDrive account via the Microsoft Graph
API using a delegated refresh token. The dev-machine mounts that folder
read-only.

### Setting up the OneDrive token

1. In Azure, register an app as "Accounts in any organizational directory and
   personal Microsoft accounts" and add the **delegated** permissions
   `Files.ReadWrite` and `offline_access` (user consent).
2. Run the device-code helper to sign in with your personal Microsoft account
   and print a refresh token:

   ```bash
   docker compose run --rm backup node /usr/local/bin/get-onedrive-token.mjs
   # or locally: node infrastructure/db-backup/get-onedrive-token.mjs
   ```

3. Save the printed value as `ONEDRIVE_REFRESH_TOKEN` in `.env`. The uploader
   exchanges it for a fresh access token on every run and prints a new refresh
   token when the old one is rotated — update `.env` when you see that message.

Restore from anywhere with:

```bash
pnpm restoreBackup <file> <dev|test|prod> [--yes]
```

See `AGENTS.md` (Database Backup section) for details.

## Environment variables

All variables are listed in [`env.example`](env.example). Highlights:

| Variable           | Purpose                                                |
|--------------------|--------------------------------------------------------|
| `HOST_IP`          | Home server IP, injected into the bind9 zone           |
| `PROD_DB_PASSWORD` | Prod Postgres password                                 |
| `NODE_ENV`         | `production` for the app container                     |
| `APP_URL`          | Public app URL (OIDC redirect)                         |
| `ADMIN_USERNAME`/`ADMIN_PASSWORD` | Basic-auth for admin tools (dozzle, pgweb) |
| `DEV_USERNAME`/`DEV_PASSWORD`     | Basic-auth for dev tools (code-server, OpenCode) |
| `REPO_URL`/`GIT_NAME`/`GIT_MAIL`/`DEV_SSH_KEY_PUB` | dev-machine git + SSH setup |
| `ONEDRIVE_REFRESH_TOKEN` | Delegated refresh token for the personal OneDrive upload |
| `ONEDRIVE_BACKUP_FOLDER` | OneDrive folder the dumps are stored in (default: Homeserver) |
| OIDC / session / AI / Graph vars | Same as the app (see root `README.md`)     |

## Deployment

The application image is built and run directly on the home server (no container
registry). The CI pipeline in `.github/workflows/homeserver.yml` builds the
`homeserver:latest` image (including the WhatsApp bridge) and deploys it; the
compose stack is then started/updated on the server with `docker compose up -d`.
