'use server'
import { getAuthenticatedUserSession } from '@/app/common/auth/auth'
import { nontransactional } from '@/app/shared/_external/db/access'
import { ActionResponse, toResponse } from '@/app/shared/_helper/ActionResponse'
import { Chat, Contact, findChatsByOwner, findContactsByOwner, findMessagesByChatId, Message } from '@/app/startpage/_data/Chat'
import { getRunningSyncData, RunningSyncStatus } from '../_external/whatsapp/syncManager'

export async function loadChats(): Promise<[Chat[], Contact[]]> {
  const user = await getAuthenticatedUserSession('startpage')
  return nontransactional(async (c) => {
    return [
      (await findChatsByOwner(c, user.email)).filter(chat => chat.unread_count !== undefined && chat.archived !== undefined),
      await findContactsByOwner(c, user.email),
    ]
  })
}

export async function loadMessages(chatId: string): Promise<Message[]> {
  const user = await getAuthenticatedUserSession('startpage')
  return nontransactional(async (c) => {
    return findMessagesByChatId(c, user.email, chatId)
  })
}

export async function getUpdates(): ActionResponse<RunningSyncStatus> {
  return toResponse(nontransactional(async () => {
    const user = await getAuthenticatedUserSession('startpage')
    return getRunningSyncData(user)
  }))
}
