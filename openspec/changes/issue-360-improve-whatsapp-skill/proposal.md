# Proposal

## Why

The WhatsApp assistant drafts generic, off-topic, or wrong-language replies, and can send a message the user never approved, because the skill's "read messages → draft → confirm → send" flow is only softly suggested in `assistant/skills/whatsapp/SKILL.md`. The user wants to be able to trust the assistant with real WhatsApp conversations.

## What Changes

- Rewrite the WhatsApp skill's drafting flow in `assistant/skills/whatsapp/SKILL.md` so it is explicit and ordered: load the chat's recent messages first, ground the draft in them (answer open questions, reference concrete points), mirror the chat's language (ask rather than guess when the language is undeterminable), present a draft, and send only after the user approves the final, unchanged draft.
- Make "recent messages" well-defined: `get_whatsapp_messages` returns messages ordered chronologically instead of an unordered history.
- Add tests that lock the skill instructions and the recent-message window so regressions are caught.

## Capabilities

### New Capabilities

- `assistant/whatsapp-skill`: the assistant's WhatsApp reply-drafting and send behaviour — drafts grounded in the chat's recent messages, written in the chat's language (asking when unknown), presented for approval, and never sent without explicit approval of the final, unchanged draft.

### Modified Capabilities

<!-- No existing capabilities: there is no assistant/skills spec under openspec/specs today. -->

## Impact

- `assistant/skills/whatsapp/SKILL.md` — rewritten drafting/sending instructions.
- `assistant/tools/whatsapp-tools.ts` — chronological ordering in `get_whatsapp_messages`.
- `assistant/tools/whatsapp-tools.tests.ts` (new) — unit tests for the ordering.
- `assistant/tools/skills.tests.ts` — extended to assert the WhatsApp SKILL.md content carries the required instructions.
- No changes to the WhatsApp bridge (`whatsapp-bridge/`) or wacli; no web-dashboard UI changes; no changes to email/calendar/todo skills; no model/provider change (Groq stays for this iteration).
