# Proposal

## Why

The WhatsApp bridge mirrors messages into a local SQLite store through wacli. That mirror is unreliable: old chats and archived chats are often missing or stale, because wacli only knows what its history sync happened to deliver. WhatsApp Web itself always shows the full, current chat list (including the archive), so driving WhatsApp Web with a real browser removes the mirror and its sync problems.

## What Changes

- Replace wacli with a headless Chromium driven by Playwright (inside the existing `services/whatsapp` companion): one persistent browser context per user logged in to WhatsApp Web (QR pairing, session kept in the per-user data directory).
- Chats, messages, send, archive/unarchive and mark-as-read are done by operating WhatsApp Web live; there is no local message mirror, no sync process and no history/full-sync dependency.
- The REST API consumed by `services/web` stays as it is (same paths, request and response shapes, status types); `services/web` is not changed.
- Remove wacli-specific parts: the wacli binary and its download in both Dockerfiles, the per-user wacli processes, the HMAC-signed internal webhook, the LTHash/warning handling, the `WACLI_*` variables and the wacli supervisor/command wrapper.
- The container image now contains Chromium (Playwright base) instead of the wacli binary; the Dockerfile and compose healthcheck/volume adapt accordingly (the volume now holds browser profiles).
- Auto-unarchive on incoming message is no longer implemented by the bridge: WhatsApp itself unarchives a chat when a message arrives, and the live browser view reflects that.
- `POST /sessions/{userId}/full-sync` is kept for compatibility and now means "reload WhatsApp Web and rescan the chat list including the archive".
- **BREAKING**: existing paired wacli sessions cannot be reused; every user has to scan the QR code once again.

Assumption: "something based on Playwright" is realised as our own driver in the companion, using ideas from [greentap](https://github.com/psacc/greentap) (ARIA-based selectors, locale-independent), because no existing project offers stable chat IDs and archive/unarchive.

## Capabilities

### New Capabilities

### Modified Capabilities
- `whatsapp-bridge`: the per-user session is a Playwright-driven WhatsApp Web browser instead of wacli processes; wacli-specific requirements (process model, store lock, command timeout, webhook, warnings) and the bridge-side auto-unarchive are replaced by browser-session, live-read and per-user serialisation requirements; the REST API contract stays.

## Impact

- `services/whatsapp/`: companion rewritten around Playwright (`playwright` dependency, new browser/session/page-driver modules replacing `wacli.ts`, `supervisor.ts`, `internalWebhook.ts`, `mapping.ts`), Dockerfile, README, tests.
- `services/dev-machine/Dockerfile`: wacli installation removed (Chromium already present for Playwright).
- `infrastructure/docker-compose.yml`, `infrastructure/README.md`, root `README.md`/`CLAUDE.md`: wording and, if needed, memory/shm settings for the whatsapp container.
- `openspec/specs/whatsapp-bridge/spec.md` (via delta).
- Risks: WhatsApp Web is not a public API (DOM changes can break the driver; automation may violate WhatsApp's terms and carries a ban risk, personal low-volume use only); the container needs more memory than before.
