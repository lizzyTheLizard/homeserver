# Homeserver — Infrastructure & Operations Guide

> **Repository:** https://github.com/lizzyTheLizard/homeserver
> **Infrastructure source:** [`infrastructure/`](https://github.com/lizzyTheLizard/homeserver/tree/main/infrastructure)
>
> This document is the operator's manual for the self-hosted Homeserver stack.
> It is copied to the production installation and explains how to set the system
> up, what state it keeps, and how to perform day-to-day and emergency
> operations. It assumes a working Docker + `docker compose` (v2) host.

---

## 1. System setup — what is contained and how it is available

The entire stack is **self-hosted on a single home server** (no cloud provider,
no Terraform). A single `docker-compose.yml` brings up every component. There is
no container registry: the `homeserver:latest` and `whatsapp-bridge:latest`
images are built directly on the server (by CI, see
[§6.8](#68-deploying--upgrading-the-application)).

### Components

| Concern            | Container (`container_name`)     | Image                       |
|--------------------|---------------------------------|-----------------------------|
| App (prod)         | `applicationprod` (`Prod-Application`) | `homeserver:latest`   |
| WhatsApp bridge    | `whatsapp-bridge` (`Prod-WhatsApp-Bridge`) | `whatsapp-bridge:latest` |
| Prod database      | `postgresprod` (`Prod-Database`) | `postgres:16-alpine`       |
| Dev database       | `postgresdev` (`Dev-Database`)   | `postgres:16-alpine`       |
| Front TLS proxy    | `nginx` (`Nginx`)                | `nginx:alpine`             |
| Auth proxy         | `caddy` (`Caddy`)                | `caddy:2-alpine`           |
| DNS                | `bind9` (`Bind9`)                | `ubuntu/bind9:latest`      |
| TLS issuance       | `certbot` (`Certbot`)            | `certbot/certbot:latest`   |
| Backups            | `backup` (`Backup`)              | built from `db-backup/`    |
| Logs UI            | `dozzle` (`Dozzle`)              | `amir20/dozzle:latest`     |
| DB UI (prod)       | `pgwebprod` (`Prod-Pgweb`)       | `sosedoff/pgweb`           |
| Development        | `dev-machine` (`Dev`)            | built from `dev/`          |

### How things are reachable

* **`nginx`** terminates TLS (Let's Encrypt certs) on the host and routes to
  the backends. If authentication is needed, requests are sent through `caddy`,
  which performs the basic auth. The following endpoints are reachable through
  nginx:

  | Public URL / port        | Basic auth | Backend              | Purpose              |
  |--------------------------|------------|----------------------|----------------------|
  | `www.gutschi.site:443`   | —          | `applicationprod:3000` | The application    |
  | `dev.gutschi.site:443`   | —          | `dev-machine:3000`   | Dev app (when running) |
  | `dev.gutschi.site:8443`  | dev        | `caddy` → `dev-machine:8080` | VS Code (code-server) |
  | `dev.gutschi.site:8444`  | dev        | `caddy` → `dev-machine:4096` | OpenCode         |
  | `dev.gutschi.site:8445`  | dev        | `caddy` → `dev-machine:6006` | Storybook       |
  | `logs.gutschi.site:443`  | admin      | `caddy` → `dozzle:8080` | Container logs    |
  | `www.gutschi.site:8443`  | admin      | `caddy` → `pgwebprod:8081` | Prod DB web UI |

* **`bind9`** is the authoritative DNS for `gutschi.site`, so the subdomains
  (`www`, `dev`, `logs`) resolve to the home server. Its zone template
  (`bind9/db.gutschi.site`) is rendered with `HOST_IP` substituted at start.
* **`certbot`** issues and auto-renews Let's Encrypt certificates into
  `./certbot/conf`; nginx reloads every 6h to pick up renewed certs.
* **`dozzle`** gives live container logs at `https://logs.gutschi.site`.
* **`pgwebprod`** is a web UI for the prod DB at `https://www.gutschi.site:8443`
  (admin auth).
* **`dev-machine`** is a full Linux dev environment (ubuntu:24.04) with Node 24,
  pnpm, Go, the GitHub CLI, PostgreSQL client tools, **code-server** and the
  **OpenCode** CLI, managed by `supervisord`. Access:
  * VS Code Remote SSH → `ssh dev@<host> -p 2222`
  * Browser VS Code → `https://dev.gutschi.site:8443`
  * OpenCode → `https://dev.gutschi.site:8444`

In development the WhatsApp bridge is **not** a separate container: `pnpm dev`
inside `dev-machine` starts it as a local Go process alongside the Next.js server, 
tied to the same lifecycle. It uses `postgresdev`.

---

## 2. Prerequisites

Copy the template and fill in real values:

```bash
cp infrastructure/env.example infrastructure/.env
$EDITOR infrastructure/.env
```

Before first start you also need

1. **DNS** — `bind9` must resolve `*.gutschi.site` to this host. Set `HOST_IP`
   correctly and ensure your registrar/router points the zone at the server.
2. **TLS bootstrap** — Let's Encrypt certs do **not** exist yet; nginx will
   refuse to start without them. Follow [§5.1](#51-certificate-bootstrap) first.

---

## 3. Persistent state — what is stored where

Understanding where state lives is critical: destroying the wrong thing loses
data.

### Docker named volumes (managed by compose, live in the Docker data root)

| Volume | Holds |
|--------|-------|
| `postgres_prod_data` | Prod Postgres data directory (`/var/lib/postgresql/data`) |
| `postgres_dev_data` | Dev Postgres data directory |
| `dev_home` | The `dev` user's home (`/home/dev`) — git checkout, SSH keys, editor state |

These survive `docker compose down` / `up`. They are **only** removed by
`docker compose down -v` or manual `docker volume rm`.

### Host bind mounts

| Path on host | Mounted into | Holds |
|--------------|--------------|-------|
| `./certbot/conf` | `certbot:/etc/letsencrypt`, `nginx:/etc/letsencrypt:ro` | Let's Encrypt account + issued certs (`live/`, `archive/`, `renewal/`) |
| `./certbot/www` | `certbot:/var/www/certbot`, `nginx:/var/www/certbot:ro` | ACME HTTP-01 challenge files |
| `./backup` | `backup:/backup` | Nightly `pg_dump` dumps (`homeserver-prod-*.dump`), retained `RETENTION_DAYS` (default 31) |
| `./.env` | (read by compose `env_file`) | All secrets — **back this up securely** |
| `./nginx`, `./caddy`, `./bind9` | the respective containers | Config files (read-only) |

---

## 4. Starting, stopping and recreating the system

### First start

```bash
# 1. Bootstrap TLS certs (see §5.1) so nginx can start
# 2. Launch everything:
docker compose up -d
docker compose ps          # verify all containers are "healthy"/"running"
```

### Everyday control

```bash
docker compose ps                       # status of all services
docker compose logs -f --tail=100 nginx # follow logs for one service
docker compose stop                     # stop all (keeps containers + volumes)
docker compose start                    # resume
docker compose restart caddy            # restart a single service
docker compose down                     # stop AND remove containers/networks
                                        # (volumes + bind mounts are kept)
docker compose down -v                  # DANGER: also deletes named volumes
```

### Recreating / pulling

```bash
docker compose pull                      # pull newer images for prebuilt services
docker compose up -d                     # apply changed config / recreate changed services
docker compose up -d --force-recreate    # force recreate even if nothing "changed"
docker compose up -d --build             # rebuild the locally-built images
                                        # (backup, dev-machine)
docker compose config                    # dry-run: validate the rendered compose file
```

### Where to look when something is wrong

* Live logs UI: **https://logs.gutschi.site** (dozzle, admin auth).
* Container health: `docker compose ps` shows the healthcheck state.
* Per-service logs: `docker compose logs <service>`.

---

## 5. Operational tasks

### 5.1 Certificate bootstrap

nginx needs the TLS certs to start, but certs can only be issued once the
`*.gutschi.site` names resolve to this host (DNS via bind9) **and** port 80 is
reachable for the ACME challenge. Bootstrap with certbot in **standalone** mode
(nothing else may hold port 80 during this step):

```bash
docker compose down            # ensure nothing is bound to :80
docker run --rm \
  -v "$PWD/certbot/conf:/etc/letsencrypt" \
  -v "$PWD/certbot/www:/var/www/certbot" \
  -p 80:80 \
  certbot/certbot certonly --standalone \
    -d dev.gutschi.site -d logs.gutschi.site -d www.gutschi.site
docker compose up -d           # now nginx has certs and can start
```

The certs land in `./certbot/conf/live/<domain>/` and are picked up by nginx.
`nginx` also serves the ACME challenge at `:80/.well-known/acme-challenge/`, so
subsequent renewals use the webroot method automatically (see below).

### 5.2 Check certificate status

```bash
# List all issued certs with expiry dates:
docker compose exec certbot certbot certificates

# Or inspect a single cert directly:
openssl x509 -enddate -noout -in certbot/conf/live/www.gutschi.site/cert.pem
openssl x509 -startdate -enddate -noout -in certbot/conf/live/www.gutschi.site/cert.pem
```

Certbot auto-renews when a cert is within 30 days of expiry (the `certbot`
container loops `certbot renew` every 12h); nginx reloads every 6h to load the
new certs. No manual action is normally needed.

### 5.3 Manually renew certificates

```bash
# Standard renewal (only renews if within the renewal window):
docker compose exec certbot certbot renew

# Force renewal immediately (e.g. before expiry or after a config change):
docker compose exec certbot certbot renew --force-renewal

# After forcing, make nginx reload the new certs right away:
docker compose exec nginx nginx -s reload
```

### 5.4 Manually trigger a backup

The nightly backup is a cron job inside the `backup` container. To run it on
demand (full `pg_dump` of prod → `./backup` → upload to OneDrive):

```bash
docker compose exec backup /usr/local/bin/backup.sh
```

This uses the same environment the cron job sources, so a successful run proves
the backup pipeline (DB connection + OneDrive upload) is healthy.

List local dumps:

```bash
ls -lh backup/
```

### 5.5 Recreate a database from a backup

Use the restore helper, which runs **inside** the `backup` container so it can
reach both databases directly:

```bash
# Restore into the DEV database (no confirmation needed):
docker compose exec backup node /usr/local/bin/restore-backup.mjs <file> dev

# Restore into PROD (interactive confirmation, or --yes since exec has no TTY):
docker compose exec backup node /usr/local/bin/restore-backup.mjs <file> prod --yes
```

* `<file>` may be a bare filename (resolved against `/backup`) or an absolute
  path inside the container.
* `dev` → `postgresdev`, `prod` → `postgresprod`.
* The script drops/recreates the `public` schema and runs `pg_restore`.
* **After restoring**, restart the target application so pending migrations run:
  `docker compose restart applicationprod` (or `dev-machine`).

To fetch a remote dump from OneDrive for a disaster recovery, download it to
`./backup` first (via the OneDrive web UI or `rclone`/`onedrive`), then restore.

### 5.6 Refreshing the OneDrive backup token

The delegated `ONEDRIVE_REFRESH_TOKEN` is rotated by Microsoft. When the nightly
upload starts failing, or the token script prints a new refresh token, update
`.env`:

```bash
docker compose run --rm --entrypoint node backup /usr/local/bin/get-onedrive-token.mjs
# paste the printed token into ONEDRIVE_REFRESH_TOKEN in .env, then:
docker compose up -d --force-recreate backup
```

### 5.7 Bootstrap / re-bootstrap the dev-machine

On first start the `dev-machine` entrypoint (`dev/entrypoint.sh`):

1. Sets the git identity from `GIT_NAME` / `GIT_MAIL`.
2. Appends every key in `DEV_SSH_KEY_PUB` to `/home/dev/.ssh/authorized_keys`.
3. Generates `id_ed25519` / `id_sshd` SSH keys if missing.
4. Verifies GitHub SSH auth; **if it fails it prints the public key to add**.
5. Clones `REPO_URL` into `/home/dev/workspace` and launches `supervisord`.

**First-time / new-key bootstrap flow:**

1. Make sure `REPO_URL`, `GIT_NAME`, `GIT_MAIL` and `DEV_SSH_KEY_PUB` are set in
   `.env`.
2. `docker compose up -d dev-machine`.
3. If GitHub auth fails, the container exits and prints a public key — add it to
   **https://github.com/settings/keys**, then:
   `docker compose up -d --force-recreate dev-machine`.
4. If you already have a key pair you want to use, put its **public** half in
   `DEV_SSH_KEY_PUB` (the private half stays on your workstation).

### 5.8 Change the dev-machine public-key auth

The `dev_home` volume persists `authorized_keys`, so changes survive restarts.

* **Add a key** (no restart needed):
  ```bash
  docker compose exec dev sh -c 'echo "<ssh-ed25519 AAAA... comment>" >> /home/dev/.ssh/authorized_keys'
  ```
* **Rotate / replace keys** via `.env`: update `DEV_SSH_KEY_PUB` and recreate:
  ```bash
  docker compose up -d --force-recreate dev-machine
  ```
  (Keys not present in `DEV_SSH_KEY_PUB` are not removed automatically — prune
  stale lines from `authorized_keys` manually if needed.)
* **Remove a key**: edit the file inside the container:
  ```bash
  docker compose exec dev vi /home/dev/.ssh/authorized_keys
  ```

### 5.9 Change passwords

**Admin / dev basic-auth (caddy):** edit `ADMIN_PASSWORD` / `DEV_PASSWORD` in
`.env`, then recreate caddy so it re-hashes them at startup:

```bash
docker compose up -d --force-recreate caddy
```

**Prod database password:** changing `PROD_DB_PASSWORD` in `.env` updates the
connection strings used by `applicationprod`, `whatsapp-bridge` and `backup` —
but Postgres only applies `POSTGRES_PASSWORD` on **first** initialization. You
must also change the password inside the running DB:

```bash
docker compose exec postgresprod psql -U homeserver -c \
  "ALTER USER homeserver WITH PASSWORD '<new-prod-password>';"
```

Then `docker compose up -d --force-recreate applicationprod whatsapp-bridge backup`
so the new `.env` value is picked up.

**Dev database password:** hardcoded to `homeserver`/`homeserver` in compose and
used by the dev-machine. Changing it requires editing `docker-compose.yml`
(`postgresdev` + `dev-machine` `DB_CONNECTION_STRING`) and recreating both —
only do this if you have a reason to.

---

## 6. Deployment & repository

* **Repo:** https://github.com/lizzyTheLizard/homeserver
* **Infrastructure folder:** https://github.com/lizzyTheLizard/homeserver/tree/main/infrastructure
* **CI deploy pipeline:** `.github/workflows/homeserver.yml` builds the
  `homeserver:latest` image (including the WhatsApp bridge) and deploys it to the
  server; the compose stack is then started/updated with `docker compose up -d`.

