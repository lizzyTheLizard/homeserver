import { tool, ToolSet } from 'ai'
import { z } from 'zod/v4'
import { UserSession } from '@/app/shared/auth/session'
import { getMicrosoftMailWorker } from '../../_external/microsoft-mail'

export default function getTools(user: UserSession): ToolSet {
  const getOutlookInbox = tool({
    description: 'Get emails from the Outlook inbox.',
    inputSchema: z.object({}),
    outputSchema: z.array(emailListItemSchema),
    execute: async () => {
      const worker = await getMicrosoftMailWorker(user)
      if (worker.getStatus() !== 'connected') throw new Error('Outlook is not connected yet. Please try again in a moment.')
      const messages = worker.getInboxMessages()
      return messages.map(m => ({
        id: m.id, subject: m.subject, from: m.from, toRecipients: m.toRecipients,
        receivedDateTime: m.receivedDateTime.toString(), isRead: m.isRead, bodyPreview: m.bodyPreview,
      }))
    },
  })

  const getOutlookMail = tool({
    description: 'Get the full content of a specific email by its ID, including the complete body.',
    inputSchema: z.object({
      mailId: z.string().describe('The ID of the email to fetch'),
    }),
    outputSchema: emailFullSchema,
    execute: async ({ mailId }) => {
      const worker = await getMicrosoftMailWorker(user)
      if (worker.getStatus() !== 'connected') throw new Error('Outlook is not connected yet. Please try again in a moment.')
      const message = await worker.getMessage(mailId)
      if (!message) throw new Error(`Email with ID ${mailId} not found`)
      return {
        id: message.id, subject: message.subject, from: message.from, toRecipients: message.toRecipients,
        receivedDateTime: message.receivedDateTime.toString(), isRead: message.isRead, bodyPreview: message.bodyPreview, body: message.body,
      }
    },
  })

  const sendOutlookMail = tool({
    description: 'Send a new email through Outlook.',
    inputSchema: z.object({
      to: z.array(z.string()).describe('List of email addresses of the recipients'),
      subject: z.string().describe('The email subject'),
      body: z.string().describe('The plain text email body'),
    }),
    execute: async ({ to, subject, body }) => {
      const worker = await getMicrosoftMailWorker(user)
      if (worker.getStatus() !== 'connected') throw new Error('Outlook is not connected yet. Please try again in a moment.')
      await worker.sendMail(user, to, subject, body)
      return `Email sent successfully to ${to.join(', ')}`
    },
  })

  const archiveOutlookMail = tool({
    description: 'Archive an email by moving it to the Archive folder.',
    inputSchema: z.object({
      mailId: z.string().describe('The ID of the email to archive'),
    }),
    execute: async ({ mailId }) => {
      const worker = await getMicrosoftMailWorker(user)
      if (worker.getStatus() !== 'connected') throw new Error('Outlook is not connected yet. Please try again in a moment.')
      await worker.archiveMessage(user, mailId)
      return 'Email archived successfully'
    },
  })

  const getOutlookMailsFromSender = tool({
    description: 'Get all inbox emails from a specific sender email address.',
    inputSchema: z.object({
      senderEmail: z.string().describe('The email address of the sender to filter by'),
    }),
    outputSchema: z.array(emailListItemSchema),
    execute: async ({ senderEmail }) => {
      const worker = await getMicrosoftMailWorker(user)
      if (worker.getStatus() !== 'connected') throw new Error('Outlook is not connected yet. Please try again in a moment.')
      const messages = worker.getInboxMessages()
      const filtered = messages.filter(m => m.from.emailAddress.address === senderEmail)
      return filtered.map(m => ({
        id: m.id, subject: m.subject, from: m.from, toRecipients: m.toRecipients,
        receivedDateTime: m.receivedDateTime.toString(), isRead: m.isRead, bodyPreview: m.bodyPreview,
      }))
    },
  })

  const archiveOutlookMailsFromSender = tool({
    description: 'Archive all inbox emails from a specific sender email address.',
    inputSchema: z.object({
      senderEmail: z.string().describe('The email address of the sender to archive all emails from'),
    }),
    execute: async ({ senderEmail }) => {
      const worker = await getMicrosoftMailWorker(user)
      if (worker.getStatus() !== 'connected') throw new Error('Outlook is not connected yet. Please try again in a moment.')
      const count = await worker.archiveMessagesFromSender(user, senderEmail)
      return count === 0
        ? `No emails from ${senderEmail} found in inbox`
        : `Successfully archived ${count.toString()} email(s) from ${senderEmail}`
    },
  })

  return {
    get_outlook_inbox: getOutlookInbox,
    get_outlook_mail: getOutlookMail,
    send_outlook_mail: sendOutlookMail,
    archive_outlook_mail: archiveOutlookMail,
    get_outlook_mails_from_sender: getOutlookMailsFromSender,
    archive_outlook_mails_from_sender: archiveOutlookMailsFromSender,
  }
}

const emailListItemSchema = z.object({
  id: z.string().describe('The email ID'),
  subject: z.string().describe('The email subject'),
  from: z.object({ emailAddress: z.object({ address: z.string(), name: z.string().optional() }) }).describe('The sender'),
  toRecipients: z.array(z.object({ emailAddress: z.object({ address: z.string(), name: z.string().optional() }) })).describe('The recipients'),
  receivedDateTime: z.string().describe('When the email was received'),
  isRead: z.boolean().describe('Whether the email has been read'),
  bodyPreview: z.string().describe('A preview of the email body'),
})

const emailFullSchema = emailListItemSchema.extend({
  body: z.object({ contentType: z.string(), content: z.string() }).describe('The full email body'),
})
