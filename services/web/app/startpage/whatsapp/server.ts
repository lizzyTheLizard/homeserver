'use server'
import { getAuthenticatedUserSession } from '@/app/shared/auth/auth'
import { ActionResponse, toResponse } from '@/app/shared/_helper/ActionResponse'
import { config } from '@/app/shared/config'
import { logger } from '@/app/shared/logger'
import { cookies } from 'next/headers'
import type { Chat, Message, SyncStatus } from '@assistant/whatsapp/types'

export async function loadData(): Promise<{ chats: Chat[], status: SyncStatus, error?: string }> {
  await getAuthenticatedUserSession('startpage')
  let status: SyncStatus
  try {
    status = await assistantGet('/whatsapp/start') as SyncStatus
  }
  catch (error: unknown) {
    return { chats: [], status: { type: 'closed' }, error: errorMessage(error) }
  }
  if (status.type !== 'connected') return { chats: [], status }
  try {
    return { chats: await assistantGet('/whatsapp/chats') as Chat[], status }
  }
  catch (error: unknown) {
    return { chats: [], status, error: errorMessage(error) }
  }
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

export async function disconnectAccount(): ActionResponse<void> {
  return toResponse(assistantPost('/whatsapp/disconnect', {}).then(() => undefined))
}

async function assistantGet(path: string): Promise<unknown> {
  return assistantFetch(path, { headers: { Cookie: await getCookieHeader() } })
}

async function assistantPost(path: string, body: Record<string, unknown>): Promise<unknown> {
  return assistantFetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': await getCookieHeader() },
    body: JSON.stringify(body),
  })
}

// Logs the target URL whenever an assistant call fails, so a refused
// connection (ECONNREFUSED) is distinguishable from an assistant error.
async function assistantFetch(path: string, init: RequestInit): Promise<unknown> {
  const url = `${config.ASSISTANT_INTERNAL_URL}${path}`
  let response: Response
  try {
    response = await fetch(url, init)
  }
  catch (error: unknown) {
    logger.warn(`Could not reach the assistant at ${url}: ${describeError(error)}`)
    throw error
  }
  if (!response.ok) {
    const text = await response.text()
    logger.warn(`Assistant API error ${response.status.toString()} from ${url}: ${text}`)
    throw new Error(`Assistant API error ${response.status.toString()}: ${text}`)
  }
  return response.json()
}

async function getCookieHeader(): Promise<string> {
  const cookieStore = await cookies()
  return cookieStore.toString()
}

// Node reports a fetch connection failure as "fetch failed" and puts the
// useful part (e.g. ECONNREFUSED) into `cause`.
function describeError(error: unknown): string {
  if (!(error instanceof Error)) return String(error)
  const cause = error.cause
  return cause instanceof Error ? `${error.message}: ${cause.message}` : error.message
}

function errorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)
  const match = /^Assistant API error \d+: ([\s\S]*)$/.exec(message)
  if (!match) return message
  try {
    const body = JSON.parse(match[1]) as { error?: unknown }
    if (typeof body.error === 'string' && body.error.length > 0) return body.error
  }
  catch {
    // The assistant did not answer with a JSON error body, keep the raw message.
  }
  return message
}
