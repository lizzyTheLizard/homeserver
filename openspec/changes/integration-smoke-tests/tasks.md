## 1. Package scaffolding

- [x] 1.1 Add `integration-test` to `pnpm-workspace.yaml` and create the package skeleton (`package.json` for `@homeserver/integration-test` with `vitest` + `playwright` devDeps, `tsconfig.json`, `eslint.config.mjs`, `vitest.config.mts`); verify `pnpm install` succeeds and `pnpm --filter @homeserver/integration-test vitest --version` prints a version
- [x] 1.2 Add package scripts: `certs` = `bash scripts/generate-certs.sh` and `test` = `vitest run` (all checks; no lifecycle orchestration in the package — the pipeline drives the steps); verify `pnpm --filter @homeserver/integration-test test` starts the Vitest suite
- [x] 1.3 Add the package to root `README.md` short description of purpose; verify README renders the new package entry

## 2. Test-mode stack

- [x] 2.1 Commit `integration-test/scripts/generate-certs.sh` that runs `openssl` to write `fullchain.pem`+`privkey.pem` (SANs for `dev.gutschi.site`, `www.gutschi.site`, `logs.gutschi.site`) under `infrastructure/certbot/conf/live/<domain>/`; verify running it produces the six files and `openssl x509 -in ... -noout -text` shows the SANs
- [x] 2.2 Commit `integration-test/env.test` with fixed non-secret test values (ADMIN_EMAIL, PROD_DB_PASSWORD, SESSION_PASSWORD, APP_URL, CLIENT_ID, LOGIN_ISSUER→mock, CLIENT_SECRET, HOST_IP, dummy REPO_URL/GIT_*/DEV_SSH_KEY_PUB); verify `docker compose --env-file integration-test/env.test config` resolves the base interpolation without a real `.env`
- [x] 2.3 Implement `integration-test/mock-oidc/` as a Node service built on the maintained `oidc-provider` library: HTTPS discovery/JWKS/authorize/token (authorization-code + PKCE), interactions auto-approved against a fixed account whose ID token carries `email` = test ADMIN_EMAIL and `given_name`; verify with a scripted protocol flow (discovery, authorize redirects, token exchange, negatives) that a token is minted and claims contain the test email
- [x] 2.4 Create `integration-test/docker-compose.ci.yml` extending the base file: assign `certbot` a disabled profile, add `mock-oidc-server` (env.test via env_file), attach `env.test` to the services that carry `env_file: .env` (applicationprod/assistant/caddy/bind9/backup), keep only non-env.test pins in `environment:` (DB_CONNECTION_STRING, NODE_TLS_REJECT_UNAUTHORIZED, AI_API_KEY, POSTGRES_PASSWORD, WHATSAPP_DATA_DIR, mock PORT/HEALTH_PORT/ISSUER/USER_EMAIL/USER_NAME), add `SKIP_GITHUB_BOOTSTRAP: "1"` to dev-machine; verify `docker compose -f infrastructure/docker-compose.yml -f integration-test/docker-compose.ci.yml config` shows certbot profiled out, mock-oidc-server present, env.test values effective, and no reference to the repo `.env`

## 3. Pipeline-driven lifecycle (no orchestrator script)

