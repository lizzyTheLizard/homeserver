## 1. Spike (blocks the rest)

- [ ] 1.1 Add `playwright` to `services/whatsapp`, and script a throwaway run (not committed) that logs in to WhatsApp Web with a persistent profile and confirms chat JIDs, archived section, and message rows can be read from the DOM; adjust design.md if JIDs cannot be obtained

## 2. Driver

- [ ] 2.1 `browser.ts`: launch/close a persistent Chromium context per user under `WHATSAPP_DATA_DIR/<store-id>/profile`, crash/disconnect events, idle close
- [ ] 2.2 `page.ts`: QR/connected detection, chat list incl. archive (scroll to end), messages per chat id, send, archive/unarchive, open/mark read, log out — with pure parsing helpers
- [ ] 2.3 `session.ts`: per-user status, QR, mutex, operation timeout with page reload, full-sync reload, disconnect (log out + delete profile), lost-session recovery
- [ ] 2.4 `server.ts`/`config.ts`: wire routes to the session (same paths and shapes), drop the webhook route and `WACLI_*` config, add `WHATSAPP_BROWSER_HEADLESS`
- [ ] 2.5 Delete `wacli.ts`, `supervisor.ts`, `internalWebhook.ts`, `mapping.ts`, `isRecord.ts` (if unused) and their tests

## 3. Tests

- [ ] 3.1 Fixture-based unit tests for the parsing helpers in `page.ts` (chats, archived flag, messages, QR)
- [ ] 3.2 `session.ts` tests with a fake page driver: status transitions, serialisation per user, timeout, full-sync no-op/failure, lost session
- [ ] 3.3 `config.tests.ts` and `server` route tests updated; `pnpm --filter @homeserver/whatsapp test` and `lint:ci` pass

## 4. Packaging and docs

- [ ] 4.1 `services/whatsapp/Dockerfile`: replace the wacli stage with a Chromium/Playwright runtime, non-root, `/data` volume
- [ ] 4.2 `infrastructure/docker-compose.yml`: `shm_size`, healthcheck start period; update `infrastructure/README.md`
- [ ] 4.3 `services/dev-machine/Dockerfile`: remove wacli installation
- [ ] 4.4 Rewrite `services/whatsapp/README.md` (architecture, env vars, risks) and fix wacli mentions in root `README.md`, `CLAUDE.md`, `services/web/app/shared/config.ts` comments, `openspec/specs/README.md`
- [ ] 4.5 Update the Purpose of `openspec/specs/whatsapp-bridge/spec.md` (still describes wacli) and `.gitignore` entries

## 5. Verify

- [ ] 5.1 `pnpm lint:ci`, `pnpm test`, `pnpm build` for the whatsapp and web packages; build the Docker image
- [ ] 5.2 Manual check against a real account: pair, list incl. archived/old chats, read, send, archive/unarchive, full sync, disconnect, restart keeps login
