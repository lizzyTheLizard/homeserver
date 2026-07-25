'use server'
import { getAuthenticatedUserSession } from '@/app/shared/auth/auth'
import { nontransactional, transactional } from '@/app/shared/_external/db/access'
import { ActionResponse, toResponse } from '@/app/shared/_helper/ActionResponse'
import { logEvent } from '@/app/shared/_data/Event'
import { Chat, Message, SyncStatus, getWAWorker } from '../_external/whatsapp'
import { logger } from '@/app/shared/logger'

export async function loadData(): Promise<{ chats: Chat[], status: SyncStatus }> {
  const user = await getAuthenticatedUserSession('startpage')
  const wa = await getWAWorker(user)
  const chats = await wa.getChats()
  const status = wa.getStatus()
  logger.debug(`Loaded ${chats.length.toString()} chats and status ${status.type} for user ${user.email}`)
  return { chats, status }
}

export async function loadMessages(chatId: string): Promise<Message[]> {
  const user = await getAuthenticatedUserSession('startpage')
  const wa = await getWAWorker(user)
  return wa.getMessagesForChat(chatId)
}

export async function getStatus(): ActionResponse<SyncStatus> {
  return toResponse(nontransactional(async () => {
    const user = await getAuthenticatedUserSession('startpage')
    const wa = await getWAWorker(user)
    const status = wa.getStatus()
    return status
  }))
}

export async function archiveChat(chatJid: string, archived: boolean): ActionResponse<void> {
  return toResponse(transactional(async (client) => {
    const user = await getAuthenticatedUserSession('startpage')
    const wa = await getWAWorker(user)
    await wa.setArchived(chatJid, archived)
    await logEvent(client, 'INFO', `${archived ? 'Archived' : 'Unarchived'} WhatsApp chat ${chatJid}`)
  }))
}

export async function sendChatMessage(chatJid: string, text: string): ActionResponse<void> {
  return toResponse(transactional(async (client) => {
    const user = await getAuthenticatedUserSession('startpage')
    const wa = await getWAWorker(user)
    await wa.sendMessage(chatJid, text)
    await logEvent(client, 'INFO', `Sent WhatsApp message to chat ${chatJid}`)
  }))
}

export async function fullSync(): ActionResponse<void> {
  return toResponse(transactional(async (client) => {
    const user = await getAuthenticatedUserSession('startpage')
    const wa = await getWAWorker(user)
    await wa.fullSync()
    await logEvent(client, 'INFO', 'Triggered WhatsApp full sync')
  }))
}
