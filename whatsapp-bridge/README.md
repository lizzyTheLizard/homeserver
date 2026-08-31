# WhatsApp Bridge

Multi-user WhatsApp bridge that exposes a REST API for the Homeserver Next.js app. It is a **single Docker container** that runs two things:

1. **[wacli](https://github.com/openclaw/wacli)** — a prebuilt CLI (built on [whatsmeow](https://github.com/tulir/whatsmeow)) that owns the WhatsApp linked-device session and mirrors messages into a local **SQLite** store.
2. **A small TypeScript companion app** built on [Express](https://expressjs.com/) (`companion/`) that drives `wacli` and exposes the same REST API as the previous Go bridge.

There is no Go code in this repository: `wacli` is downloaded as a release binary during the Docker build.

## Architecture

```text
Next.js / assistant
      │  HTTP (WHATSAPP_BRIDGE_URL, port 8400)
      ▼
companion/server.ts     ─── REST API
      │  spawns / drives
      ▼
wacli (one process per user)
      ├── auth --events          → QR pairing until linked
      └── sync --follow --events → live message mirror into SQLite
      │
      ▼
/data/<store-id>/session.db   (whatsmeow keys)
/data/<store-id>/wacli.db     (chats, contacts, groups, messages)
```

Each user (the assistant passes the user's email) maps to an isolated wacli store
directory under `WHATSAPP_DATA_DIR`. The directory name is a short SHA-256 of the
user id, so it is deterministic and filesystem-safe.

- **`auth --events`** runs while the account is unpaired. It emits `qr_code`
  NDJSON events that the companion turns into the `needAuth` + `qr` status. When
  the user pairs, it runs bootstrap sync and exits; the companion then switches
  to the follow sync.
- **`sync --follow --events`** runs while the account is linked. It holds the
  store lock and keeps the SQLite mirror current. `send` commands are delegated
  to it by wacli (via a unix socket), so sending works while sync is running.
- Reads (`chats`, `messages`) and `auth status` are one-shot, lock-free `wacli`
  commands.
- Commands that need the lock themselves (`archive-chat`, `mark-chat-read`,
  `full-sync`) briefly pause the follow sync, run, and resume it.

## REST API

| Method | Path | Body | Response |
|---|---|---|---|
| `GET` | `/health` | — | `200` |
| `POST` | `/sessions/{userId}/start` | — | `200` `{type, qr?, error?}` |
| `GET` | `/sessions/{userId}/status` | — | `200` `{type, qr?, error?}` |
| `POST` | `/sessions/{userId}/stop` | — | `204` |
| `POST` | `/sessions/{userId}/send-message` | `{to, text}` | `204` |
| `POST` | `/sessions/{userId}/archive-chat` | `{id, archived}` | `204` |
| `POST` | `/sessions/{userId}/mark-chat-read` | `{id}` | `204` |
| `POST` | `/sessions/{userId}/full-sync` | — | `202` |
| `POST` | `/sessions/{userId}/disconnect` | — | `204` |
| `GET` | `/sessions/{userId}/chats` | — | `200` `Chat[]` |
| `GET` | `/sessions/{userId}/messages?chatId=...` | — | `200` `Message[]` |

Status `type` values are unchanged: `connecting`, `needAuth` (with `qr`),
`connected`, `fullsync`, `closed` (with optional `error`).

```jsonc
// Chat
{ "id": "15551234567@s.whatsapp.net", "name": "Alice", "isArchived": false,
  "isGroup": false, "lastMessageTimestamp": "2026-07-25T10:00:00Z" }

// Message
{ "id": "3EB0…", "fromMe": false, "fromName": "Alice", "content": "hi",
  "messageTimestamp": "2026-07-25T10:00:00Z" }
```

## Environment variables

| Variable | Default | Purpose |
|---|---|---|
| `NODE_ENV` | `development` (dev) | Selects the logger format: colourised/timestamped in development, JSON in production. |
| `LOG_LEVEL` | `debug` (dev) / `info` (prod) | `debug` \| `info` \| `warn` \| `error`. |
| `PORT` | `8400` | Port the REST API listens on. |
| `WHATSAPP_DATA_DIR` | `./data` (container: `/data`) | Base directory for per-user wacli stores (the SQLite files). |
| `WACLI_BIN` | `wacli` | Path to the wacli binary. |
| `WACLI_DEVICE_PLATFORM` | `desktop` | Device platform WhatsApp shows for the linked device. |
| `WACLI_DEVICE_LABEL` | `Gutschi.site` (dev: `Gutschi.site (DEV)`) | Device label WhatsApp shows for the linked device. |
| `WHATSAPP_CMD_TIMEOUT_MS` | `30000` | Timeout for short-lived wacli commands. |
| `WHATSAPP_CHATS_LIMIT` | `1000` | Max chats returned by `GET /chats`. |
| `WHATSAPP_MESSAGES_LIMIT` | `5000` | Max messages returned by `GET /messages`. |
| `WACLI_SYNC_MAX_MESSAGES` | unset | Cap on total messages stored locally (forwarded to wacli). |
| `WACLI_SYNC_MAX_DB_SIZE` | unset | Cap on the SQLite mirror size (forwarded to wacli). |

## Persistence

All state lives in the SQLite files under `WHATSAPP_DATA_DIR`, which the Docker
Compose stack mounts as a named volume. The volume is intentionally **not**
included in the Postgres backup job — a WhatsApp session can always be re-paired,
and the message mirror can be re-synced, so this state is treated as disposable.

## Build and run

```bash
# Build the container (context is the repo root, like the assistant image)
docker build -t whatsapp-bridge:latest -f whatsapp-bridge/Dockerfile .

# Run locally (no Docker): needs the wacli binary on PATH
pnpm --filter @homeserver/whatsapp-bridge build
WACLI_BIN=/usr/local/bin/wacli node whatsapp-bridge/dist/companion/server.js
```

## Develop

```bash
cd whatsapp-bridge
pnpm test            # Vitest (mapping, store-id)
pnpm lint            # ESLint (--fix)
pnpm build           # tsc → dist/
pnpm dev             # tsx watch companion/server.ts
```

`pnpm dev:bridge` at the repo root runs the same watch process via
`pnpm --filter @homeserver/whatsapp-bridge dev`.
