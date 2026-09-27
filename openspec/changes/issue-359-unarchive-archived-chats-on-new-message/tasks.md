# Tasks

## 1. Unarchive on incoming message

- [ ] 1.1 Add a mapping helper that parses a single chat's `archived` flag from `wacli chats show --json`, and cover it in `mapping.tests.ts` (verify archived true / false / missing each parse correctly)
- [ ] 1.2 Add `Supervisor.handleMessageWebhook(payload)` that ignores `fromMe` messages, reads the chat's archived flag (lock-free `wacli chats show --jid <jid> --json`), unarchives via the existing `archiveChat(jid, false)` when archived, and coalesces concurrent triggers with a per-supervisor in-flight set; cover with `supervisor.tests.ts` (fromMe skip, archived → unarchive, not-archived → no-op)

## 2. Wire the webhook end-to-end

- [ ] 2.1 Generate a per-supervisor HMAC secret and pass `--webhook http://127.0.0.1:<PORT>/sessions/<userId>/webhook`, `--webhook-allow-private`, and `--webhook-secret <secret>` to the `sync --follow --events` args in `Supervisor.start()`; update `supervisor.tests.ts` to assert the new flags
- [ ] 2.2 Add `POST /sessions/:userId/webhook` to `server.ts` that reads the raw body, verifies the `X-Wacli-Signature` HMAC, parses the JSON, and delegates to `handleMessageWebhook`; extract the HMAC check into a pure helper and unit-test it
- [ ] 2.3 Document the auto-unarchive behaviour and the internal webhook in `whatsapp-bridge/README.md`, and verify `pnpm --filter @homeserver/whatsapp-bridge build` still passes
