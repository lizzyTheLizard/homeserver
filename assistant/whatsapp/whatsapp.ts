import { Chat, Message, SyncStatus } from './types'
import { config } from '../config'

export type { Chat, Message, SyncStatus }

export async function ensureWhatsappStarted(userId: string): Promise<void> {
  const url = `${bridgeUrl(userId)}/start`
  const response = await fetch(url, { method: 'POST', signal: AbortSignal.timeout(10_000) })
  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Failed to start WhatsApp: ${response.status.toString()} ${text}`)
  }
}

export async function getWhatsappStatus(userId: string): Promise<SyncStatus> {
  const url = `${bridgeUrl(userId)}/status`
  const response = await fetch(url, { method: 'GET', signal: AbortSignal.timeout(10_000) })
  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Failed to get WhatsApp status: ${response.status.toString()} ${text}`)
  }
  return response.json() as Promise<SyncStatus>
}

export async function getWhatsappChats(userId: string): Promise<Chat[]> {
  const url = `${bridgeUrl(userId)}/chats`
  const response = await fetch(url, { method: 'GET', signal: AbortSignal.timeout(30_000) })
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
  return response.json() as Promise<Message[]>
}

export async function sendWhatsappMessage(userId: string, chatId: string, message: string): Promise<void> {
  const url = `${bridgeUrl(userId)}/send-message`
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ to: chatId, text: message }),
    signal: AbortSignal.timeout(30_000),
  })
  if (!response.ok) {
    throw new Error(`Failed to send message: ${response.status.toString()} ${await response.text()}`)
  }
}

export async function archiveWhatsappChat(userId: string, chatId: string, archived: boolean): Promise<void> {
  const url = `${bridgeUrl(userId)}/archive-chat`
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: chatId, archived }),
    signal: AbortSignal.timeout(30_000),
  })
  if (!response.ok) {
    throw new Error(`Failed to archive chat: ${response.status.toString()} ${await response.text()}`)
  }
}

export async function triggerWhatsappFullSync(userId: string): Promise<void> {
  const url = `${bridgeUrl(userId)}/full-sync`
  const response = await fetch(url, {
    method: 'POST',
    signal: AbortSignal.timeout(10_000),
  })
  if (!response.ok && response.status !== 202) {
    throw new Error(`Failed to trigger full sync: ${response.status.toString()} ${await response.text()}`)
  }
}

function bridgeUrl(userId: string): string {
  return `${config.WHATSAPP_BRIDGE_URL}/sessions/${encodeURIComponent(userId)}`
}
