# Design

## Context

The WhatsApp skill is a single markdown file (`assistant/skills/whatsapp/SKILL.md`) loaded verbatim into the model as the `load_skill_whatsapp` tool (see `assistant/tools/skills-tools.ts`). Because it is injected as instructions, everything in it is a *suggestion* to the model — nothing in the skill can stop `send_whatsapp_message` (`assistant/tools/whatsapp-tools.ts`) from sending, since that tool has no gate and is always available. `get_whatsapp_messages` returns the bridge's full message history for a jid with no ordering or cap; `filterRecentMessages` (last 1 day, else last 7 days) is applied only inside the overview tool. The model provider stays Groq (`openai/gpt-oss-20b`) for this iteration. See proposal.md for motivation.

## Goals / Non-Goals

**Goals:**

- Make the draft → confirm → send flow explicit and ordered in the skill, and return chat messages in chronological order so drafting reads them in the right order.
- Lock the new skill instructions with a content test so regressions in the prompt are caught.

**Non-Goals:**

- A code-level send-approval gate (deferred to a later change; this iteration improves the skill only).
- Changing the model provider (Groq stays; the DeepSeek revert is deferred).
- Any change to the WhatsApp bridge (`whatsapp-bridge/`) or wacli.
- Web-dashboard UI changes.
- Reading or honouring WhatsApp phone-side settings (e.g. "Keep chats archived").
- Changing email/calendar/todo skills, which use the same soft pattern.
- Rewriting the global `assistant/system.md` (it stays as-is; language mirroring is handled in the skill).

## Decisions

### Skill-first rewrite of the drafting flow

The SKILL.md "Drafting And Sending Responses" section is rewritten into an ordered, explicit sequence: (1) load recent messages via `get_whatsapp_messages` first; (2) draft grounded in those messages, mirroring the chat's language and asking rather than guessing when the language is undeterminable; (3) present the draft in an editable input block; (4) wait; (5) only on explicit approval of the unchanged draft, call `send_whatsapp_message` with that exact text. An "Important Rules" addition makes the no-invention and no-send-without-approval rules explicit.

This is the issue's "decided" first step: improve the skill before reaching for a code-level gate. The send-approval behaviour therefore remains a skill-level guarantee in this iteration — sufficient for the acceptance criteria's behaviour, with a code gate available as a later hardening step if the improved skill still allows unsolicited sends.

### Return messages in chronological order

`get_whatsapp_messages` (the tool) is changed to sort results by `messageTimestamp` (chronological) so the skill's "load messages first" step reads them in the order they happened, instead of an unordered full history. No age window is applied here — the full history is preserved, only ordered. The bridge itself is untouched.

## Risks / Trade-offs

- **Send approval is still only a prompt instruction** → Without a code gate, the "never send without approval" guarantee relies on the model following the rewritten skill. This is the deliberate, issue-aligned first step; a code-level gate is the fallback if this proves insufficient.
- **Language detection depends on the model** → "Ask rather than guess when undeterminable" is an instruction; the model may still guess. Acceptable for a skill-level improvement.

## Migration Plan

- Additive and deployable per-container: rebuild the `assistant` image (`homeserver-assistant`). No database or volume migration.
- Rollback: redeploy the previous `assistant` image; the skill text and message window revert together.
