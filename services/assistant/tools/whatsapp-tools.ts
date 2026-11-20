import type { ToolSet } from 'ai';
import { tool } from 'ai'
import { z } from 'zod/v4'
import type { UserSession } from '../session'
import { archiveWhatsappChat, getWhatsappChats, getWhatsappMessages, getWhatsappStatus, sendWhatsappMessage } from '../whatsapp/whatsapp'
import { logger } from '../logger'

export default function getTools(user: UserSession): ToolSet {
  const getWhatsappOverview = tool({
    description: 'Get an overview of all unarchived WhatsApp chats including their latest messages',
    execute: async () => {
      const chats = (await getWhatsappChats(user.email)).filter(c => !c.isArchived)
      return Promise.all(chats
        .map(async chat => ({ chat, messages: await getWhatsappMessages(user.email, chat.id) }))
        .map(c => c.then(({ chat, messages }) => ({ chat, messages: filterRecentMessages(messages) }))),
      )
    },
    inputSchema: z.object({}),
    outputSchema: z.array(chatOverviewSchema),
  }),

   listWhatsappChats = tool({
    description: 'List all unarchived WhatsApp chats',
    execute: async () => {
      const chats = (await getWhatsappChats(user.email)).filter(c => !c.isArchived)
      return chats
    },
    inputSchema: z.object({}),
    outputSchema: z.array(chatSchema),
  }),

   listAllWhatsappChats = tool({
    description: 'List all WhatsApp chats including archived ones',
    execute: async () => {
      const status = await getWhatsappStatus(user.email)
      if (status.type !== 'connected') {throw new Error(`WhatsApp is not connected. Current status: ${status.type}`)}
      return getWhatsappChats(user.email)
    },
    inputSchema: z.object({}),
    outputSchema: z.array(chatSchema),
  }),

   getWhatsappMessagesTool = tool({
    description: 'Get messages for a specific WhatsApp chat by its ID (jid)',
    execute: async ({ chatId }) => {
      const status = await getWhatsappStatus(user.email)
      if (status.type !== 'connected') {throw new Error(`WhatsApp is not connected. Current status: ${status.type}`)}
      const messages = await getWhatsappMessages(user.email, chatId),
       recentMessages = filterRecentMessages(messages)
      return sortChronologically(recentMessages)
    },
    inputSchema: z.object({
      chatId: z.string().describe('The chat ID (jid) to get messages for'),
    }),
    outputSchema: z.array(messageSchema),
  }),

   sendWhatsappMessageTool = tool({
    description: 'Send a WhatsApp message to a chat',
    execute: async ({ chatId, message }) => {
      try {
        await sendWhatsappMessage(user.email, chatId, message)
        return 'Message sent successfully'
      }
      catch (error) {
        logger.warn(`Failed to send WhatsApp message to chat ${chatId}`, error)
        throw error
      }
    },
    inputSchema: z.object({
      chatId: z.string().describe('The chat ID (jid) to send the message to'),
      message: z.string().describe('The text message to send'),
    }),
  }),

   archiveWhatsappChatTool = tool({
    description: 'Archive a WhatsApp chat',
    execute: async ({ chatId }) => {
      try {
        await archiveWhatsappChat(user.email, chatId, true)
        return 'Chat archived successfully'
      }
      catch (error) {
        logger.warn(`Failed to archive WhatsApp chat ${chatId}`, error)
        throw error
      }
    },
    inputSchema: z.object({
      chatId: z.string().describe('The chat ID (jid) to archive'),
    }),
  })

  return {
    archive_whatsapp_chat: archiveWhatsappChatTool,
    get_whatsapp_messages: getWhatsappMessagesTool,
    get_whatsapp_overview: getWhatsappOverview,
    list_all_whatsapp_chats: listAllWhatsappChats,
    list_whatsapp_chats: listWhatsappChats,
    send_whatsapp_message: sendWhatsappMessageTool,
  }
}

function filterRecentMessages(messages?: { messageTimestamp: string }[]): { messageTimestamp: string }[] {
  if (!messages) {return []}
  const messagesLastDay = messages.filter(m => isInLastDays(m, 1))
  if (messagesLastDay.length > 0) {return messagesLastDay}
  const messagesLastWeek = messages.filter(m => isInLastDays(m, 7))
  if (messagesLastWeek.length > 0) {return messagesLastWeek}
  return messages.filter(m => isInLastDays(m, 30))
}

function sortChronologically<T extends { messageTimestamp: string }>(messages: T[]): T[] {
  return [...messages].sort((a, b) => new Date(a.messageTimestamp).getTime() - new Date(b.messageTimestamp).getTime())
}

function isInLastDays(message: { messageTimestamp: string }, n: number): boolean {
  const messageDate = new Date(message.messageTimestamp),
   now = new Date(),
   nDaysAgo = new Date(now.getTime() - n * 24 * 60 * 60 * 1000)
  return messageDate >= nDaysAgo
}

const chatSchema = z.object({
  id: z.string().describe('The chat ID'),
  isArchived: z.boolean().describe('Whether the chat is archived'),
  isGroup: z.boolean().describe('Whether this is a group chat'),
  lastMessageTimestamp: z.string().describe('ISO datetime string of the last message'),
  name: z.string().describe('The chat display name'),
}),

 messageSchema = z.object({
  content: z.string().describe('The message text content'),
  fromMe: z.boolean().describe('Whether the message was sent by the current user'),
  fromName: z.string().describe('The sender display name'),
  id: z.string().describe('The message ID'),
  messageTimestamp: z.string().describe('UTC time string of the message (ISO 8601)'),
}),

 chatOverviewSchema = z.object({
  chat: chatSchema.describe('The chat details'),
  messages: z.array(messageSchema).describe('Most recent messages in this chat. Only use them for an overview, load messages using get_whatsapp_messages otherwise'),
})
