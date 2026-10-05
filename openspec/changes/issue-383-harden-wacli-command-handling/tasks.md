# Tasks

## 1. Short-command timeout default

- [x] 1.1 Lower the `WHATSAPP_CMD_TIMEOUT_MS` default from `30_000` to `20_000` in `whatsapp-bridge/companion/config.ts` and update the documented default in the env table in `whatsapp-bridge/README.md`; add a `whatsapp-bridge/companion/config.tests.ts` that asserts the default is 20000 and that the environment variable overrides it; verify with `pnpm --filter @homeserver/whatsapp-bridge test` and `pnpm --filter @homeserver/whatsapp-bridge build`

## 2. Warning events from wacli

- [x] 2.1 Add a `warning` variant (`{ code?, message, name? }`) to `WacliEvent` in `whatsapp-bridge/companion/wacli.ts`, log warning events at warn level (code and message) in `attachEventParser` while other events stay at debug, and export `attachEventParser` for testing; add `whatsapp-bridge/companion/wacli.tests.ts` asserting a warning line is logged at warn level with its message and a non-warning line is not; verify with `pnpm --filter @homeserver/whatsapp-bridge test`
- [x] 2.2 Handle the `warning` event in `Supervisor.handleEvent`: a message containing `hit an LTHash mismatch` is logged at warn level and returns `true` so the pending start fails, without changing the session status; any other warning is ignored (returns `false`); add `supervisor.tests.ts` cases that an LTHash warning rejects a pending `start()` while the status stays `connecting` and that an unrelated warning leaves the status unchanged; verify with `pnpm --filter @homeserver/whatsapp-bridge test`

## 3. Errors from a stopped process

- [x] 3.1 Ignore `error` events in `Supervisor.handleEvent` when `this.child === null` in addition to `this.isStopping`; add a `supervisor.tests.ts` case that an error delivered after the process closed leaves the session status unchanged; verify with `pnpm --filter @homeserver/whatsapp-bridge test`

## 4. One short command per store

- [x] 4.1 Add a per-store coordinator in `whatsapp-bridge/companion/wacli.ts` that tracks an in-flight `runWacli` command and rejects a second `runWacli` for the same store immediately, clearing the flag in a `finally` so a timeout, error or exit always releases it; add `wacli.tests.ts` cases (overlapping command rejected without spawning, same-store flag released after settle, different stores unaffected) using `node:child_process` mocks and distinct store directories; verify with `pnpm --filter @homeserver/whatsapp-bridge test` and `pnpm --filter @homeserver/whatsapp-bridge build`

## 5. Long process waits for the short command

- [x] 5.1 Make `spawnWacli` async and have it await the store's in-flight short command before spawning; await it in `Supervisor.start()` (build the result promise first, assign `this.child` once the spawn resolves) and update the `wacli` mock in `supervisor.tests.ts` to return a promise; add `wacli.tests.ts` cases (spawn waits until the running short command settles, spawns immediately when the store is idle) and a `supervisor.tests.ts` case that `start()` still connects; verify with `pnpm --filter @homeserver/whatsapp-bridge test` and `pnpm --filter @homeserver/whatsapp-bridge build`

## 6. Diagnose the web-to-assistant hop

- [x] 6.1 In `assistant/server.ts`, log the address the socket actually bound to together with the `HOSTNAME` it came from, handle `server.on('error')` by logging host/port and exiting non-zero, and trace every served HTTP request (method, path, status, duration) at debug; verify live: startup logged `Assistant ready on http://172.19.0.3:8500 (listen address from HOSTNAME=9984ba3a0e8d)`, a second instance logged `EADDRINUSE` and exited 1, and requests produced `GET /health 200` / `GET /nope 404` debug lines
- [x] 6.2 In `web/app/startpage/microsoft/server.ts` and `web/app/startpage/whatsapp/server.ts`, log the full target URL and the unwrapped error cause whenever a call to the assistant fails, then rethrow unchanged; add a refused-connection test to `microsoft/server.tests.ts` and a new `whatsapp/server.tests.ts`; verify with `pnpm --filter @homeserver/web exec vitest run --project integration app/startpage/microsoft/server.tests.ts app/startpage/whatsapp/server.tests.ts`
- [x] 6.3 Point the development default of `ASSISTANT_INTERNAL_URL` in `web/app/shared/config.ts` at `http://dev-machine:8500` (the assistant keeps binding its container address because external requests depend on it) and update the affected test expectations; verify by `curl http://dev-machine:8500/health` returning `ok` against the dev assistant while `localhost:8500` is refused, plus the updated web tests and `pnpm --filter @homeserver/web lint:ci`
