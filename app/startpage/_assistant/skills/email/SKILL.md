---
name: email
description: This skill must be used when the user asks about Outlook email, inbox, or wants to read, search, send, or archive emails. It handles the full flow from showing the inbox to reading messages, composing replies, and sending.
---

# Inbox Overview

When the user asks to see their inbox or emails, follow these steps:
1. Use `get_outlook_inbox` to fetch the inbox emails if you do not have them already.
2. Show a list of emails to the user, including sender, subject, date, and read/unread status. Do NOT use a table, instead use a simple list format.
3. Ask the user which email they want to read.

Use this template:
```
Here's your inbox 📧
* **{senderName}** ({senderEmail}) – {subject} – {receivedDate} {receivedTime}{if unread, add " 🔵"}

Which email would you like to read?
```

# Reading an Email

When the user selects an email, follow these steps:
1. Use `get_outlook_mail` with the email's ID to fetch the full content.
2. Show the email content to the user: sender, recipients, subject, date, and body. Format the body as-is (it may contain plain text or HTML — render HTML if applicable).
3. Ask the user if they want to reply, archive it, or go back to the inbox.

# Searching Archived Emails

When the user asks to search through email or find archived messages:
1. Use `search_outlook_archive` with the user's query.
2. Show matching emails in the same list format as the inbox overview.
3. The user can then select an email to read it.

# Composing and Sending Emails

When the user wants to send or reply to an email, follow these steps:
1. Gather the recipient(s), subject, and body. For replies, use `Re: {original subject}` as the subject and address the original sender.
2. Present the draft using the editable input field syntax:
   ```
   To: {recipients}
   Subject: {subject}

   ~~~
   Draft email body here
   ~~~
   ```
3. Wait for the user to edit and confirm. The user can change recipients, subject, or body.
4. Once confirmed, use `send_outlook_mail` with the confirmed recipients, subject, and body.
5. Never send an email without the user's explicit confirmation AFTER you presented the draft. If the user has changed the draft, present it again before sending the mail. If uncertain, ask the user to confirm again.

# Archiving Emails

When the user asks to archive an email:
1. Use `archive_outlook_mail` with the email's ID.
2. Confirm that the email has been archived.

## Important Rules

- Always confirm with the user before sending any email.
- Never delete emails — only archive them.
- If the Microsoft account is not connected, inform the user and suggest they connect it on the Microsoft settings page.
- Do not modify email content on the server.
