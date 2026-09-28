# Design

## Context

The WhatsApp skill is a single markdown file (`assistant/skills/whatsapp/SKILL.md`) loaded verbatim into the model as the `load_skill_whatsapp` tool (see `assistant/tools/skills-tools.ts`). Because it is injected as instructions, everything in it is a *suggestion* to the model — nothing in the skill can stop `send_whatsapp_message` (`assistant/tools/whatsapp-tools.ts`) from sending, since that tool has no gate and is always available. `get_whatsapp_messages` returns the bridge's full message history for a jid with no ordering or cap. The model runs on the Groq provider. See proposal.md for motivation.

## Goals / Non-Goals

**Goals:**

- Make the draft → confirm → send flow explicit and ordered in the skill, return recent chat messages in chronological order, and omit greetings/farewells by default.
- Lock the new skill instructions with a content test so regressions in the prompt are caught.

**Non-Goals:**

- A code-level send-approval gate (deferred to a later change; this iteration improves the skill only).
- Switching the model provider away from Groq (the DeepSeek revert is deferred); the Groq model is bumped to `openai/gpt-oss-120b` within this change.
- Any change to the WhatsApp bridge (`whatsapp-bridge/`) or wacli.
- Web-dashboard UI changes.
- Reading or honouring WhatsApp phone-side settings (e.g. "Keep chats archived").
- Changing email/calendar/todo skills, which use the same soft pattern.
- Rewriting the global `assistant/system.md` (it stays as-is; language mirroring is handled in the skill).

## Decisions

### Skill-first rewrite of the drafting flow

The SKILL.md "Drafting And Sending Responses" section is rewritten into an ordered, explicit sequence: (1) load recent messages via `get_whatsapp_messages` first; (2) draft grounded in those messages, mirroring the chat's language and asking rather than guessing when the language is undeterminable, and omitting a greeting (like "Hi") or farewell (like "Liebe Grüsse" or "Goodbye") unless the chat's messages consistently use them; (3) present the draft in an editable input block; (4) wait; (5) only on explicit approval of the unchanged draft, call `send_whatsapp_message` with that exact text. An "Important Rules" addition makes the no-invention, no-greeting/farewell, and no-send-without-approval rules explicit.

This is the issue's "decided" first step: improve the skill before reaching for a code-level gate. The send-approval behaviour therefore remains a skill-level guarantee in this iteration — sufficient for the acceptance criteria's behaviour, with a code gate available as a later hardening step if the improved skill still allows unsolicited sends.

### Return recent messages in chronological order

`get_whatsapp_messages` (the tool) is changed to filter to a recent window and sort by `messageTimestamp` (chronological). The window reuses `filterRecentMessages`, extended to a three-tier fallback: last day, else last week, else last 30 days. This gives the skill's "load messages first" step actual recent context in the order it happened. The bridge itself is untouched — filtering stays in the assistant tool layer.

Trade-off: messages older than 30 days are dropped from this tool's output. That is accepted for this change; a later `limit`/`all` parameter can widen it without changing the spec.

### Bump the model to `openai/gpt-oss-120b`

The model is bumped from `openai/gpt-oss-20b` to `openai/gpt-oss-120b` for higher-quality drafting. The Groq provider, reasoning format, and temperature settings stay as-is.

## Risks / Trade-offs

- **Send approval is still only a prompt instruction** → Without a code gate, the "never send without approval" guarantee relies on the model following the rewritten skill. This is the deliberate, issue-aligned first step; a code-level gate is the fallback if this proves insufficient.
- **Recent-message cap hides older context** → Drafting is about the recent conversation; the 30-day fallback keeps up to a month of context. A later `limit`/`all` parameter can widen it without a spec change.
- **Language detection depends on the model** → "Ask rather than guess when undeterminable" is an instruction; the model may still guess. Acceptable for a skill-level improvement.

## Migration Plan

- Additive and deployable per-container: rebuild the `assistant` image (`homeserver-assistant`). No database or volume migration.
- Rollback: redeploy the previous `assistant` image; the skill text, message window, and model bump revert together.
