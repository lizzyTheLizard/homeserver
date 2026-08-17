# WhatsApp Bridge

Multi-user WhatsApp bridge that exposes a REST API for the Homeserver Next.js app. It connects to WhatsApp via [whatsmeow](https://github.com/tulir/whatsmeow), stores messages in Postgres, and manages one background session per user.

## Architecture

The code is split into four layers:

1. **Entry point** — `main.go`
2. **HTTP server** — `server.go`
3. **Session manager** — `session.go`
4. **User-device persistence** — `users.go`
5. **WhatsApp handlers** — `handlers/`

```text
main.go
   │
   ▼
server.go  ◄────── HTTP requests from Next.js
   │
   │ creates / reuses
   ▼
session.go ◄────── one per user, owns the whatsmeow client
   │
   │ calls
   ▼
handlers/  ◄────── event handlers, commands, DB queries
```

### Layer details

#### `main.go`

The entry point. It reads environment variables (`PORT`, `DB_CONNECTION_STRING`, `DEV`), opens the Postgres pool, ensures the custom `whatsmeow_` tables exist (`schema.go`), upgrades the whatsmeow device store, creates the `Server`, registers routes, and starts the HTTP server with graceful shutdown on `SIGINT`.

#### `server.go`

The HTTP layer. `Server` holds the session map and routes incoming requests to the right `Session`. It makes sure a session exists before forwarding a request.

Handlers registered:

- `GET /health`
- `POST /sessions/{userId}/start`
- `GET /sessions/{userId}/status`
- `POST /sessions/{userId}/stop`
- `POST /sessions/{userId}/send-message`
- `POST /sessions/{userId}/archive-chat`
- `POST /sessions/{userId}/mark-chat-read`
- `POST /sessions/{userId}/full-sync`
- `GET /sessions/{userId}/chats`
- `GET /sessions/{userId}/messages`

#### `session.go`

Manages one user's WhatsApp connection. Responsibilities:

- Connect the whatsmeow socket.
- Wait for QR pairing or reuse an existing device.
- Route user commands (`SendMessageRequest`, `ArchiveChatRequest`, `MarkChatReadRequest`, `FullSyncRequest`, `GetChatsRequest`, `GetMessagesRequest`) to the handler implementations.
- Dispatch incoming WhatsApp events (`HandleMessageEvent`, `HandleGroupInfoEvent`, `HandleJoinedGroupEvent`, `HandleHistorySyncMessagesEvent`, `HandleHistorySyncGroupsEvent`, `HandleArchiveEvent`, `HandleAppStateSyncCompleteEvent`, etc.) to the handler implementations.
- Persist the user→device mapping (`users.go`) and clean it up on logout.

#### `handlers/`

All WhatsApp-specific processing lives here. This package has no knowledge of HTTP or session lifecycle; it only operates on a `*whatsmeow.Client`, `*sql.DB`, and the data types it owns.

| File | Responsibility |
|------|----------------|
| `chats.go` | Chat domain: chat event handlers (`HandleArchiveEvent`, `HandleAppStateSyncCompleteEvent`) and chat request handlers (`ArchiveChatRequest`, `MarkChatReadRequest`, `GetChatsRequest`). |
| `fullsync.go` | Background full-sync request handler (`FullSyncRequest`) and progress reporting. |
| `groups.go` | Group event handlers (`HandleGroupInfoEvent`, `HandleJoinedGroupEvent`, `HandleHistorySyncGroupsEvent`) and group sync. |
| `messages.go` | Message domain: message event handlers (`HandleMessageEvent`, `HandleHistorySyncMessagesEvent`), message request handlers (`SendMessageRequest`, `GetMessagesRequest`), and LID resolution after incoming messages. |

### Naming convention

Functions in `handlers/` are suffixed by their source:

- `*Event` — handles an incoming event from the WhatsApp socket (e.g. `HandleMessageEvent`).
- `*Request` — handles an incoming request from the HTTP server / session (e.g. `SendMessageRequest`).

## Environment variables

- `DB_CONNECTION_STRING` — Postgres connection string (required).
- `DEV` — `"true"` or `"false"`; selects the device name shown in WhatsApp's linked devices list.
- `PORT` — HTTP listen port (default `8080`).

## Build and test

```bash
go build ./...
go vet ./...
go test ./...
```
