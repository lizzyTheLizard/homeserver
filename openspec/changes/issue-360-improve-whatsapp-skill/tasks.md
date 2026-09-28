# Tasks

## 1. Make recent messages well-defined

- [x] 1.1 Filter `get_whatsapp_messages` to a recent window (last day, else last week, else last 30 days) and order it chronologically in `assistant/tools/whatsapp-tools.ts`; add `assistant/tools/whatsapp-tools.tests.ts` covering ordering and the three-tier window; verify `pnpm --filter @homeserver/assistant test` passes
- [x] 1.2 Bump the assistant model to `openai/gpt-oss-120b` in `assistant/groq.ts`; verify `pnpm --filter @homeserver/assistant build` passes

## 2. Rewrite the WhatsApp skill

- [x] 2.1 Rewrite `assistant/skills/whatsapp/SKILL.md` "Drafting And Sending Responses" and "Important Rules" so the flow loads recent messages first, grounds the draft in them, mirrors the chat's language (asking rather than guessing when undeterminable), presents the draft in an input block, and sends only after explicit approval of the unchanged draft via `send_whatsapp_message`; verify `pnpm --filter @homeserver/assistant build` copies the file and the content reflects those steps
- [x] 2.2 Add a test asserting the WhatsApp SKILL.md content carries the required instructions (recent-messages-first, language mirroring + ask-when-unknown, present-before-send, send-only-on-approval, no-invented-content); verify `pnpm --filter @homeserver/assistant test` passes
- [x] 2.3 Add the no-greeting/no-farewell-by-default rule to `assistant/skills/whatsapp/SKILL.md` and to the `assistant/whatsapp-skill` spec delta; verify `pnpm --filter @homeserver/assistant build` copies the file and `openspec validate "issue-360-improve-whatsapp-skill"` passes

## 3. Integration check

- [x] 3.1 Run `pnpm --filter @homeserver/assistant build`, `pnpm --filter @homeserver/assistant test`, and `pnpm --filter @homeserver/assistant lint:ci` together and confirm the whole package is green
