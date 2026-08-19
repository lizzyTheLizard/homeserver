---
name: email
description: Use this skill for email overview, reading emails, composing and sending emails, summarizing emails from a sender, and archiving emails.
---

# Email Overview

Trigger: user asks for "Get Outlook Overview" or asks for an email overview without naming a sender.

1. Call `get_outlook_inbox` to get all inbox emails.
2. Group emails by sender (using `from.emailAddress.address`).
3. For each sender, summarize all their emails in 1-3 sentences. Include subjects and key content.
4. Return a bullet list. Each bullet must be 1-3 sentences and include:
   - sender name (and email if no display name)
   - summary of all emails from that sender: subjects, key points, and when they were received
5. Do not propose actions in the overview unless the user explicitly asks for actions.

Do not mark emails as read automatically.

## Example Output
```text
Here is your email overview:
- John Smith (john@example.com): 3 emails — "Q3 Report" (today) requests your review by Friday, "Meeting Notes" (yesterday) summarizes the client call, and "Lunch?" (2 days ago) asks about availability next week.
- Sarah Chen: 1 email — "Invoice attached" (today) includes the monthly invoice for your review.
```

## Next Actions
If asked for the next actions after the overview, return these actions:
   - Summarize emails from {senderName}
   - Archive emails from {senderName}
Return only short action commands with no explanations. Follow the output format requested by the caller.

# Composing and Sending Emails
Trigger: user asks to send an email or reply to an email.

1. Gather the recipient(s), subject, and body. For replies, use `Re: {original subject}` as the subject and address the original sender.
2. Create a draft that addresses open questions and pending points.
3. Present the draft in an editable input block:
   ```
   To: {recipients}
   Subject: {subject}
   
   ~~~
   Draft email body here
   ~~~
   ```
4. Wait for user feedback.
5. Treat clear confirmation phrases like "send now", "send", "OK", or equivalent as approval, as long as the user did not request any text changes in the same message.
6. If the user requests any change (for example: "looks good but change X to Y"), do not send yet. Propose a new improved draft and repeat until accepted without further change requests.
7. Only when the user explicitly confirms the final unchanged draft, call `send_outlook_mail` with the confirmed recipients, subject, and body.

Never send an email without explicit confirmation.

## Next Actions
If asked for the next actions after drafting an email, return these actions:
   - Send Now
   - Edit Draft
Return only short action commands with no explanations. Follow the output format requested by the caller.

# Summarize Emails from a Sender
Trigger: user asks to summarize emails from a specific sender.

1. Call `get_outlook_mails_from_sender` with the sender's email address to get all inbox emails from that sender.
2. Summarize all emails from that sender in 1-3 paragraphs. Include subjects, key points, and when they were received.
3. Do not propose next actions unless the user explicitly asks for actions.

## Next Actions
If asked for the next actions after the summary, return these actions:
   - Archive emails from {senderName}
   - Read email {subject}
Return only short action commands with no explanations. Follow the output format requested by the caller.

# Archiving Emails from a Sender
Trigger: user asks to archive emails from a specific sender.

1. First, call `get_outlook_mails_from_sender` with the sender's email address to see how many emails exist.
2. Inform the user how many emails from that sender will be archived and ask for confirmation.
3. Once confirmed, call `archive_outlook_mails_from_sender` with the sender's email address.
4. Confirm the result to the user.

# Searching Archived Emails
Trigger: user asks to search through archived emails.

1. Use `search_outlook_archive` with the user's query.
2. Show matching emails in a simple list format including sender, subject, and date.
3. The user can then select an email to read it.

# Reading an Email
Trigger: user selects an email to read.

1. Use `get_outlook_mail` with the email's ID to fetch the full content.
2. Show the email content: sender, recipients, subject, date, and body.

# Important Rules

- Always confirm with the user before sending any email.
- Always confirm with the user before archiving emails from a sender.
- Never delete emails — only archive them.
- Do not modify email content on the server.
- If the Microsoft account is not connected, inform the user and suggest they connect it on the Microsoft settings page.
