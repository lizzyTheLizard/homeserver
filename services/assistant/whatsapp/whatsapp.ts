import type { Chat, Message, SyncStatus } from './types'
import { config } from '../config'
import { z } from 'zod'

export type { Chat, Message, SyncStatus }

export async function ensureWhatsappStarted(userId: string): Promise<void> {
  const url = `${bridgeUrl(userId)}/start`
  const response = await fetch(url, { method: 'POST', signal: AbortSignal.timeout(10_000) })
  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Failed to start WhatsApp: ${response.status.toString()} ${text}`)
  }
}

export async function startWhatsapp(userId: string): Promise<SyncStatus> {
  const url = `${bridgeUrl(userId)}/start`
  const response = await fetch(url, {
    method: 'POST',
    signal: AbortSignal.timeout(10_000),
  })
  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Failed to start WhatsApp: ${response.status.toString()} ${text}`)
  }
  return syncStatusSchema.parse(await response.json())
}

export async function getWhatsappStatus(userId: string): Promise<SyncStatus> {
  const url = `${bridgeUrl(userId)}/status`
  const response = await fetch(url, { method: 'GET', signal: AbortSignal.timeout(10_000) })
  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Failed to get WhatsApp status: ${response.status.toString()} ${text}`)
  }
  return syncStatusSchema.parse(await response.json())
}

export async function getWhatsappChats(userId: string): Promise<Chat[]> {
  const url = `${bridgeUrl(userId)}/chats`
  const response = await fetch(url, { method: 'GET', signal: AbortSignal.timeout(30_000) })
  if (!response.ok) throw new Error(`Failed to fetch chats: ${response.status.toString()} ${await response.text()}`)

  return z.array(chatSchema).parse(await response.json())
}

export async function getWhatsappMessages(userId: string, chatId: string): Promise<Message[]> {
  const url = new URL(`${bridgeUrl(userId)}/messages`)
  url.searchParams.set('chatId', chatId)
  const response = await fetch(url.toString(), { method: 'GET', signal: AbortSignal.timeout(30_000) })
  if (!response.ok) throw new Error(`Failed to fetch messages: ${response.status.toString()} ${await response.text()}`)

  return z.array(messageSchema).parse(await response.json())
}

export async function sendWhatsappMessage(userId: string, chatId: string, message: string): Promise<void> {
  const url = `${bridgeUrl(userId)}/send-message`
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ to: chatId, text: message }),
    signal: AbortSignal.timeout(30_000),
  })
  if (!response.ok) throw new Error(`Failed to send message: ${response.status.toString()} ${await response.text()}`)
}

export async function archiveWhatsappChat(userId: string, chatId: string, archived: boolean): Promise<void> {
  const url = `${bridgeUrl(userId)}/archive-chat`
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: chatId, archived }),
    signal: AbortSignal.timeout(30_000),
  })
  if (!response.ok) throw new Error(`Failed to archive chat: ${response.status.toString()} ${await response.text()}`)
}

export async function triggerWhatsappFullSync(userId: string): Promise<void> {
  const url = `${bridgeUrl(userId)}/full-sync`
  const response = await fetch(url, {
    method: 'POST',
    signal: AbortSignal.timeout(10_000),
  })
  if (!response.ok && response.status !== 202) throw new Error(`Failed to trigger full sync: ${response.status.toString()} ${await response.text()}`)
}

export async function disconnectWhatsapp(userId: string): Promise<void> {
  const url = `${bridgeUrl(userId)}/disconnect`
  const response = await fetch(url, {
    method: 'POST',
    signal: AbortSignal.timeout(30_000),
  })
  if (!response.ok && response.status !== 204) throw new Error(`Failed to disconnect: ${response.status.toString()} ${await response.text()}`)
}

function bridgeUrl(userId: string): string {
  return `${config.WHATSAPP_BRIDGE_URL}/sessions/${encodeURIComponent(userId)}`
}

const syncStatusSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('needAuth'), qr: z.string() }),
  z.object({ type: z.literal('connected') }),
  z.object({ type: z.literal('fullsync') }),
  z.object({ type: z.literal('closed') }),
]) satisfies z.ZodType<SyncStatus>

const messageSchema = z.object({
  id: z.string(),
  fromMe: z.boolean(),
  fromName: z.string(),
  content: z.string(),
  messageTimestamp: z.string(),
}) satisfies z.ZodType<Message>

const chatSchema = z.object({
  id: z.string(),
  name: z.string(),
  isArchived: z.boolean(),
  isGroup: z.boolean(),
  lastMessageTimestamp: z.string(),
}) satisfies z.ZodType<Chat>
