## 1. Spike (blocks the rest)

- [x] 1.1 Start WAHA (`devlikeapro/waha`, WEBJS) locally with a throwaway session, pair a real account and confirm: archived flag per chat (`chats/overview` / `chats`), old chats listed, messages per chat, sendText, archive/unarchive, logout path, QR response shape, ping endpoint for the healthcheck, where the Chromium profile is persisted; check WAHA's LICENSE. Adjust design.md (and stop to ask the user) if archived chats cannot be identified

## 2. Web client

- [x] 2.1 `services/web/app/shared/config.ts`: replace `WHATSAPP_BRIDGE_URL` by `WAHA_URL` and `WAHA_API_KEY`; update `services/.env` examples/docs
- [x] 2.2 `startpage/whatsapp/_external/whatsapp.ts`: WAHA client with the unchanged exported functions and types — session naming, create/start, status mapping incl. QR, chats, messages, send, archive, disconnect (logout + delete); remove the full sync button, action and `fullsync` status (renamed `starting`)
- [x] 2.3 Unit tests for the mapping functions and the client with a mocked `fetch`; adapt existing `server.tests.ts` mocks of the bridge client if needed

## 3. Remove the bridge

- [x] 3.1 Delete `services/whatsapp/`, its entry in `pnpm-workspace.yaml`, the `dev:bridge` script and refresh `pnpm-lock.yaml`
- [x] 3.2 `.github/workflows/pipeline.yml` and `.github/scripts/detect-changes.mjs` (+ test): drop the `whatsapp` service and job
- [x] 3.3 `services/dev-machine/Dockerfile`: remove the wacli installation; `pnpm dev` no longer starts the bridge (add WAHA as a local dev dependency, for example a compose snippet or documented `docker run` in the dev-machine docs)

## 4. Stack

- [x] 4.1 `infrastructure/docker-compose.yml`: add `waha` (pinned image, WEBJS, API key, dashboard/swagger off, `waha_sessions` volume, `shm_size`, healthcheck, internal network only); remove `whatsapp` and `whatsapp_data`; web depends on `waha` healthy and receives `WAHA_URL`/`WAHA_API_KEY`
- [x] 4.2 `infrastructure/README.md`: document WAHA, the `WAHA_API_KEY` secret, the volume and re-pairing; remove bridge text
- [x] 4.3 Root `README.md`, `CLAUDE.md` (services list, architecture), `openspec/specs/README.md`: replace the bridge with WAHA
- [x] 4.4 Update the Purpose of `openspec/specs/web/startpage/whatsapp/spec.md` (mentions the bridge) and make sure the empty `openspec/specs/whatsapp-bridge/` is removed when the change is archived

## 5. Verify

- [x] 5.1 `pnpm lint:ci`, `pnpm test`, `pnpm build` for web and the remaining packages; `openspec validate replace-whatsapp-service-with-waha --strict`
- [x] 5.2 Manual check against a real account through the web UI: pair, list incl. archived and old chats, read, send, archive/unarchive, disconnect, WAHA restart keeps the login
