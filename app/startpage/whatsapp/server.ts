'use server'
import { getAuthenticatedUserSession } from '@/app/shared/auth/auth'
import { nontransactional, transactional } from '@/app/shared/_external/db/access'
import { ActionResponse, toResponse } from '@/app/shared/_helper/ActionResponse'
import { logEvent } from '@/app/shared/_data/Event'
import { Chat, Message, SyncStatus, getWhatsappChats, getWhatsappMessages, getWhatsappStatus, sendWhatsappMessage, archiveWhatsappChat, triggerWhatsappFullSync } from '../_external/whatsapp'
import { logger } from '@/app/shared/logger'

export async function loadData(): Promise<{ chats: Chat[], status: SyncStatus }> {
  const user = await getAuthenticatedUserSession('startpage')
  const [chats, status] = await Promise.all([getWhatsappChats(user.email), getWhatsappStatus(user.email)])
  logger.debug(`Loaded ${chats.length.toString()} chats and status ${status.type} for user ${user.email}`)
  return { chats, status }
}

export async function loadMessages(chatId: string): Promise<Message[]> {
  const user = await getAuthenticatedUserSession('startpage')
  return getWhatsappMessages(user.email, chatId)
}

export async function getStatus(): ActionResponse<SyncStatus> {
  return toResponse(nontransactional(async () => {
    const user = await getAuthenticatedUserSession('startpage')
    return getWhatsappStatus(user.email)
  }))
}

export async function archiveChat(chatJid: string, archived: boolean): ActionResponse<void> {
  return toResponse(transactional(async (client) => {
    const user = await getAuthenticatedUserSession('startpage')
    await archiveWhatsappChat(user.email, chatJid, archived)
    await logEvent(client, 'INFO', `${archived ? 'Archived' : 'Unarchived'} WhatsApp chat ${chatJid}`)
  }))
}

export async function sendChatMessage(chatJid: string, text: string): ActionResponse<void> {
  return toResponse(transactional(async (client) => {
    const user = await getAuthenticatedUserSession('startpage')
    await sendWhatsappMessage(user.email, chatJid, text)
    await logEvent(client, 'INFO', `Sent WhatsApp message to chat ${chatJid}`)
  }))
}

export async function fullSync(): ActionResponse<void> {
  return toResponse(transactional(async (client) => {
    const user = await getAuthenticatedUserSession('startpage')
    await triggerWhatsappFullSync(user.email)
    await logEvent(client, 'INFO', 'Triggered WhatsApp full sync')
  }))
}
