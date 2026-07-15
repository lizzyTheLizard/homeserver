---
name: whatsapp
description: Use this skill for WhatsApp overview, reading chats, drafting replies, sending replies after approval, and archiving chats.
---

# Chat Overview

Trigger: user asks for "Get WhatsApp Overview" or asks for a WhatsApp overview without naming a chat.

1. Call `list_whatsapp_chats` to get all unarchived chats.
2. For each returned chat, call `get_whatsapp_messages` with that chat jid.
3. For each chat, summarize only messages from within the last 24h. If there are no messages from within the last 24h, summarize messages from the last 7 days instead. If there are no messages in the last 7 days, say there are no recent messages.
4. Return a bullet list. Each bullet must be 1-2 sentences and include:
   - chat name
   - concise message summary based on the time rule above
5. Do not propose actions in the overview unless the user explicitly asks for actions.
6. If duplicate chat names ever exist, include jid in both the bullet and actions to disambiguate.

Do not mark chats as read automatically.

## Example Output
```text
Here is your WhatsApp overview:
- Family: Yesterday they coordinated dinner time and asked whether you can bring dessert.
- Alex: No messages within the last 24h; in the last week Alex asked for your feedback on the proposal draft.

```

## Chat Overview Actions
If the user asks for actions after the overview, return these actions for each unarchived chat:
   - Send a response for chat {chatName}
   - Archive Chat {chatName}
If duplicate chat names exist, include jid in action labels.
   

# Message Exploration
Trigger: user asks to inspect a specific chat or asks questions about it.

1. Resolve the chat jid:
   - If jid is already known, use it.
   - If only chat name is known, call `list_all_whatsapp_chats` and match by name.
2. Call `get_whatsapp_messages` for that jid if you do not already have the messages.
3. Summarize the messages and answer the user's direct questions about the chat.
4. Identify concrete tasks, questions, or requested follow-ups directed at the user.
5. Do not propose next actions unless the user explicitly asks for actions.

Do not mark chats as read automatically.

## Message Exploration Actions
If the user asks for actions after the exploration, return these actions:
   - Send a response for chat {chatName}
   - Archive Chat {chatName}
If duplicate chat names exist, include jid in action labels.


# Drafting And Sending Responses
Trigger: user asks to send or write a response:

1. Load recent context with `get_whatsapp_messages` for that jid if you do not already have the messages.
2. Create a draft that:
   - answers open questions and pending points from the chat
   - asks for missing information when needed
   - mirrors the language and writing style used in the chat
3. Present the draft in an editable input block:
   ~~~input
   Draft message text here
   ~~~
4. Wait for user feedback.
5. Treat clear confirmation phrases like "send now", "send", "OK", or equivalent as approval, as long as the user did not request any text changes in the same message.
6. If the user requests any change (for example: "looks good but change X to Y"), do not send yet. Propose a new improved draft and repeat until accepted without further change requests.
7. Only when the user explicitly confirms the final unchanged draft, call `send_whatsapp_message` with chat jid and final text.

Never send a message without explicit confirmation.

## Drafting And Sending Responses Actions
If the user asks for actions after drafting a response, return these actions:
   - Send Now
   - Archive Chat {chatName}


# Archiving
Trigger: user asks to archive a chat.

When user asks to archive a chat, archive directly using `archive_whatsapp_chat` once the target chat is identified.

# Important Rules

- Never modify or delete existing messages.
- Only send plain text messages.
- Do not auto-mark chats as read.
- If WhatsApp is not ready or no chats are available, inform the user clearly.
- All timestamps are in UTC ISO 8601 format (e.g. \"2023-11-14T22:13:20.000Z\").