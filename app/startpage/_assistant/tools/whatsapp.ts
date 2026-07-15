import { tool, ToolSet } from 'ai'
import { z } from 'zod/v4'
import { UserSession } from '@/app/shared/auth/auth'
import { getWAFasade } from '../../_external/whatsapp'
import { transactional } from '@/app/shared/_external/db/access'
import { logEvent } from '@/app/shared/_data/Event'
import { logger } from '@/app/shared/logger'

export default function getTools(user: UserSession): ToolSet {
  const listWhatsappChats = tool({
    description: 'List all unarchived WhatsApp chats',
    inputSchema: z.object({}),
    outputSchema: z.array(chatSchema),
    execute: async () => {
      const wa = await getWAFasade(user)
      const chats = wa.getChats().filter(c => !c.archived)
      return chats.map(c => ({ jid: c.jid, name: c.name, unreadCount: c.unreadCount, lastMessageTimestamp: toUtcTimeString(c.lastMessageTimestamp), isGroup: c.isGroup, archived: c.archived }))
    },
  })

  const listAllWhatsappChats = tool({
    description: 'List all WhatsApp chats including archived ones',
    inputSchema: z.object({}),
    outputSchema: z.array(chatSchema),
    execute: async () => {
      const wa = await getWAFasade(user)
      if (wa.getStatus().type !== 'ready') throw new Error(`WhatsApp is not ready. Current status: ${wa.getStatus().type}`)
      const chats = wa.getChats()
      return chats.map(c => ({ jid: c.jid, name: c.name, unreadCount: c.unreadCount, lastMessageTimestamp: toUtcTimeString(c.lastMessageTimestamp), isGroup: c.isGroup, archived: c.archived }))
    },
  })

  const getWhatsappMessages = tool({
    description: 'Get messages for a specific WhatsApp chat by its ID (jid)',
    inputSchema: z.object({
      chatId: z.string().describe('The chat ID (jid) to get messages for'),
    }),
    outputSchema: z.array(messageSchema),
    execute: async ({ chatId }) => {
      const wa = await getWAFasade(user)
      if (wa.getStatus().type !== 'ready') throw new Error(`WhatsApp is not ready. Current status: ${wa.getStatus().type}`)
      const messages = wa.getMessagesForChat(chatId)
      return messages.map(m => ({ id: m.id, from: m.from, message: m.message, messageTimestamp: toUtcTimeString(m.messageTimestamp) }))
    },
  })

  const sendWhatsappMessage = tool({
    description: 'Send a WhatsApp message to a chat',
    inputSchema: z.object({
      chatId: z.string().describe('The chat ID (jid) to send the message to'),
      message: z.string().describe('The text message to send'),
    }),
    execute: async ({ chatId, message }) => transactional(async (tx) => {
      try {
        const wa = await getWAFasade(user)
        await wa.sendMessage(chatId, message)
        await logEvent(tx, 'INFO', `Sent WhatsApp message to chat ${chatId}`)
        return 'Message sent successfully'
      }
      catch (error) {
        logger.warn(`Failed to send WhatsApp message to chat ${chatId}`, error)
        await logEvent(tx, 'ERROR', `Failed to send WhatsApp message to chat ${chatId}: ${message}`)
        throw error
      }
    }),
  })

  const archiveWhatsappChat = tool({
    description: 'Archive a WhatsApp chat',
    inputSchema: z.object({
      chatId: z.string().describe('The chat ID (jid) to archive'),
    }),
    execute: async ({ chatId }) => transactional(async (tx) => {
      try {
        const wa = await getWAFasade(user)
        await wa.setArchived(chatId, true)
        await logEvent(tx, 'INFO', `Archived WhatsApp chat ${chatId}`)
        return 'Chat archived successfully'
      }
      catch (error) {
        logger.warn(`Failed to archive WhatsApp chat ${chatId}`, error)
        await logEvent(tx, 'ERROR', `Failed to archive WhatsApp chat ${chatId}`)
        throw error
      }
    }),
  })

  const setWhatsappChatReadStatus = tool({
    description: 'Mark a WhatsApp chat as read or unread',
    inputSchema: z.object({
      chatId: z.string().describe('The chat ID (jid) to update'),
      read: z.boolean().describe('True to mark as read, false to mark as unread'),
    }),
    execute: async ({ chatId, read }) => transactional(async (tx) => {
      try {
        const wa = await getWAFasade(user)
        await wa.setRead(chatId, read)
        await logEvent(tx, 'INFO', `Set WhatsApp chat ${chatId} read status to ${read.toString()}`)
        return read ? 'Chat marked as read' : 'Chat marked as unread'
      }
      catch (error) {
        logger.warn(`Failed to set WhatsApp chat ${chatId} read status to ${read.toString()}`, error)
        await logEvent(tx, 'ERROR', `Failed to set WhatsApp chat ${chatId} read status to ${read.toString()}`)
        throw error
      }
    }),
  })

  return {
    list_whatsapp_chats: listWhatsappChats,
    list_all_whatsapp_chats: listAllWhatsappChats,
    get_whatsapp_messages: getWhatsappMessages,
    send_whatsapp_message: sendWhatsappMessage,
    archive_whatsapp_chat: archiveWhatsappChat,
    set_whatsapp_chat_read_status: setWhatsappChatReadStatus,
  }
}

function toUtcTimeString(unixTimestampSeconds: number | null | undefined): string {
  if (unixTimestampSeconds == null) return ''
  return new Date(unixTimestampSeconds * 1000).toISOString()
}

const chatSchema = z.object({
  jid: z.string().describe('The chat ID'),
  name: z.string().describe('The chat display name'),
  unreadCount: z.number().describe('Number of unread messages'),
  lastMessageTimestamp: z.string().describe('UTC time string of the last message (ISO 8601)'),
  isGroup: z.boolean().describe('Whether this is a group chat'),
  archived: z.boolean().describe('Whether the chat is archived'),
})

const messageSchema = z.object({
  id: z.string().describe('The message ID'),
  from: z.object({ jid: z.string(), name: z.string(), phone: z.string().optional() }).optional().describe('The sender of the message'),
  message: z.string().describe('The message text content'),
  messageTimestamp: z.string().describe('UTC time string of the message (ISO 8601)'),
})
