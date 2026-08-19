import { tool, ToolSet } from 'ai'
import { z } from 'zod/v4'
import { UserSession } from '@/app/shared/auth/session'
import { getWhatsappChats, getWhatsappMessages, getWhatsappStatus, sendWhatsappMessage, archiveWhatsappChat } from '../whatsapp/whatsapp'
import { transactional } from '@/app/shared/_external/db/access'
import { logEvent } from '@/app/shared/_data/Event'
import { logger } from '@/app/shared/logger'

export default function getTools(user: UserSession): ToolSet {
  const getWhatsappOverview = tool({
    description: 'Get an overview of all unarchived WhatsApp chats including their latest messages',
    inputSchema: z.object({}),
    outputSchema: z.array(chatOverviewSchema),
    execute: async () => {
      const chats = (await getWhatsappChats(user.email)).filter(c => !c.isArchived)
      return Promise.all(chats
        .map(async chat => ({ chat, messages: await getWhatsappMessages(user.email, chat.id) }))
        .map(c => c.then(({ chat, messages }) => ({ chat, messages: filterRecentMessages(messages) }))),
      )
    },
  })

  const listWhatsappChats = tool({
    description: 'List all unarchived WhatsApp chats',
    inputSchema: z.object({}),
    outputSchema: z.array(chatSchema),
    execute: async () => {
      const chats = (await getWhatsappChats(user.email)).filter(c => !c.isArchived)
      return chats
    },
  })

  const listAllWhatsappChats = tool({
    description: 'List all WhatsApp chats including archived ones',
    inputSchema: z.object({}),
    outputSchema: z.array(chatSchema),
    execute: async () => {
      const status = await getWhatsappStatus(user.email)
      if (status.type !== 'connected') throw new Error(`WhatsApp is not connected. Current status: ${status.type}`)
      return getWhatsappChats(user.email)
    },
  })

  const getWhatsappMessagesTool = tool({
    description: 'Get messages for a specific WhatsApp chat by its ID (jid)',
    inputSchema: z.object({
      chatId: z.string().describe('The chat ID (jid) to get messages for'),
    }),
    outputSchema: z.array(messageSchema),
    execute: async ({ chatId }) => {
      const status = await getWhatsappStatus(user.email)
      if (status.type !== 'connected') throw new Error(`WhatsApp is not connected. Current status: ${status.type}`)
      return getWhatsappMessages(user.email, chatId)
    },
  })

  const sendWhatsappMessageTool = tool({
    description: 'Send a WhatsApp message to a chat',
    inputSchema: z.object({
      chatId: z.string().describe('The chat ID (jid) to send the message to'),
      message: z.string().describe('The text message to send'),
    }),
    execute: async ({ chatId, message }) => transactional(async (tx) => {
      try {
        await sendWhatsappMessage(user.email, chatId, message)
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

  const archiveWhatsappChatTool = tool({
    description: 'Archive a WhatsApp chat',
    inputSchema: z.object({
      chatId: z.string().describe('The chat ID (jid) to archive'),
    }),
    execute: async ({ chatId }) => transactional(async (tx) => {
      try {
        await archiveWhatsappChat(user.email, chatId, true)
        await logEvent(tx, 'INFO', `Archived WhatsApp chat ${chatId} and marked as read`)
        return 'Chat archived successfully'
      }
      catch (error) {
        logger.warn(`Failed to archive WhatsApp chat ${chatId}`, error)
        await logEvent(tx, 'ERROR', `Failed to archive WhatsApp chat ${chatId}`)
        throw error
      }
    }),
  })

  return {
    get_whatsapp_overview: getWhatsappOverview,
    list_whatsapp_chats: listWhatsappChats,
    list_all_whatsapp_chats: listAllWhatsappChats,
    get_whatsapp_messages: getWhatsappMessagesTool,
    send_whatsapp_message: sendWhatsappMessageTool,
    archive_whatsapp_chat: archiveWhatsappChatTool,
  }
}

function filterRecentMessages(messages: { messageTimestamp: string }[]): { messageTimestamp: string }[] {
  const messagesLastDay = messages.filter(m => isInLastDays(m, 1))
  if (messagesLastDay.length > 0) return messagesLastDay
  return messages.filter(m => isInLastDays(m, 7))
}

function isInLastDays(message: { messageTimestamp: string }, n: number): boolean {
  const messageDate = new Date(message.messageTimestamp)
  const now = new Date()
  const nDaysAgo = new Date(now.getTime() - n * 24 * 60 * 60 * 1000)
  return messageDate >= nDaysAgo
}

const chatSchema = z.object({
  id: z.string().describe('The chat ID'),
  name: z.string().describe('The chat display name'),
  isArchived: z.boolean().describe('Whether the chat is archived'),
  isGroup: z.boolean().describe('Whether this is a group chat'),
  lastMessageTimestamp: z.string().describe('ISO datetime string of the last message'),
})

const messageSchema = z.object({
  id: z.string().describe('The message ID'),
  fromMe: z.boolean().describe('Whether the message was sent by the current user'),
  fromName: z.string().describe('The sender display name'),
  content: z.string().describe('The message text content'),
  messageTimestamp: z.string().describe('UTC time string of the message (ISO 8601)'),
})

const chatOverviewSchema = z.object({
  chat: chatSchema.describe('The chat details'),
  messages: z.array(messageSchema).describe('Most recent messages in this chat. Only use them for an overview, load messages using get_whatsapp_messages otherwise'),
})
