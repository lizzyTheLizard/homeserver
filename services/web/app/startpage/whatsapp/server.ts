'use server'
import { getAuthenticatedUserSession } from '@/app/shared/auth/auth'
import type { ActionResponse } from '@/app/shared/_helper/ActionResponse'
import { toResponse } from '@/app/shared/_helper/ActionResponse'
import { logger } from '@/app/shared/logger'
import type { Chat, Message, SyncStatus } from './_external/types'
import {
  archiveWhatsappChat,
  disconnectWhatsapp,
  getWhatsappChats,
  getWhatsappMessages,
  getWhatsappStatus,
  sendWhatsappMessage,
  startWhatsapp,
} from './_external/whatsapp'

export async function loadData(): Promise<{ chats: Chat[]; status: SyncStatus; error?: string }> {
  const user = await getAuthenticatedUserSession('startpage')
  let status: SyncStatus
  try {
    status = await startWhatsapp(user.email)
  } catch (error: unknown) {
    return { chats: [], status: { type: 'closed' }, error: reportError('start WhatsApp', error) }
  }
  if (status.type !== 'connected') return { chats: [], status }
  try {
    return { chats: await getWhatsappChats(user.email), status }
  } catch (error: unknown) {
    return { chats: [], status, error: reportError('load the WhatsApp chats', error) }
  }
}

export async function loadMessages(chatId: string): Promise<Message[]> {
  const user = await getAuthenticatedUserSession('startpage')
  return withUser(email => getWhatsappMessages(email, chatId), user.email)
}

export async function getStatus(): ActionResponse<SyncStatus> {
  return toResponse(withUser(user => getWhatsappStatus(user)))
}

export async function archiveChat(chatJid: string, archived: boolean): ActionResponse<void> {
  return toResponse(withUser(user => archiveWhatsappChat(user, chatJid, archived)))
}

export async function sendChatMessage(chatJid: string, text: string): ActionResponse<void> {
  return toResponse(withUser(user => sendWhatsappMessage(user, chatJid, text)))
}

export async function disconnectAccount(): ActionResponse<void> {
  return toResponse(withUser(user => disconnectWhatsapp(user)))
}

async function withUser<T>(fn: (email: string) => Promise<T>, knownEmail?: string): Promise<T> {
  const email = knownEmail ?? (await getAuthenticatedUserSession('startpage')).email
  try {
    return await fn(email)
  } catch (error: unknown) {
    reportError('call WhatsApp', error)
    throw error
  }
}

function reportError(action: string, error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)
  logger.warn(`Could not ${action}: ${message}`)
  return message
}
