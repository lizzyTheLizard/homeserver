## Why

Today CI validates unit tests, integration tests, Storybook, and image builds, but nothing ever boots the full docker-compose stack before deploy. A build that passes tests yet breaks the running stack (nginx routing, DNS, the assistant, the WhatsApp bridge) is deployed straight to the home server. The maintainer wants an automated smoke suite that boots the entire stack — with real TLS via self-signed certs and real DNS — and verifies the core services actually work, so a broken build is caught in CI before the deploy step rolls it out.

## What Changes

- **New workspace package `integration-test/`** — a plain Node app (no Next.js) added to `pnpm-workspace.yaml`, using Vitest. It owns the smoke tests; the docker compose lifecycle (`up -> wait-for-healthy -> test -> down`) is executed as explicit steps by the CI pipeline, not by a script inside the package.
- **Smoke assertions against the running stack**: SSH port 2222 accepts connections; bind9 DNS answers queries; Dozzle serves its UI over HTTPS; Pgweb serves its UI; the application is healthy and reachable over HTTPS through nginx; an authenticated request to the main page shows the assistant greeting (assistant exercised with `AI_API_KEY`); the WhatsApp page renders a QR code.
- **Headless-browser checks** (Playwright/Chromium, as the storybook project uses): log in via a mock OIDC flow (or inject the iron-session cookie with the known test `SESSION_SECRET`), open `/`, assert the greeting text; open `/startpage/whatsapp`, assert a QR region is present. `ignoreHTTPSErrors` / `NODE_TLS_REJECT_UNAUTHORIZED=0` for the self-signed cert.
- **Mock OIDC**: a `mock-oidc-server` service added to the test stack; the app/assistant are configured via test env (`OIDC_ISSUER` → mock, fixed `OIDC_CLIENT_ID`/`OIDC_CLIENT_SECRET`, `SESSION_SECRET`, `APP_URL`) so `openid-client` discovery and `/shared/auth/callback` work without Entra.
- **CI compose override** `integration-test/docker-compose.ci.yml` extends `infrastructure/docker-compose.yml`: removes only the `certbot` service, keeps `nginx`, `bind9`, `caddy`, `dev-machine` (SSH 2222), `postgres`, `applicationprod`, `assistant`, `whatsapp-bridge`, `dozzle`, `pgwebprod`; wires the mock IdP; sets fixed non-secret test values (`ADMIN_EMAIL`, DB passwords, `SESSION_SECRET`); passes `AI_API_KEY` into the `assistant` service.
- **Self-signed certs**: a committed helper `integration-test/scripts/generate-certs.sh` runs `openssl` to create `fullchain.pem` + `privkey.pem` for `dev.gutschi.site`, `www.gutschi.site`, `logs.gutschi.site` under `infrastructure/certbot/conf/live/<domain>/`. nginx config is untouched; caddy needs no change (its `:8443`/`:8444`/`:8445` blocks auto-issue self-signed certs).
- **CI job placement**: a new `integration-smoke` job in `.github/workflows/homeserver.yml` that `needs` `build-app`, `build-whatsapp`, `build-assistant`; downloads the three image artifacts, `docker load`s them, then runs each step directly: adds the smoke hosts to `/etc/hosts`, generates certs (`pnpm --filter @homeserver/integration-test certs`), creates `infrastructure/.env` from `integration-test/env.test` when missing, starts the override stack (`docker compose up -d --wait`), installs Playwright Chromium (`pnpm exec playwright install --with-deps`), runs Vitest (`pnpm --filter @homeserver/integration-test test`), and always tears the stack down (`docker compose down --remove-orphans -v`). `integration-smoke` is added to the `deploy` job's `needs`. `AI_API_KEY` comes from `secrets.AI_API_KEY`.
- **Single required check**: a new "All Build Check Success" job that depends on all testing, linting and building jobs (including `integration-smoke`). This becomes the only check required to merge a PR.
- **Local run**: same documented step sequence as CI — `pnpm --filter @homeserver/integration-test certs`, add the hosts entries once, `[ -f infrastructure/.env ] || cp integration-test/env.test infrastructure/.env`, `docker compose … up -d --wait`, `pnpm --filter @homeserver/integration-test test`, `docker compose … down`. Documented in `README.md` / `infrastructure/README.md`. Locally `AI_API_KEY` goes into `infrastructure/.env` (not committed) or the shell environment.
- **Secrets**: only `AI_API_KEY` is a real secret (CI: `secrets.AI_API_KEY`; local: `.env`). No Entra client secret, no other credentials.

## Capabilities

### New Capabilities

- `ci/integration-smoke`: The CI pipeline builds the three container images, boots the full docker-compose stack with the smoke-test override, runs the smoke suite, and only then deploys. A single "All Build Check Success" job aggregates all testing/linting/building jobs and is the only check required to merge.
- `testing/stack-smoke-suite`: The stack smoke suite (the `integration-test` package + the CI `integration-smoke` job steps) boots the full docker-compose stack — self-signed TLS, real DNS, mock OIDC, fixed non-secret test values — verifies each core service with plain HTTP/TLS checks and headless-browser checks, fails clearly per service, and tears the stack down cleanly. The lifecycle steps are executed directly by the pipeline and are documented for local runs.

### Modified Capabilities

<!-- No existing capabilities: openspec/specs is empty; nothing to modify. -->

## Impact

- `.github/workflows/homeserver.yml` — new `integration-smoke` job, `All Build Check Success` job, `deploy` needs updated.
- `pnpm-workspace.yaml` — registers the new `integration-test` package.
- `infrastructure/docker-compose.yml` — untouched; a new override `integration-test/docker-compose.ci.yml` extends it.
- `infrastructure/certbot/conf/live/<domain>/` — generated certs (git-ignored or regenerated by the helper; helper committed).
- New package `integration-test/` (Vitest config, smoke tests, `certs` pnpm target, Playwright usage, cert helper, mock OIDC server).
- `README.md` / `infrastructure/README.md` — local run instructions.
- Branch protection on the repo — required status check switched to "All Build Check Success".
- No changes to production auth, the real Entra configuration, or nginx/caddy TLS config. Out of scope: real Microsoft/Outlook integration, real WhatsApp pairing, AI response content beyond greeting/QR checks, Storybook/chromatic.
