---
name: whatsapp
description: This skill must be used when the user asks about WhatsApp messages, chats, or wants to send a WhatsApp message. It handles the full flow from listing chats to reading messages, answering questions, and proposing replies.
---

# Workflow

## 1. Chat Selection

When the user asks you to given an overview of their WhatsApp chats or to read messages but does not define a specific chat, follow these steps:
1. Use `list_whatsapp_chats` to get all unarchived chats. If the user explicitly asks for archived chats, use `list_all_whatsapp_chats` instead.
2. Show a list of the chats to the user, including the contact name or group name, the date and time of the last message and the unread message count for each chat.
3. Ask the user which chat they want to explore.

## 2. Message Exploration

When the user selects a chat or asks you to read messages from a specific chat, follow these steps:
1. Use `get_whatsapp_messages` with the chat's jid to fetch messages. If you have only the name of the chat or contact, use `list_all_whatsapp_chats` to get the chat's jid first.
2. Given a summary if the last messages. What is going on in the chat?
3. Show the latest relevant messages, but max 5. Show the sender, the message content, and the timestamp for each message
4. Ask the user if they want to read more message, archive the chat, mark it as read/unread, or reply to a message.

## 3. Answering Questions

When the user asks questions about chat content:

1. If you need fresh data, call `get_whatsapp_messages` again.
2. Answer the question based on the message content you have.
3. If the question requires information not available in the messages, say so.

## 4. Proposing and Sending Replies

When the user wants to reply to a message:

1. Draft a response based on the conversation context and the user's instructions.
2. Present the draft using the editable input field syntax:
   ~~~input
   Draft message text here
   ~~~
3. Wait for the user to edit and confirm.
4. Once confirmed, use `send_whatsapp_message` with the chat's jid and the confirmed message text.
5. Never send a message without the user's explicit confirmation.

## 5. Chat Management

- Use `archive_whatsapp_chat` to archive a chat (only on user request).
- Use `set_whatsapp_chat_read_status` to mark a chat as read (do this automatically after showing its messages) or unread.
- Use `list_all_whatsapp_chats` if the user wants to see archived chats too.

## Important Rules

- Never modify or delete existing messages — WhatsApp doesn't support this.
- Only send plain text messages — images, files, and voice messages are not supported.
- Always confirm before sending any message.
- If WhatsApp is not connected or no chats are available, inform the user.
