---
name: whatsapp
description: This skill must be used when the user asks about WhatsApp messages, chats, or wants to send a WhatsApp message. It handles the full flow from listing chats to reading messages, answering questions, and proposing replies.
---



# Chat Overview

When the user asks you to given an overview of their WhatsApp chats or to read messages but does not define a specific chat, follow these steps:
1. Use `list_whatsapp_chats` to get all unarchived chats if you do not have them already. If the user explicitly asks for archived chats, use `list_all_whatsapp_chats` instead.
2. Show a list of the chats to the user, including the contact name or group name, the date and time of the last message and the unread message count for each chat. Do NOT use a table, instead use a simple list format.
3. Ask the user which chat they want to explore.

Use this template:
```
Here's your WhatsApp overview 📱
* {chatName} – {unreadCount} unread – last message on {lastMessageDate} {lastMessageTime}

Which chat would you like to dive into?
```

# Message Exploration

When the user selects a chat or asks you to read messages from a specific chat, follow these steps:
1. Use `get_whatsapp_messages` with the chat's jid to fetch messages. Do NOT mark the messages as read automatically. If you have only the name of the chat or contact, use `list_all_whatsapp_chats` to get the chat's jid first.
2. Given a summary if the last messages. Consider only the messages from the last 7 days. Do not summarize the chat itself, do not tell me what kind of chat this is. Just summarize the last messages. Do not use bullet points or tables, just a single paragraph with 2-5 sentences. If there are no messages in the last 7 days, inform the user that there are no recent messages.
3. Try to figure out if there are some tasks for me. If there are make a list of those. If you do not find any tasks, say so.
3. Ask the user if they want to archive the chat, reply to it or go back to the chat overview.

# Proposing and Sending Replies

When the user wants to reply to a chat, follow these steps:

1. Draft a response based on the conversation context and the user's instructions.
2. Present the draft using the editable input field syntax:
   ~~~input
   Draft message text here
   ~~~
3. Wait for the user to edit and confirm.
4. Once confirmed, use `send_whatsapp_message` with the chat's jid and the confirmed message text.
5. Never send a message without the user's explicit confirmation.

## Important Rules

- Never modify or delete existing messages — WhatsApp doesn't support this.
- Only send plain text messages — images, files, and voice messages are not supported.
- Always confirm before sending any message.
- If WhatsApp is not connected or no chats are available, inform the user.
