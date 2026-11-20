import type { Chat, Message, SyncStatus } from './types'
import { config } from '../config'

export type { Chat, Message, SyncStatus }

export async function ensureWhatsappStarted(userId: string): Promise<void> {
  const url = `${bridgeUrl(userId)}/start`,
   response = await fetch(url, { method: 'POST', signal: AbortSignal.timeout(10_000) })
  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Failed to start WhatsApp: ${response.status.toString()} ${text}`)
  }
}

export async function startWhatsapp(userId: string): Promise<SyncStatus> {
  const url = `${bridgeUrl(userId)}/start`,
   response = await fetch(url, {
    method: 'POST',
    signal: AbortSignal.timeout(10_000),
  })
  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Failed to start WhatsApp: ${response.status.toString()} ${text}`)
  }
  return response.json() as Promise<SyncStatus>
}

export async function getWhatsappStatus(userId: string): Promise<SyncStatus> {
  const url = `${bridgeUrl(userId)}/status`,
   response = await fetch(url, { method: 'GET', signal: AbortSignal.timeout(10_000) })
  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Failed to get WhatsApp status: ${response.status.toString()} ${text}`)
  }
  return response.json() as Promise<SyncStatus>
}

export async function getWhatsappChats(userId: string): Promise<Chat[]> {
  const url = `${bridgeUrl(userId)}/chats`,
   response = await fetch(url, { method: 'GET', signal: AbortSignal.timeout(30_000) })
  if (!response.ok) {
    throw new Error(`Failed to fetch chats: ${response.status.toString()} ${await response.text()}`)
  }
  return response.json() as Promise<Chat[]>
}

export async function getWhatsappMessages(userId: string, chatId: string): Promise<Message[]> {
  const url = new URL(`${bridgeUrl(userId)}/messages`)
  url.searchParams.set('chatId', chatId)
  const response = await fetch(url.toString(), { method: 'GET', signal: AbortSignal.timeout(30_000) })
  if (!response.ok) {
    throw new Error(`Failed to fetch messages: ${response.status.toString()} ${await response.text()}`)
  }
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  return response.json() as Promise<Message[]>
}

export async function sendWhatsappMessage(userId: string, chatId: string, message: string): Promise<void> {
  const url = `${bridgeUrl(userId)}/send-message`,
   response = await fetch(url, {
    body: JSON.stringify({ text: message, to: chatId }),
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
    signal: AbortSignal.timeout(30_000),
  })
  if (!response.ok) {
    throw new Error(`Failed to send message: ${response.status.toString()} ${await response.text()}`)
  }
}

export async function archiveWhatsappChat(userId: string, chatId: string, archived: boolean): Promise<void> {
  const url = `${bridgeUrl(userId)}/archive-chat`,
   response = await fetch(url, {
    body: JSON.stringify({ archived, id: chatId }),
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
    signal: AbortSignal.timeout(30_000),
  })
  if (!response.ok) {
    throw new Error(`Failed to archive chat: ${response.status.toString()} ${await response.text()}`)
  }
}

export async function triggerWhatsappFullSync(userId: string): Promise<void> {
  const url = `${bridgeUrl(userId)}/full-sync`,
   response = await fetch(url, {
    method: 'POST',
    signal: AbortSignal.timeout(10_000),
  })
  if (!response.ok && response.status !== 202) {
    throw new Error(`Failed to trigger full sync: ${response.status.toString()} ${await response.text()}`)
  }
}

export async function disconnectWhatsapp(userId: string): Promise<void> {
  const url = `${bridgeUrl(userId)}/disconnect`,
   response = await fetch(url, {
    method: 'POST',
    signal: AbortSignal.timeout(30_000),
  })
  if (!response.ok && response.status !== 204) {
    throw new Error(`Failed to disconnect: ${response.status.toString()} ${await response.text()}`)
  }
}

function bridgeUrl(userId: string): string {
  return `${config.WHATSAPP_BRIDGE_URL}/sessions/${encodeURIComponent(userId)}`
}
