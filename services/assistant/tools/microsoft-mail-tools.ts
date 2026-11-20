import type { ToolSet } from 'ai';
import { tool } from 'ai'
import { z } from 'zod/v4'
import type { UserSession } from '../session'
import { getMicrosoftMailWorker } from '../microsoft/mail'

export default function getTools(user: UserSession): ToolSet {
  const getOutlookInbox = tool({
    description: 'Get emails from the Outlook inbox.',
    execute: async () => {
      const worker = await getMicrosoftMailWorker(user)
      if (worker.getStatus() !== 'connected') {throw new Error('Outlook is not connected yet. Please try again in a moment.')}
      const messages = worker.getInboxMessages()
      return messages.map(m => ({
        bodyPreview: m.bodyPreview, from: m.from, id: m.id, isRead: m.isRead, receivedDateTime: m.receivedDateTime.toString(), subject: m.subject, toRecipients: m.toRecipients,
      }))
    },
    inputSchema: z.object({}),
    outputSchema: z.array(emailListItemSchema),
  }),

   getOutlookMail = tool({
    description: 'Get the full content of a specific email by its ID, including the complete body.',
    execute: async ({ mailId }) => {
      const worker = await getMicrosoftMailWorker(user)
      if (worker.getStatus() !== 'connected') {throw new Error('Outlook is not connected yet. Please try again in a moment.')}
      const message = await worker.getMessage(mailId)
      if (!message) {throw new Error(`Email with ID ${mailId} not found`)}
      return {
        body: message.body, bodyPreview: message.bodyPreview, from: message.from, id: message.id, isRead: message.isRead, receivedDateTime: message.receivedDateTime.toString(), subject: message.subject, toRecipients: message.toRecipients,
      }
    },
    inputSchema: z.object({
      mailId: z.string().describe('The ID of the email to fetch'),
    }),
    outputSchema: emailFullSchema,
  }),

   sendOutlookMail = tool({
    description: 'Send a new email through Outlook.',
    execute: async ({ to, subject, body }) => {
      const worker = await getMicrosoftMailWorker(user)
      if (worker.getStatus() !== 'connected') {throw new Error('Outlook is not connected yet. Please try again in a moment.')}
      await worker.sendMail(user, to, subject, body)
      return `Email sent successfully to ${to.join(', ')}`
    },
    inputSchema: z.object({
      body: z.string().describe('The plain text email body'),
      subject: z.string().describe('The email subject'),
      to: z.array(z.string()).describe('List of email addresses of the recipients'),
    }),
  }),

   archiveOutlookMail = tool({
    description: 'Archive an email by moving it to the Archive folder.',
    execute: async ({ mailId }) => {
      const worker = await getMicrosoftMailWorker(user)
      if (worker.getStatus() !== 'connected') {throw new Error('Outlook is not connected yet. Please try again in a moment.')}
      await worker.archiveMessage(user, mailId)
      return 'Email archived successfully'
    },
    inputSchema: z.object({
      mailId: z.string().describe('The ID of the email to archive'),
    }),
  }),

   getOutlookMailsFromSender = tool({
    description: 'Get all inbox emails from a specific sender email address.',
    execute: async ({ senderEmail }) => {
      const worker = await getMicrosoftMailWorker(user)
      if (worker.getStatus() !== 'connected') {throw new Error('Outlook is not connected yet. Please try again in a moment.')}
      const messages = worker.getInboxMessages(),
       filtered = messages.filter(m => m.from.emailAddress.address === senderEmail)
      return filtered.map(m => ({
        bodyPreview: m.bodyPreview, from: m.from, id: m.id, isRead: m.isRead, receivedDateTime: m.receivedDateTime.toString(), subject: m.subject, toRecipients: m.toRecipients,
      }))
    },
    inputSchema: z.object({
      senderEmail: z.string().describe('The email address of the sender to filter by'),
    }),
    outputSchema: z.array(emailListItemSchema),
  }),

   archiveOutlookMailsFromSender = tool({
    description: 'Archive all inbox emails from a specific sender email address.',
    execute: async ({ senderEmail }) => {
      const worker = await getMicrosoftMailWorker(user)
      if (worker.getStatus() !== 'connected') {throw new Error('Outlook is not connected yet. Please try again in a moment.')}
      const count = await worker.archiveMessagesFromSender(user, senderEmail)
      return count === 0
        ? `No emails from ${senderEmail} found in inbox`
        : `Successfully archived ${count.toString()} email(s) from ${senderEmail}`
    },
    inputSchema: z.object({
      senderEmail: z.string().describe('The email address of the sender to archive all emails from'),
    }),
  })

  return {
    archive_outlook_mail: archiveOutlookMail,
    archive_outlook_mails_from_sender: archiveOutlookMailsFromSender,
    get_outlook_inbox: getOutlookInbox,
    get_outlook_mail: getOutlookMail,
    get_outlook_mails_from_sender: getOutlookMailsFromSender,
    send_outlook_mail: sendOutlookMail,
  }
}

const emailListItemSchema = z.object({
  bodyPreview: z.string().describe('A preview of the email body'),
  from: z.object({ emailAddress: z.object({ address: z.string(), name: z.string().optional() }) }).describe('The sender'),
  id: z.string().describe('The email ID'),
  isRead: z.boolean().describe('Whether the email has been read'),
  receivedDateTime: z.string().describe('When the email was received'),
  subject: z.string().describe('The email subject'),
  toRecipients: z.array(z.object({ emailAddress: z.object({ address: z.string(), name: z.string().optional() }) })).describe('The recipients'),
}),

 emailFullSchema = emailListItemSchema.extend({
  body: z.object({ content: z.string(), contentType: z.string() }).describe('The full email body'),
})
