import { tool } from 'ai'
import { z } from 'zod/v4'
import { getAuthenticatedUserSession } from '@/app/shared/auth/auth'
import { getWAFasade } from './whatsapp'
import { Chat } from '@lizzythelizard/whatsapp-mcp'

const chatSchema = z.object({
  jid: z.string().describe('The chat ID'),
  name: z.string().describe('The chat display name'),
  unreadCount: z.number().describe('Number of unread messages'),
  lastMessageTimestamp: z.number().describe('Unix timestamp of the last message'),
  isGroup: z.boolean().describe('Whether this is a group chat'),
  archived: z.boolean().describe('Whether the chat is archived'),
})

const messageSchema = z.object({
  id: z.string().describe('The message ID'),
  from: z.object({ jid: z.string(), name: z.string(), phone: z.string().optional() }).optional().describe('The sender of the message'),
  message: z.string().describe('The message text content'),
  messageTimestamp: z.number().describe('Unix timestamp of the message'),
})

export const listWhatsappChatsTool = tool({
  description: 'List all unarchived WhatsApp chats',
  inputSchema: z.object({}),
  outputSchema: z.array(chatSchema),
  execute: async () => {
    const user = await getAuthenticatedUserSession('startpage')
    const wa = await getWAFasade(user)
    const chats = wa.getChats().filter(c => !c.archived)
    return chats.map(c => ({ jid: c.jid, name: c.name, unreadCount: c.unreadCount, lastMessageTimestamp: c.lastMessageTimestamp, isGroup: c.isGroup }))
  },
})

export const listAllWhatsappChatsTool = tool({
  description: 'List all WhatsApp chats including archived ones',
  inputSchema: z.object({}),
  outputSchema: z.array(chatSchema),
  execute: async () => {
    const user = await getAuthenticatedUserSession('startpage')
    const wa = await getWAFasade(user)
    const chats = wa.getChats()
    return chats.map(c => ({ jid: c.jid, name: c.name, unreadCount: c.unreadCount, lastMessageTimestamp: c.lastMessageTimestamp, isGroup: c.isGroup, archived: c.archived }))
  },
})

export const getWhatsappMessagesTool = tool({
  description: 'Get messages for a specific WhatsApp chat by its ID (jid)',
  inputSchema: z.object({
    chatId: z.string().describe('The chat ID (jid) to get messages for'),
  }),
  outputSchema: z.array(messageSchema),
  execute: async ({ chatId }) => {
    const user = await getAuthenticatedUserSession('startpage')
    const wa = await getWAFasade(user)
    const messages = wa.getMessagesForChat(chatId)
    return messages.map(m => ({ id: m.id, from: m.from, message: m.message, messageTimestamp: m.messageTimestamp }))
  },
})

export const sendWhatsappMessageTool = tool({
  description: 'Send a WhatsApp message to a chat',
  inputSchema: z.object({
    chatId: z.string().describe('The chat ID (jid) to send the message to'),
    message: z.string().describe('The text message to send'),
  }),
  execute: async ({ chatId, message }) => {
    const user = await getAuthenticatedUserSession('startpage')
    const wa = await getWAFasade(user)
    await wa.sendMessage(chatId, message)
    return 'Message sent successfully'
  },
})

export const archiveWhatsappChatTool = tool({
  description: 'Archive a WhatsApp chat',
  inputSchema: z.object({
    chatId: z.string().describe('The chat ID (jid) to archive'),
  }),
  execute: async ({ chatId }) => {
    const user = await getAuthenticatedUserSession('startpage')
    const wa = await getWAFasade(user)
    await wa.setArchived(chatId, true)
    return 'Chat archived successfully'
  },
})

export const setWhatsappChatReadStatusTool = tool({
  description: 'Mark a WhatsApp chat as read or unread',
  inputSchema: z.object({
    chatId: z.string().describe('The chat ID (jid) to update'),
    read: z.boolean().describe('True to mark as read, false to mark as unread'),
  }),
  execute: async ({ chatId, read }) => {
    const user = await getAuthenticatedUserSession('startpage')
    const wa = await getWAFasade(user)
    await wa.setRead(chatId, read)
    return read ? 'Chat marked as read' : 'Chat marked as unread'
  },
})

export async function getUnarchivedWhatsAppChats(): Promise<Chat[]> {
  const user = await getAuthenticatedUserSession('startpage')
  const wa = await getWAFasade(user)
  return wa.getChats()
    .filter(c => !c.archived)
    .sort((a, b) => b.lastMessageTimestamp - a.lastMessageTimestamp)
}
