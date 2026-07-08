import { tool } from 'ai'
import { z } from 'zod/v4'
import { UserSession } from '@/app/shared/auth/auth'
import { getInboxMessages, getMessage, searchArchiveMessages, sendMail, archiveMessage, getUnreadInboxCount } from '../../_external/microsoft'
import { transactional } from '@/app/shared/_external/db/access'
import { logEvent } from '@/app/shared/_data/Event'
import { logger } from '@/app/shared/logger'

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

export function getOutlookTools(user: UserSession) {
  return {
    get_outlook_inbox: tool({
      description: 'Get emails from the Outlook inbox. Returns sender, subject, date, read status, and a body preview.',
      inputSchema: z.object({
        top: z.number().describe('Maximum number of emails to return (default 10)').optional(),
        skip: z.number().describe('Number of emails to skip for pagination (default 0)').optional(),
      }),
      outputSchema: z.array(emailListItemSchema),
      execute: async ({ top, skip }) => {
        const messages = await getInboxMessages(user, top ?? 10, skip ?? 0)
        return messages.map(m => ({
          id: m.id, subject: m.subject, from: m.from, toRecipients: m.toRecipients,
          receivedDateTime: m.receivedDateTime, isRead: m.isRead, bodyPreview: m.bodyPreview,
        }))
      },
    }),
    get_outlook_mail: tool({
      description: 'Get the full content of a specific email by its ID, including the complete body.',
      inputSchema: z.object({
        mailId: z.string().describe('The ID of the email to fetch'),
      }),
      outputSchema: emailFullSchema,
      execute: async ({ mailId }) => {
        const message = await getMessage(user, mailId)
        if (!message) throw new Error(`Email with ID ${mailId} not found`)
        return {
          id: message.id, subject: message.subject, from: message.from, toRecipients: message.toRecipients,
          receivedDateTime: message.receivedDateTime, isRead: message.isRead, bodyPreview: message.bodyPreview, body: message.body,
        }
      },
    }),
    search_outlook_archive: tool({
      description: 'Search archived emails by a query string. Searches sender, subject, and body content.',
      inputSchema: z.object({
        query: z.string().describe('The search query to find archived emails'),
        top: z.number().describe('Maximum number of results (default 20)').optional(),
      }),
      outputSchema: z.array(emailListItemSchema),
      execute: async ({ query, top }) => {
        const messages = await searchArchiveMessages(user, query, top ?? 20)
        return messages.map(m => ({
          id: m.id, subject: m.subject, from: m.from, toRecipients: m.toRecipients,
          receivedDateTime: m.receivedDateTime, isRead: m.isRead, bodyPreview: m.bodyPreview,
        }))
      },
    }),
    send_outlook_mail: tool({
      description: 'Send a new email through Outlook. The user must confirm before sending. Do NOT send without explicit user confirmation.',
      inputSchema: z.object({
        to: z.array(z.string()).describe('List of email addresses of the recipients'),
        subject: z.string().describe('The email subject'),
        body: z.string().describe('The plain text email body'),
      }),
      execute: async ({ to, subject, body }) => transactional(async (tx) => {
        try {
          await sendMail(user, to, subject, body)
          await logEvent(tx, 'INFO', `Sent Outlook email to ${to.join(', ')}`)
          return `Email sent successfully to ${to.join(', ')}`
        }
        catch (error) {
          logger.warn(`Failed to send Outlook email to ${to.join(', ')}`, error)
          await logEvent(tx, 'ERROR', `Failed to send Outlook email to ${to.join(', ')}`)
          throw error
        }
      }),
    }),
    archive_outlook_mail: tool({
      description: 'Archive an email by moving it to the Archive folder.',
      inputSchema: z.object({
        mailId: z.string().describe('The ID of the email to archive'),
      }),
      execute: async ({ mailId }) => transactional(async (tx) => {
        try {
          await archiveMessage(user, mailId)
          await logEvent(tx, 'INFO', `Archived Outlook email ${mailId}`)
          return 'Email archived successfully'
        }
        catch (error) {
          logger.warn(`Failed to archive Outlook email ${mailId}`, error)
          await logEvent(tx, 'ERROR', `Failed to archive Outlook email ${mailId}`)
          throw error
        }
      }),
    }),
  }
}

export async function getOutlookContext(user: UserSession): Promise<{ unreadCount: number }> {
  const unreadCount = await getUnreadInboxCount(user)
  return { unreadCount }
}
