'use server'
import { getAuthenticatedUserSession } from '@/app/shared/auth/auth'
import { ActionResponse, toResponse } from '@/app/shared/_helper/ActionResponse'
import { config } from '@/app/shared/config'
import { cookies } from 'next/headers'
import type { Chat, Message, SyncStatus } from '@/assistant/whatsapp/types'

export async function loadData(): Promise<{ chats: Chat[], status: SyncStatus }> {
  await getAuthenticatedUserSession('startpage')
  const [chats, status] = await Promise.all([
    assistantGet('/whatsapp/chats') as Promise<Chat[]>,
    assistantGet('/whatsapp/status') as Promise<SyncStatus>,
  ])
  return { chats, status }
}

export async function loadMessages(chatId: string): Promise<Message[]> {
  await getAuthenticatedUserSession('startpage')
  return assistantGet(`/whatsapp/messages?chatId=${encodeURIComponent(chatId)}`) as Promise<Message[]>
}

export async function getStatus(): ActionResponse<SyncStatus> {
  return toResponse(assistantGet('/whatsapp/status') as Promise<SyncStatus>)
}

export async function archiveChat(chatJid: string, archived: boolean): ActionResponse<void> {
  return toResponse(assistantPost('/whatsapp/archive-chat', { chatId: chatJid, archived }).then(() => undefined))
}

export async function sendChatMessage(chatJid: string, text: string): ActionResponse<void> {
  return toResponse(assistantPost('/whatsapp/send-message', { chatId: chatJid, text }).then(() => undefined))
}

export async function fullSync(): ActionResponse<void> {
  return toResponse(assistantPost('/whatsapp/full-sync', {}).then(() => undefined))
}

async function assistantGet(path: string): Promise<unknown> {
  const response = await fetch(`${config.ASSISTANT_INTERNAL_URL}${path}`, {
    headers: { Cookie: await getCookieHeader() },
  })
  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Assistant API error ${response.status.toString()}: ${text}`)
  }
  return response.json()
}

async function assistantPost(path: string, body: Record<string, unknown>): Promise<unknown> {
  const response = await fetch(`${config.ASSISTANT_INTERNAL_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': await getCookieHeader() },
    body: JSON.stringify(body),
  })
  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Assistant API error ${response.status.toString()}: ${text}`)
  }
  return response.json()
}

async function getCookieHeader(): Promise<string> {
  const cookieStore = await cookies()
  return cookieStore.toString()
}