- [x] 3.1 Expose certificate generation as the package `certs` script (`bash scripts/generate-certs.sh`) so CI can run it as its own step; verify `pnpm --filter @homeserver/integration-test certs` writes the six cert files
- [x] 3.2 Rewrite the `integration-smoke` job in `.github/workflows/homeserver.yml` to execute each lifecycle step directly and in order: map smoke hosts to `/etc/hosts` (sudo), `pnpm --filter @homeserver/integration-test certs`, create `infrastructure/.env` from `integration-test/env.test` when missing (plain shell, no dedicated script), `docker compose -f infrastructure/docker-compose.yml -f integration-test/docker-compose.ci.yml up -d --wait --wait-timeout 300 --remove-orphans` (with `AI_API_KEY` from secrets), `pnpm --filter @homeserver/integration-test test`, and an `if: always()` `docker compose … down --remove-orphans -v`; verify the workflow YAML is valid and the teardown step runs even when the checks fail
- [x] 3.3 Make the checks for services without healthchecks self-polling inside Vitest (bind9 DNS answer, dozzle/pgwebprod HTTPS 200, dev-machine TCP 2222, application docker health) so no separate readiness gate is needed; delete `integration-test/scripts/run-smoke.mjs` and remove all references (package.json `test` script, `src/stack.ts` comment, README/design/spec text); verify `pnpm test` runs the checks and each failure names its service
- [x] 3.4 Keep the WhatsApp bridge unpaired per run via the ephemeral `whatsapp_data` volume removed by `down -v` (CI and local); verify after a fresh run the bridge logs show an auth/QR phase

## 4. Smoke checks

- [x] 4.1 Implement plain infra checks in Vitest: TCP connect to SSH 2222; DNS query answered by bind9; Dozzle UI HTTPS 200; Pgweb UI HTTPS 200; app container healthy + `/shared/ping` 200; app root reachable via nginx HTTPS (TLS verification disabled for self-signed certs); verify each check reports the service name and fails individually when its target is stopped (e.g. `docker compose stop dozzle` → that check only)
- [x] 4.2 Implement Playwright browser checks (Chromium, `ignoreHTTPSErrors`): authenticate through the mock OIDC flow (or injected iron-session cookie sealed with the test SESSION_PASSWORD), open `/`, assert the assistant greeting text; open `/startpage/whatsapp`, assert a QR region (SVG) is present; verify both pass against the running test stack with `AI_API_KEY` set
- [x] 4.3 Add retry/backoff for WebSocket-dependent assertions (greeting, QR) so transient assistant/bridge startup does not flake; verify by running the browser checks twice in a row with both passing
- [x] 4.4 Wire the full flow end-to-end: pipeline starts the stack (`up -d --wait`) then `pnpm test` runs all checks, then tears down; verify locally with the documented step sequence that a healthy stack passes all checks and a downed service fails with a clear per-service message

## 5. CI integration

- [x] 5.1 Add the `integration-smoke` job to `.github/workflows/homeserver.yml` (`needs: [build-app, build-whatsapp, build-assistant]`, download+`docker load` the three artifacts, hosts edit via `sudo tee -a /etc/hosts`, cache/install Playwright Chromium, then the §3 lifecycle steps with `AI_API_KEY: ${{ secrets.AI_API_KEY }}` and always teardown); verify the workflow file is valid YAML and the job only starts after the three build jobs
- [x] 5.2 Add `integration-smoke` to the `deploy` job's `needs`; verify the deploy job lists it in `needs` so it cannot start before the suite passes
- [x] 5.3 Add the `all-build-checks` job named "All Build Check Success" that `needs` every lint/test/build job including `integration-smoke`; verify on a PR that the check appears, passes when all jobs pass, and fails when any job fails
- [ ] 5.4 Update branch protection so "All Build Check Success" is the only required status check; verify on the PR that the merge is blocked solely by that check

## 6. Local run docs & cleanup

- [x] 6.1 Document the local run in `README.md` / `infrastructure/README.md` (build images locally first, `pnpm certs`, hosts entries, `infrastructure/.env` creation, compose up, `pnpm test`, compose down, `AI_API_KEY` in `infrastructure/.env` or the environment); verify the documented commands run from a clean checkout
- [x] 6.2 Add any remaining git-ignore rules for generated test artifacts (certs already ignored via `infrastructure/.gitignore`; bridge data dirs if created under the repo); verify `git status` shows no generated certs or session data
- [x] 6.3 Run the repo-wide checks (`pnpm lint:ci`, `pnpm build`) with the new package included and verify nothing outside the smoke flow breaks
