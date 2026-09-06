## Context

See proposal.md — Why. The stack (`infrastructure/docker-compose.yml`) runs nginx, whatsapp-bridge, applicationprod (Next.js), assistant, postgresprod, backup, pgwebprod, dozzle, caddy, bind9, certbot, dev-machine, postgresdev. The app and assistant authenticate via OIDC (`openid-client` discovery + PKCE, `LOGIN_ISSUER`/`CLIENT_ID`/`CLIENT_SECRET`), store an iron-session cookie (`COOKIE_NAME`/`SESSION_PASSWORD`), and read env (`APP_URL`, `ADMIN_EMAIL`, `DB_CONNECTION_STRING`, `AI_API_KEY`, …). `infrastructure/.gitignore` already excludes `.env` and `certbot/`, so generated certs stay out of git. CI (`.github/workflows/homeserver.yml`) builds three images as artifacts and deploys when the main branch is green. Vitest is the repo-wide test runner; the web storybook project already drives Chromium via Playwright.

## Goals / Non-Goals

**Goals:**
- One local command that boots the real stack and smoke-tests it, needing only `AI_API_KEY`.
- CI runs the same suite against the freshly built image artifacts before deploy.
- Each service check fails clearly and independently; teardown is unconditional.
- A single "All Build Check Success" job aggregates every check and is the only merge requirement.

**Non-Goals:**
- Real Microsoft/Outlook or Entra integration; real WhatsApp pairing; AI response content beyond greeting/QR presence.
- Changes to production auth, nginx/caddy TLS config, or the real `infrastructure/docker-compose.yml`.
- Storybook/Chromatic coverage.

## Decisions

### 1. Standalone `integration-test/` workspace package (plain Node + Vitest)
A new package added to `pnpm-workspace.yaml` (`@homeserver/integration-test`), containing the smoke checks, a compose orchestrator, the mock OIDC server, the cert helper, and the CI override file. Rationale: the suite is infra tooling with no Next.js coupling; Vitest keeps one runner across the repo and can run both plain HTTP checks and browser checks. The package's `test` script runs the whole smoke flow; the repo's CI test jobs are directory-scoped (`working-directory`) so the suite does not run in the unit/integration/storybook jobs. Trade-off: a local `pnpm -r test` at the root will also trigger the smoke suite (docker required); accepted and documented — CI never runs the root `test` script.

### 2. Compose override with a profile to drop `certbot`, not a modified base file
`integration-test/docker-compose.ci.yml` extends the base file. Compose overrides cannot delete services, so "removes only the certbot service" is implemented by assigning `certbot` a profile (e.g. `profiles: ["never"]`) in the override; `docker compose up` without that profile skips it. Everything else stays: nginx, bind9, caddy, dev-machine (SSH 2222), postgresprod, applicationprod, assistant, whatsapp-bridge, dozzle, pgwebprod, plus the new `mock-oidc-server` service. The override pins fixed non-secret test values (`ADMIN_EMAIL`, `PROD_DB_PASSWORD`, `SESSION_PASSWORD`, `APP_URL=https://www.gutschi.site`, `OIDC_CLIENT_ID`/`CLIENT_SECRET`, `HOST_IP`, dummy `REPO_URL`/`GIT_*`/`DEV_SSH_KEY_PUB`) and overrides `env_file: .env` with a committed `integration-test/env.test` (compose merge replaces `env_file`), so CI never needs the real `.env`. `AI_API_KEY` is injected via `environment:` on the assistant (CI: `secrets.AI_API_KEY`; local: read from `../.env`). Relative paths in the base file resolve against `infrastructure/`, so bind mounts (nginx conf, `./certbot/conf`) keep working; run compose from the repo root with `-f infrastructure/docker-compose.yml -f integration-test/docker-compose.ci.yml`. Alternative considered: writing a stripped-down standalone compose — rejected: it would duplicate/desync from the real stack, defeating the purpose.

### 3. Self-signed certs via a committed helper
`integration-test/scripts/generate-certs.sh` runs `openssl` to produce `fullchain.pem`+`privkey.pem` for `dev.gutschi.site`, `www.gutschi.site`, `logs.gutschi.site` under `infrastructure/certbot/conf/live/<domain>/` (SANs cover all names; certs are git-ignored and regenerated on every run — CI and local both execute the helper before `docker compose up`). nginx mounts `./certbot/conf:/etc/letsencrypt:ro` unchanged; caddy needs no change (its `:8443/8444/8445` blocks auto-issue self-signed certs). Clients (fetch, browser) use `NODE_TLS_REJECT_UNAUTHORIZED=0` / `ignoreHTTPSErrors`. Alternative: committing certs — rejected (expiry, secrets hygiene).

