# Design

## Context

Today `services/web` calls the `services/whatsapp` companion (Express + wacli, SQLite mirror) through `startpage/whatsapp/_external/whatsapp.ts` (`ensureWhatsappStarted`, `startWhatsapp`, `getWhatsappStatus`, `getWhatsappChats`, `getWhatsappMessages`, `sendWhatsappMessage`, `archiveWhatsappChat`, `triggerWhatsappFullSync`, `disconnectWhatsapp`). All callers depend on those functions and the types in `_external/types.ts`. See proposal.md for motivation.

## Goals / Non-Goals

**Goals:**
- Live, complete chat list (including archived and old chats) via WAHA's browser engine.
- No companion service and no own browser driver; WAHA is a stock container.
- `services/web` callers (pages, actions, assistant tools) unchanged.

**Non-Goals:**
- Media, reactions, polls, webhooks/event streaming, channels; text only as today.
- Migrating wacli sessions or data (re-pairing required).
- Scaling beyond roughly 10 simultaneous users per container.

## Decisions

1. **WAHA with the `WEBJS` engine, image `devlikeapro/waha`** (pinned tag, kept current by Renovate), `WHATSAPP_DEFAULT_ENGINE=WEBJS`. Alternatives: Baileys/NOWEB or GOWS engine (no browser, but a local message store and the same history-sync weaknesses we want to leave), Evolution API (licence activation), whatsapp-web.js as a library in web (browser inside the Next.js process).
2. **Storage.** Sessions are kept as files under `/app/.sessions/webjs/<session>/` plus `waha.sqlite3`; mount `/app/.sessions` as the named volume `waha_sessions` (replaces `whatsapp_data`, still not backed up — a session can be re-paired). Media is not needed and left at its 180 s default. Whether the Chromium profile lives under `/app/.sessions` is not documented and is checked in task 1; if not, the profile directory is mounted explicitly so logins survive restarts. PostgreSQL session storage is not used.
3. **Direct client in web.** `_external/whatsapp.ts` becomes a small WAHA client (`fetch` + `zod`, as today) plus mapping functions; the exported functions and types stay. Config: `WAHA_URL` (default `http://localhost:3002` in dev) and `WAHA_API_KEY`, validated like the other config entries. The key is only used server-side (server actions).
4. **Session per user.** Session name = short SHA-256 of the user's email (same idea as the previous store id; WAHA session names are restricted to URL-safe characters). `ensureWhatsappStarted`/`startWhatsapp` create it if missing (`POST /api/sessions`, body `{name, start: true}`), start it if stopped (`POST /api/sessions/{s}/start`), and return the mapped status.
5. **Status mapping** (`GET /api/sessions/{s}`): `SCAN_QR_CODE` → `needAuth` with the QR from `GET /api/{s}/auth/qr` (JSON with `Accept: application/json`, `format=raw` value used as the QR string so the existing QR rendering keeps working); `WORKING` → `connected`; `STARTING` → `starting` (the page shows a spinner and keeps polling until `WORKING`); `STOPPED`, `FAILED` or 404 → `closed`.
6. **Chats.** `GET /api/{s}/chats` (paged, sorted by last message; WEBJS chat objects are expected to carry `archived`, unlike the overview) is mapped to `Chat`: id (`…@c.us` / `…@g.us`), name, group = `@g.us`, last message timestamp. **Archived flag:** the docs show no list filter for archived chats (only a `chat.archive` event). Task 1 checks what the WEBJS engine returns in the chat objects; the fallback, if no flag is returned, is a documented limitation decided with the user (for example reading the archive flag from `GET /api/{s}/chats`, or tracking archive state ourselves from our own archive actions and the `chat.archive` webhook). This is the main risk of the change.
7. **Messages.** `GET /api/{s}/chats/{chatId}/messages?limit=<WHATSAPP_MESSAGES_LIMIT>&downloadMedia=false`, mapped to `Message` (text only, `fromMe` → name `Me`, otherwise the sender name or number as before), sorted oldest first.
8. **Actions.** Send: `POST /api/sendText` `{session, chatId, text}`. Archive/unarchive: `POST /api/{s}/chats/{id}/archive|unarchive`. There is no mark-read and no full sync: nothing in the page or assistant uses mark-read, and live reads leave nothing to synchronise (the button, server action and `fullsync` status are removed; the status type `fullsync` becomes `starting`). Disconnect: logout (docs disagree on `POST /api/sessions/{s}/logout` vs `/api/sessions/logout`; verified in task 1) then delete the session.
9. **Security.** One plain `WAHA_API_KEY` from `infrastructure/.env` is read by both WAHA and web (web via `env_file`); a hashed key would need a second variable and is not worth it on an internal network. WAHA's dashboard/swagger is disabled (`WAHA_DASHBOARD_ENABLED=False`, `WHATSAPP_SWAGGER_ENABLED=False`), and the container is only on the internal compose network with no nginx route.
10. **Compose.** Service `waha` (`container_name: WAHA`, pinned tag `latest-2026.10.1`) and a separate `wahadev` (own volume, used by the dev machine so development never touches prod sessions), volume `waha_sessions`, `shm_size` for Chromium, a healthcheck against WAHA's ping endpoint (verified in task 1), web depends on it being healthy (replacing the bridge dependency), `WAHA_URL: http://waha:3000` for web. The pipeline loses the whatsapp job; the WAHA image is upstream and not built by us.
11. **Tests.** The mapping functions (session state → status, WAHA chat/message → `Chat`/`Message`, session naming) are unit-tested; the client functions are tested against a mocked `fetch`. No test talks to WAHA or WhatsApp.

## Risks / Trade-offs

- [Archived flag or old chats not provided by WEBJS] → verified first with a real account (task 1); if impossible, stop and revisit the engine choice (NOWEB/GOWS) with the user.
- [WAHA is unofficial and WhatsApp may ban automation] → personal, low-volume use only; documented in README.
- [Browser-based engine uses memory per session] → about 400 MB per session; fine for a few users.
- [WAHA docs are inconsistent (logout path, QR method) and the licence is unconfirmed] → verified against a running instance and the repository's LICENSE in task 1.
- [WAHA API changes between versions] → pinned image tag, Renovate PRs reviewed, client isolated in one file.

## Migration Plan

1. Merge: the pipeline publishes the web image and deploys the infrastructure change (WAHA container added, bridge removed, `WAHA_API_KEY` secret provided on the server in `infrastructure/.env`).
2. Each user opens the WhatsApp page once and scans the QR code again.
3. Afterwards the old `whatsapp_data` volume can be deleted by hand.
4. Rollback: redeploy the previous web image and the previous compose file (bridge image and its volume are untouched until deleted).
