# Design

## Context

The companion (`whatsapp-bridge/companion/`) drives one `wacli` process per user. While paired it runs `wacli sync --follow --events`, which holds the store lock and mirrors messages into `wacli.db`. The companion reacts only to lifecycle events (`WacliEvent` in `wacli.ts`); there is no message event, so it cannot act when a message arrives. Archive/unarchive are not delegated to the running sync process (per wacli docs), so `Supervisor.archiveChat()` pauses sync (`stop()`), runs `wacli chats unarchive --chat <jid>`, and lets sync resume lazily on the next command. See proposal.md for motivation.

## Goals / Non-Goals

**Goals:**

- Deliver live incoming-message notifications from wacli to the companion with minimal new surface area.
- Unarchive an archived chat on a new incoming (`fromMe: false`) message, reusing the existing pause/unarchive path.
- Keep the change additive and safe to roll back (no data migration, no schema change).

**Non-Goals:**

- Unarchiving after the user sends a message (`fromMe: true`).
- Reading or honouring WhatsApp's "Keep chats archived" phone setting.
- Any change to the assistant or web app (they already filter on `isArchived`).

## Decisions

### Use wacli `sync --webhook` for live-message delivery

wacli 0.17.1 already POSTs every successfully stored live message as JSON to a `--webhook` URL on a bounded background worker. This is the purpose-built integration surface and avoids adding a SQLite reader or an upstream change.

Alternatives considered:

- **Read-only SQLite polling** of the `messages` table with a `rowid` cursor (wacli's "speaker-tracking pattern"): reliable and self-contained, but adds a polling loop and a SQLite read dependency to the companion.
- **Upstream wacli option** (`--unarchive-on-message`): cleanest behaviour, but requires an upstream contribution and a new release before this repo benefits.

Chosen: webhook, because it reuses a shipped, documented feature with no new runtime dependency.

### New companion endpoint `POST /sessions/:userId/webhook`

`Supervisor.start()` builds the sync args as `sync --follow --events --webhook http://127.0.0.1:<PORT>/sessions/<userId>/webhook --webhook-allow-private --webhook-secret <secret>`. The userId is already known to the supervisor, so the URL routes delivery back to the right user. `--webhook-allow-private` is required because the URL resolves to loopback. `--webhook-events` is left at its default (`message`), so only message payloads arrive.

The route reads the raw body (`express.raw`) to verify the `X-Wacli-Signature` HMAC (SHA-256, shared secret) before parsing, then delegates to `Supervisor.handleMessageWebhook(body)`.

### Per-supervisor HMAC secret

Each supervisor generates a random secret (Node `crypto.randomBytes`) once and passes it both to the spawned sync process and to its own signature check. No new environment variable is required, and each user's webhook is isolated. HMAC is defence-in-depth: the endpoint is bound inside the container and only the assistant reaches the bridge over the Docker network, but verification keeps any unexpected caller out.

### Unarchive only archived chats, only on `fromMe: false`

On a message webhook the supervisor:

1. Ignores the message if `FromMe` is truthy.
2. Reads the chat's archive flag with a lock-free `wacli chats show --jid <Chat> --json`.
3. If the chat is not archived, does nothing.
4. If archived, calls the existing `archiveChat(chatId, false)`, which pauses sync, unarchives, and resumes lazily.

Checking the flag first avoids pausing sync on every incoming message; only genuinely-archived chats incur the brief pause. Group and one-to-one chats need no special-casing (the payload's `Chat` JID is the chat key for both).

### Coalescing concurrent triggers

The check-then-unarchive sequence is not atomic across concurrent webhooks, so two messages to the same archived chat could both pass the check. A per-supervisor in-flight set of chat JIDs (added before unarchiving, removed after) makes the second delivery a no-op, so sync is paused at most once per chat burst. This is benign rather than correctness-critical, since unarchiving is idempotent.

## Risks / Trade-offs

- **[Unarchive briefly pauses sync]** → Only archived chats trigger it, and the in-flight guard coalesces bursts, so the live-mirror pause is short and rare. Sync resumes on the next command (`ensureStarted`).
- **[Webhook delivery is best-effort]** (wacli logs warnings on failure and does not retry) → A dropped delivery leaves the chat archived until the next incoming message or a manual action. Acceptable: this mirrors an eventual-consistency behaviour and does not corrupt state. The archive flag also converges via app-state when the phone unarchives.
- **[Re-entrancy]** → The webhook handler runs outside the supervisor's mutex and only calls `archiveChat`, which acquires it; `stop()`/`unarchive` are independent of the (already-completed) webhook POST, so no deadlock. wacli does not block sync on the webhook response.
- **[Endpoint exposure]** → HMAC verification plus loopback/in-container binding prevent unintended callers.

## Migration Plan

- Additive only: rebuild and deploy the `whatsapp-bridge` image. No database or volume migration; the webhook flags are re-applied on every `sync --follow` start.
- Rollback: redeploy the previous bridge image (the webhook flags and route disappear together); archive state is untouched either way.