### 4. Mock OIDC server as a first-class test-stack service
A small Node service (`integration-test/mock-oidc/`) exposing the openid-client discovery document, JWKS, authorize and token endpoints, implementing authorization code + PKCE against the fixed test `CLIENT_ID`/`CLIENT_SECRET`. It mints an ID token with `email`/`given_name` claims and returns `email` = test `ADMIN_EMAIL` so `getApplications(email)` resolves the admin's applications from the seeded DB. The override points `LOGIN_ISSUER`/`OIDC_ISSUER` at it and sets `APP_URL` to the app's URL so `/shared/auth/callback` round-trips inside the test stack without Entra. The Playwright checks authenticate through this flow end-to-end (also exercising the app's callback wiring); injecting an iron-session cookie sealed with the known test `SESSION_PASSWORD` is a documented fallback for flakiness.

### 5. Browser checks run inside Vitest via Playwright's Chromium API
Rather than a second runner, the suite launches a single Chromium instance (via `playwright`, same binary the storybook project installs) inside the Vitest run; browser tests get generous timeouts and retries for WebSocket-dependent content (assistant greeting, WhatsApp QR). The WhatsApp bridge runs unpaired on a fresh `WHATSAPP_DATA_DIR` per run, so it emits a QR that the `/startpage/whatsapp` page renders (react-qr-code → SVG region). Local runs clear/replace the bridge data dir to guarantee the unpaired state.

### 6. Orchestration: up → wait-for-healthy → test → down
A small Node orchestrator (`integration-test/scripts/run-smoke.mjs`, no extra deps beyond `node:child_process`) invoked by the package `test` script: (1) generate certs, (2) `docker compose -f … up -d` (with the CI override), (3) wait for every service's readiness — `docker compose up --wait` covers services that have healthchecks; bind9/dozzle/pgweb/mock-oidc/dev-machine get explicit polling (DNS answer, HTTP 200, TCP 2222), (4) run `vitest run`, (5) always `docker compose down --remove-orphans` (also on failure), and (6) exit non-zero if any check failed. The same orchestrator is used locally and in CI.

### 7. CI: `integration-smoke` job + "All Build Check Success" gate
New job in `.github/workflows/homeserver.yml` following the repo's existing action versions (checkout@v7, `.github/actions/setup`, artifact download@v8, cache@v6 for `~/.cache/ms-playwright`, `pnpm exec playwright install --with-deps`): `needs: [build-app, build-whatsapp, build-assistant]`, downloads the three image artifacts, `docker load`s them, generates certs, runs the orchestrator with `AI_API_KEY: ${{ secrets.AI_API_KEY }}`, and always tears down. `deploy` gains `integration-smoke` in its `needs` so the suite passes before the deploy step starts. A new `all-build-checks` job named "All Build Check Success" `needs` every lint/test/build job including `integration-smoke`; branch protection is updated so this is the only required check for merging. Alternative: requiring each job individually — rejected (churn on every job addition; the issue explicitly wants one gate).

## Risks / Trade-offs

- **Compose merge semantics** (env_file replacement, profile exclusion, port/volume merge) vary by compose version → Mitigation: keep the override minimal and additive; verify `docker compose config` in CI; pin docker compose v2 on the runner.
- **Runner port conflicts / leftover state** (nginx 80/443, bind9 53, dev-machine 2222) → Mitigation: dedicated ubuntu-latest runner, always teardown with `--remove-orphans` (also on failure), fresh bridge data dir each run.
- **`up --wait` only covers healthchecked services** → Mitigation: explicit readiness polling for bind9, dozzle, pgwebprod, mock-oidc-server, dev-machine before Vitest starts.
- **Assistant greeting depends on the AI provider being reachable from the runner with `AI_API_KEY`** → Mitigation: retry with backoff in the browser check; if the provider is unreachable the check fails loudly (per acceptance criteria) — treat as network/secret config, not suite flakiness.
- **Self-signed cert SAN/CA trust issues** → Mitigation: helper generates SANs for all three domains; every client explicitly disables verification for this suite only.
- **Suite duration on CI** (image load + stack boot + browser install) → Mitigation: reuse the storybook Playwright cache key; no image rebuild in the smoke job (artifacts are loaded).
- **Real `.env` drift** — local dev `.env` is loaded only for `AI_API_KEY`; everything else comes from `integration-test/env.test` → Mitigation: document this split in README; never commit `.env`.

## Migration Plan

- Deploy sequence is CI-only plus a new package: no production data, no production config changes, no schema changes.
- Rollback: revert the workflow change (deploy loses the gate, stack behavior unchanged) or the package (remove from workspace).
- Branch protection switch to "All Build Check Success" is the last step, after the new jobs are green on a PR.

## Open Questions

None — the issue body specifies the approach in detail; deferrable unknowns (exact readiness polling intervals, retry counts) are task-level tuning that do not affect the specs, design, or task breakdown.
