# Tasks

All paths are under `services/web/` unless noted. Move files with `git mv` so history follows; move each file's tests with it.

## 1. Foundation: dependencies, config, database

- [x] 1.1 Add `@microsoft/microsoft-graph-client` and `async-mutex` to `services/web/package.json`; run `pnpm install` and verify the lockfile updates and `pnpm --filter @homeserver/web build` still resolves imports
- [x] 1.2 Add the Microsoft Graph settings (`MICROSOFT_GRAPH_APPLICATION_ID/CLIENT_SECRET/ISSUER`) to `app/shared/config.ts` (dev defaults like the assistant's); verify `AI_*` and `WHATSAPP_BRIDGE_URL` are already present and unit tests still pass
- [x] 1.3 Add migration `db/180_assistant_microsoft_token.sql` (`CREATE TABLE IF NOT EXISTS assistant_microsoft_token` with the assistant's columns) and verify the integration project (PGlite with all migrations) creates the table and an existing table is left untouched

## 2. Microsoft logic into the Microsoft page

- [x] 2.1 Move `graph.ts`, `mail.ts`, `todo.ts`, `calendar.ts`, `data.ts`, `types.ts` to `app/startpage/microsoft/_external/`, switching to the shared `transactional`/`nontransactional`, `config` and `logger` and the session type from `app/shared/auth`; make the per-user worker registry a `globalThis`-anchored singleton; verify the moved `mail`/`todo`/`calendar` unit tests pass
- [x] 2.2 Rewrite `startpage/microsoft/server.ts` to call that logic directly (status, check-status, message load, login URL, disconnect, mail/todo/calendar actions that `route.ts` served), porting `route.ts`'s validation and serialization; remove the cookie forwarding and `assistantFetch`; verify `server.tests.ts` runs against the real logic with Graph mocked and covers success and failure
- [x] 2.3 Make `startpage/microsoft/callback/route.ts` exchange the code with `handleMicrosoftLoginCallback` for the session user; verify a test (or `server.tests.ts` case) for success redirect and the `microsoft_callback_failed` redirect
- [x] 2.4 Replace the `@assistant/microsoft/types` imports in the Microsoft components/schemas with local types; verify `pnpm --filter @homeserver/web exec tsc --noEmit` is clean

## 3. WhatsApp logic into the WhatsApp page

- [x] 3.1 Move `whatsapp/whatsapp.ts` and `types.ts` to `app/startpage/whatsapp/_external/`; verify with the ported `route.tests.ts` cases (now bridge-client tests with `fetch` mocked)
- [x] 3.2 Rewrite `startpage/whatsapp/server.ts` to call the bridge client directly with the session user's email (keep `getAuthenticatedUserSession('startpage')` on every action, including `getStatus`, `archiveChat`, `sendChatMessage`, `fullSync`, `disconnectAccount`); verify `server.tests.ts` covers each action and the rejection without a session
- [x] 3.3 Replace the `@assistant/whatsapp/types` imports in components/schemas with local types; verify `tsc --noEmit` is clean

## 4. Assistant chat logic into `app/startpage/assistant/`

- [x] 4.1 Move `assistant.ts`, `initial.ts`, `tools.ts`, `system.md`, `types.ts` into `app/startpage/assistant/chat/` (next to the route that alone uses them), `groq.ts`, `tools/openmeteo.ts` and `tools/openstreetmap.ts` into `_external/`, `tools/*-tools.ts` into `_tools/`, and `skills/**` into `_skills/`; verify the moved `groq`, `initial`, `assistant`, `openmeteo`, `openstreetmap`, `skills` and `whatsapp-tools` tests pass in the `unit` project
- [x] 4.2 Replace runtime directory scanning with a static tool registry and a skill loader reading `_skills/` via `fs`; add `outputFileTracingIncludes` in `next.config` for `_skills/**` and `system.md`; verify a test that all tool files and skills are registered, a malformed skill is skipped and logged, and (task 7.2) that a production build includes the files
- [x] 4.3 Point the Microsoft/WhatsApp tools at the logic from sections 2 and 3 (no REST, no cookies); verify the tool tests pass and no import of `services/assistant` remains; the greeting must answer "Microsoft is not connected" immediately (no startup wait) when the user has no Microsoft token, verified by a test

## 5. HTTP chat endpoint and client

- [x] 5.1 Implement the in-memory conversation store (`globalThis`, owner email, idle TTL 5 min renewed per request, one in-flight answer) and verify unit tests for expiry, other-user access (gone) and concurrent message (conflict)
- [x] 5.2 Implement `app/startpage/assistant/chat/route.ts`: `POST` with zod-validated `start`/`message` bodies, `getAuthenticatedUserSession('startpage')` (401/403), NDJSON stream of `initialized`/`stream_response`/`tool_call`/`finished_response`/`got_actions`/`error`, model call bound to `request.signal`; verify a route test per status code (200 stream, 400, 401, 409, 410) and an event-order test for a streamed answer with tool call and actions
- [x] 5.3 Replace `_components/AiChatWebSocket.ts` with `AiChatConnection.ts` (fetch + stream line parser, `AbortController`, stall timer, error message and return to `ready` on failure, 410 → conversation ended with restart offer); drop the reconnect/backoff states from `ChatState` and from `AiChatWindow`/stories; verify updated unit/Storybook interaction tests for streaming, failure-then-resend, stall and restart
- [x] 5.4 Remove the `ws` usage and `NEXT_PUBLIC_ASSISTANT_WEBSOCKET_URL`; verify `grep -r "ws/assistant\|WebSocket" services/web/app` finds nothing relevant

## 6. Remove the assistant service and its wiring

- [x] 6.1 Delete `services/assistant/`; remove the `@assistant/*` alias from `services/web/tsconfig.json` and the type copies from `services/web/Dockerfile`; verify `pnpm install` and `pnpm build` pass
- [x] 6.2 Update the root `package.json` (`dev`, `dev:assistant`), `ASSISTANT_INTERNAL_URL` in `config.ts` and `services/.env` examples; verify `pnpm dev` starts web, bridge and wichteln without an assistant process
- [x] 6.3 Update `infrastructure/docker-compose.yml` (remove the `assistant` service and `ASSISTANT_INTERNAL_URL`; give `web` the `AI_API_KEY`, Microsoft Graph and `WHATSAPP_BRIDGE_URL` settings and make it depend on the healthy `whatsapp` bridge) and `infrastructure/nginx/nginx.conf` (remove both `/ws/assistant` blocks; raise `proxy_read_timeout`/`proxy_send_timeout` on the web `location /` of the dev and prod hosts; the chat route's `X-Accel-Buffering: no` header handles unbuffered streaming); verify `docker compose config` is valid and nginx `-t` passes
- [x] 6.4 Remove `assistant` from `.github/workflows/pipeline.yml` (outputs, job, `needs`) and from `SERVICES` in `.github/scripts/detect-changes.mjs` plus its tests; verify `node --test .github/scripts/detect-changes.test.mjs` passes and the workflow lints
- [x] 6.5 Update `CLAUDE.md` (services list, architecture, dev commands), `openspec/specs/README.md` if it lists the assistant, and any dev-machine docs/spec text; verify `grep -ri "services/assistant\|ASSISTANT_INTERNAL_URL" --exclude-dir=node_modules --exclude-dir=archive .` finds nothing

## 7. Integration verification

- [x] 7.1 Run `pnpm lint:ci` and `pnpm test` for all packages; verify green
- [x] 7.2 Run `pnpm --filter @homeserver/web build` and start the standalone server; verify `_skills`/`system.md` are present in the output and the chat answers
- [ ] 7.3 Run the app in the dev container and verify end to end: chat greeting and a streamed tool answer, Microsoft connect/callback/read, WhatsApp chats and send, and that a restarted web process yields the "conversation ended" restart offer

## Workflow follow-up

- Show the full diff for a single review, then commit and push once.
- Archive the change with the openspec-archive-change workflow after review.
