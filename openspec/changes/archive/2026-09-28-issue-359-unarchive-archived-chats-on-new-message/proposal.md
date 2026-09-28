## Why

Archived WhatsApp chats that receive a new message stay archived in the bridge mirror, so the user misses replies in chats they had previously archived. WhatsApp itself unarchives these chats by default, and the user has WhatsApp configured that way — but wacli (v0.17.1) has no setting to replicate this, and the bridge companion has no hook to react to an incoming message at all.

## What Changes

- The companion passes `--webhook`, `--webhook-allow-private`, and `--webhook-secret` to the per-user `sync --follow --events` process, pointing at a new local companion endpoint so wacli delivers live message JSON on every stored message.
- A new companion HTTP endpoint receives those webhook deliveries, verifying the HMAC signature.
- On a delivered message with `FromMe: false`, the companion checks whether the chat is archived and, if so, unarchives it via the existing archive/unarchive path (briefly pausing sync, then resuming lazily) — for both one-to-one and group chats.
- Messages the user sent themselves (`FromMe: true`) do not trigger unarchiving; an archived chat that receives no message stays archived.

## Capabilities

### New Capabilities

- `whatsapp-bridge`: the WhatsApp bridge unarchives an archived chat when a new incoming message (`fromMe: false`) arrives in it, delivered through wacli's `sync --webhook` live-message feed, so the chat resurfaces in the assistant's unarchived-chats overview.

### Modified Capabilities

<!-- No existing capabilities: openspec/specs is empty; nothing to modify. -->

## Impact

- `whatsapp-bridge/companion/` — new webhook endpoint and route, `Supervisor` passes webhook flags to the sync process, new unarchive-on-incoming-message logic, HMAC verification, config additions.
- `whatsapp-bridge/README.md` — document the webhook behaviour and any new environment variables.
- No changes to the assistant or web app: they already filter on `isArchived`, so unarchiving at the bridge is sufficient to surface the chat.
- Out of scope (from the issue): unarchiving after the user sends a message, honouring WhatsApp's "Keep chats archived" phone setting, and any UI changes.
