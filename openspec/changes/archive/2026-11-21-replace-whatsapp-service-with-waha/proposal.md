# Proposal

## Why

The WhatsApp bridge mirrors messages into a local SQLite store through wacli. That mirror is unreliable: old chats and archived chats are often missing or stale, because wacli only knows what its history sync happened to deliver. We do not want to write and maintain our own WhatsApp Web driver either. [WAHA](https://waha.devlike.pro) (free and open source since 2026.6.1, unlimited sessions) is a maintained, self-hosted REST server whose browser engine (`WEBJS`, whatsapp-web.js on Chromium) shows the live WhatsApp Web view, so it removes our mirror and the code around it.

## What Changes

- Remove the `services/whatsapp` service completely (companion, wacli, Dockerfile, tests, workspace package, pipeline job, dev scripts, wacli in the dev-machine image).
- Add a `waha` container (upstream image `devlikeapro/waha`, engine `WEBJS`) to the compose stack with a named volume for its session data, API-key protection, and no public route.
- `services/web` calls WAHA directly: `startpage/whatsapp/_external/whatsapp.ts` keeps its exported functions and the `Chat`/`Message`/`SyncStatus` types (so pages, server actions and the assistant tools stay unchanged) but maps them onto WAHA's REST API with one WAHA session per user and an `X-Api-Key` header.
- Configuration: `WHATSAPP_BRIDGE_URL` is replaced by `WAHA_URL` and `WAHA_API_KEY`.
- The "Full sync" button, its server action and the `fullsync` status are removed (live reads leave nothing to synchronise; the status for a starting session is renamed `starting`); "disconnect" is a session logout.
- Auto-unarchive on incoming message is no longer done by us: WhatsApp unarchives itself and the live view shows it.
- **BREAKING**: existing paired wacli sessions cannot be reused; every user scans the QR code once again.

Assumptions: the WEBJS engine reads chats and messages live (not from a local message DB), and exposes the archived flag of chats. Both are not stated explicitly in WAHA's docs and are verified first (see design, task 1) before the rest is built.

## Capabilities

### New Capabilities

### Modified Capabilities
- `web/startpage/whatsapp`: the page is driven by WAHA directly (per-user WAHA session, state-to-status mapping, live reads, actions through WAHA, API key protection) instead of the bridge.
- `whatsapp-bridge`: removed entirely (all requirements).
- `infrastructure`: the stack runs WAHA instead of the bridge (health gating, healthcheck, data volume, no public route, images, web configuration).
- `pipeline`: the WhatsApp service is no longer detected, tested, built, published or deployed.

## Impact

- Deleted: `services/whatsapp/`, `pnpm-workspace.yaml` entry, `dev:bridge` script, `whatsapp` job and references in `.github/workflows/pipeline.yml` and `.github/scripts/detect-changes.mjs` (+ test), wacli in `services/dev-machine/Dockerfile`.
- Changed: `services/web/app/startpage/whatsapp/_external/whatsapp.ts` (+ tests), `services/web/app/shared/config.ts`, `infrastructure/docker-compose.yml`, `infrastructure/README.md`, root `README.md`/`CLAUDE.md`, `openspec/specs/README.md`.
- Risks: WAHA's WEBJS engine is unofficial (WhatsApp Web automation may violate WhatsApp's terms; ban risk, personal low-volume use); WEBJS needs roughly 0.3 CPU / 400 MB per session and is documented for about 10 sessions per container; WAHA's archived-chat and message-history behaviour is unverified; the WAHA licence was not confirmed.
