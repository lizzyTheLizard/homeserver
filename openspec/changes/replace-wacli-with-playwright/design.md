# Design

## Context

`services/whatsapp` is an Express companion that spawns wacli per user and reads from its SQLite mirror (see `services/whatsapp/README.md`). The REST API consumed by `services/web/app/startpage/whatsapp/_external/whatsapp.ts` (status/start/stop, chats, messages, send, archive, mark-read, full-sync, disconnect) is the only interface that must stay stable. See proposal.md for motivation.

No existing Playwright-based project fits: [greentap](https://github.com/psacc/greentap) reads and sends by chat *name*, has no archive/unarchive and no stable chat ids. We therefore write a small driver ourselves and borrow its ideas (ARIA-based, locale-independent selectors).

## Goals / Non-Goals

**Goals:**
- Chats (incl. archived and old) and messages always reflect what WhatsApp Web shows.
- Unchanged REST contract; `services/web` untouched.
- Selector logic isolated in one module so UI changes are a one-file fix.

**Non-Goals:**
- Media, reactions, voice notes, message search or history beyond what WhatsApp Web loads; only text messages as today.
- Push/webhook notifications and background mirroring.
- Migrating wacli sessions or data (re-pairing is required).

## Decisions

1. **Playwright persistent context per user, headless Chromium, in the companion process.** One `chromium.launchPersistentContext(<WHATSAPP_DATA_DIR>/<store-id>/profile)` per user, keeping the existing `store-id` (short SHA-256 of the user id). The profile keeps the WhatsApp Web login across restarts. *Alternative:* one shared browser with separate contexts — rejected, persistent profiles need one context per user data dir anyway. *Alternative:* separate browser daemon over CDP (greentap) — rejected, more moving parts.
2. **Module split.** `browser.ts` (launch/close/crash detection), `page.ts` (all WhatsApp Web selectors and DOM reading; the only module that knows the UI), `session.ts` (per-user state: status, QR, serialising queue, full-sync flag, timeouts; replaces `supervisor.ts`), `server.ts` (routes unchanged, minus webhook), `config.ts`. `wacli.ts`, `internalWebhook.ts`, `mapping.ts` and their tests are deleted.
3. **Serialise page access with the existing `async-mutex`, one mutex per user**, plus `WHATSAPP_CMD_TIMEOUT_MS` per operation. A timed-out operation reloads the page so the next request starts from a clean state.
4. **Status derivation.** Poll/observe the page: QR canvas present → `needAuth` with the QR payload (`data-ref` of the QR element, rendered to the same string the web app already renders); chat list present → `connected`; full-sync flag → `fullsync`; no context → `closed`. Browser `disconnected`/`close` events and a returning QR screen map to `closed`/`needAuth`.
5. **Chat ids.** WhatsApp Web exposes chat ids (JIDs) in the DOM of list items/message rows (`data-id` of messages carries `<fromMe>_<chatJid>_<msgId>`). The driver derives the JID from there and from a chat's `data-id`; opening a chat is done by id via the in-app deep link `https://web.whatsapp.com/send?phone=…` for contacts and by clicking the list item for groups. Message ids come from the message `data-id`. If a JID cannot be read, the chat is omitted from listings rather than returned with a made-up id. *To verify early in apply with a real session (task 1).*
6. **Chat list and archive.** The list is scrolled to the end to load all chats; the Archived section is opened to read archived chats and flag them `isArchived`. Archive/unarchive uses the chat context menu and is verified by re-reading the list. Incoming-message unarchiving is left to WhatsApp (the app unarchives by default), so the bridge needs no webhook.
7. **Messages.** Open the chat, scroll up until no new rows or `WHATSAPP_MESSAGES_LIMIT` reached, read rows (text, timestamp from `data-pre-plain-text`/`data-id`, sender). Sender name for groups from the row's author label; `Me` for own messages as before. Opening a chat marks it read in WhatsApp — acceptable and the same effect `mark-chat-read` has; `mark-chat-read` just opens the chat.
8. **Send.** Open the chat, type with `keyboard.type` (no clipboard/`fill`, as WhatsApp's handlers reject programmatic input), press Enter, verify the new outgoing row.
9. **Full sync = reload.** `full-sync` returns `202`, sets the `fullsync` status, reloads the page and rescans the list including the archive, then returns to `connected`; failures are logged and set `closed`.
10. **Disconnect.** Log out through the UI (Settings → Log out), close the context and delete the profile directory.
11. **Container.** Base the runtime stage on the Playwright image/Chromium with OS deps (the repo already pins `playwright@1.63.0` in the dev machine); run non-root; compose gets `shm_size`/`ipc` setting to avoid Chromium crashes. The volume (`whatsapp_data`) now holds browser profiles and stays un-backed-up. `WACLI_*` variables are removed; `WHATSAPP_CMD_TIMEOUT_MS`, `WHATSAPP_CHATS_LIMIT`, `WHATSAPP_MESSAGES_LIMIT` stay. Add `WHATSAPP_BROWSER_HEADLESS` (default true) for local debugging.
12. **Tests.** The pure parsing in `page.ts` is split into functions over HTML/aria fixtures (saved, anonymised WhatsApp Web DOM snippets) and unit-tested; `session.ts` is tested with a fake page driver. No test talks to the real WhatsApp.

## Risks / Trade-offs

- [WhatsApp Web DOM changes break the driver] → ARIA/role and `data-id` based selectors, all in `page.ts`, fixture tests, clear errors and logs naming the failed step.
- [Terms of service / ban risk for automation] → personal, low-volume use, human-like typing and no polling when idle; documented in the README.
- [Higher memory/CPU (Chromium per user)] → browser launched lazily on first use; closed after an idle period and reopened on demand (profile keeps the login).
- [Latency: every read drives a real UI] → serialised ops with timeouts; chat list read is cached for a few seconds within the session to absorb the web app's parallel calls.
- [Message history depth limited to what WhatsApp Web loads/scrolls] → accepted; far better than the incomplete mirror.
- [Chat JID extraction from the DOM may be unreliable] → validated first in apply (task 1); fallback is to read ids through `window.Store`-free means only; if that fails, stop and revisit this design.

## Migration Plan

1. Deploy the new image; the old `whatsapp_data` volume's wacli stores are ignored (can be deleted).
2. Each user opens the WhatsApp page once and scans the QR code again.
3. Rollback: redeploy the previous image tag (wacli stores are untouched as long as the volume is not cleaned).
