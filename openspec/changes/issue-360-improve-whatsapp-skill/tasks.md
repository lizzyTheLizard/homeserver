# Tasks

## 1. Make recent messages well-defined

- [x] 1.1 Order `get_whatsapp_messages` results by `messageTimestamp` (chronological) in `assistant/tools/whatsapp-tools.ts`, and add `assistant/tools/whatsapp-tools.tests.ts` covering the ordering; verify `pnpm --filter @homeserver/assistant test` passes

## 2. Rewrite the WhatsApp skill

- [x] 2.1 Rewrite `assistant/skills/whatsapp/SKILL.md` "Drafting And Sending Responses" and "Important Rules" so the flow loads recent messages first, grounds the draft in them, mirrors the chat's language (asking rather than guessing when undeterminable), presents the draft in an input block, and sends only after explicit approval of the unchanged draft via `send_whatsapp_message`; verify `pnpm --filter @homeserver/assistant build` copies the file and the content reflects those steps
- [ ] 2.2 Add a test asserting the WhatsApp SKILL.md content carries the required instructions (recent-messages-first, language mirroring + ask-when-unknown, present-before-send, send-only-on-approval, no-invented-content); verify `pnpm --filter @homeserver/assistant test` passes

## 3. Integration check

- [ ] 3.1 Run `pnpm --filter @homeserver/assistant build`, `pnpm --filter @homeserver/assistant test`, and `pnpm --filter @homeserver/assistant lint:ci` together and confirm the whole package is green
