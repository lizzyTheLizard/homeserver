'use server'
import { getAuthenticatedUserSession } from '@/app/shared/auth/auth'
import { nontransactional } from '@/app/shared/_external/db/access'
import { ActionResponse, toResponse } from '@/app/shared/_helper/ActionResponse'
import { getHandler, getStore } from '../_external/whatsapp'
import { Chat, Message, SyncStatus } from '@lizzythelizard/whatsapp-mcp'
import { logger } from '@/app/shared/logger'

export async function loadData(): Promise<{ chats: Chat[], status: SyncStatus }> {
  const user = await getAuthenticatedUserSession('startpage')
  const store = await getStore(user)
  const handler = await getHandler(user)
  const chats = store.getChats()
  const status = handler.getStatus()
  logger.info(`Loaded ${chats.length.toString()} chats and status ${status.type} for user ${user.email}`)
  return { chats, status }
}

export async function loadMessages(chatId: string): Promise<Message[]> {
  const user = await getAuthenticatedUserSession('startpage')
  const store = await getStore(user)
  return store.getMessagesForChat(chatId)
}

export async function getStatus(): ActionResponse<SyncStatus> {
  return toResponse(nontransactional(async () => {
    const user = await getAuthenticatedUserSession('startpage')
    const handler = await getHandler(user)
    const status = handler.getStatus()
    return status
  }))
}
