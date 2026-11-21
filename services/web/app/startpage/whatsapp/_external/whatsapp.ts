// oxlint-disable eslint/no-underscore-dangle -- field names of the WAHA/whatsapp-web.js payloads
import { createHash } from 'node:crypto'
import type { Chat, Message, SyncStatus } from './types'
import { config } from '@/app/shared/config'
import { z } from 'zod'

export type { Chat, Message, SyncStatus }

// WhatsApp access through the WAHA REST API (WEBJS engine). One WAHA session per user,
// Named after a hash of the user's email.

const CHATS_LIMIT = 1000
const MESSAGES_LIMIT = 1000

export async function ensureWhatsappStarted(userId: string): Promise<void> {
  await startWhatsapp(userId)
}

export async function startWhatsapp(userId: string): Promise<SyncStatus> {
  const session = sessionName(userId)
  const existing = await fetchSession(session)
  if (!existing) await wahaFetch('/api/sessions', { method: 'POST', body: { name: session, start: true } }, 'start WhatsApp')
  else if (existing.status === 'STOPPED') await wahaFetch(`/api/sessions/${session}/start`, { method: 'POST' }, 'start WhatsApp')
  else if (existing.status === 'FAILED') await wahaFetch(`/api/sessions/${session}/restart`, { method: 'POST' }, 'start WhatsApp')
  return getWhatsappStatus(userId)
}

export async function getWhatsappStatus(userId: string): Promise<SyncStatus> {
  const session = sessionName(userId)
  const existing = await fetchSession(session)
  if (!existing) return { type: 'closed' }
  if (existing.status === 'SCAN_QR_CODE') return { type: 'needAuth', qr: await fetchQr(session) }
  return mapSessionStatus(existing.status)
}

export async function getWhatsappChats(userId: string): Promise<Chat[]> {
  const url = `/api/${sessionName(userId)}/chats?limit=${CHATS_LIMIT.toString()}&sortBy=conversationTimestamp&sortOrder=desc`
  const response = await wahaFetch(url, {}, 'fetch chats')
  return mapChats(await response.json())
}

export async function getWhatsappMessages(userId: string, chatId: string): Promise<Message[]> {
  const url = `/api/${sessionName(userId)}/chats/${encodeURIComponent(chatId)}/messages?limit=${MESSAGES_LIMIT.toString()}&downloadMedia=false`
  const response = await wahaFetch(url, {}, 'fetch messages')
  return mapMessages(await response.json())
}

export async function sendWhatsappMessage(userId: string, chatId: string, message: string): Promise<void> {
  await wahaFetch('/api/sendText', { method: 'POST', body: { session: sessionName(userId), chatId, text: message } }, 'send message')
}

export async function archiveWhatsappChat(userId: string, chatId: string, archived: boolean): Promise<void> {
  const action = archived ? 'archive' : 'unarchive'
  await wahaFetch(`/api/${sessionName(userId)}/chats/${encodeURIComponent(chatId)}/${action}`, { method: 'POST' }, 'archive chat')
}

export async function disconnectWhatsapp(userId: string): Promise<void> {
  const session = sessionName(userId)
  await wahaFetch(`/api/sessions/${session}/logout`, { method: 'POST', allowNotFound: true }, 'disconnect')
  await wahaFetch(`/api/sessions/${session}`, { method: 'DELETE', allowNotFound: true }, 'disconnect')
}

export function sessionName(userId: string): string {
  return `u${createHash('sha256').update(userId.toLowerCase()).digest('hex').slice(0, 16)}`
}

export function mapSessionStatus(status: string): SyncStatus {
  if (status === 'WORKING') return { type: 'connected' }
  if (status === 'STARTING') return { type: 'starting' }
  return { type: 'closed' }
}

export function mapChats(data: unknown): Chat[] {
  return z
    .array(chatSchema)
    .parse(data)
    .map(mapChat)
    .filter(chat => chat.id !== '' && chat.id !== 'status@broadcast')
    .sort((a, b) => (Date.parse(b.lastMessageTimestamp) || 0) - (Date.parse(a.lastMessageTimestamp) || 0))
}

export function mapMessages(data: unknown): Message[] {
  return z
    .array(messageSchema)
    .parse(data)
    .map(mapMessage)
    .filter(message => message.content.length > 0)
    .sort((a, b) => (Date.parse(a.messageTimestamp) || 0) - (Date.parse(b.messageTimestamp) || 0))
}

interface FetchOptions {
  method?: string
  body?: unknown
  allowNotFound?: boolean
}

async function wahaFetch(path: string, options: FetchOptions, action: string): Promise<Response> {
  const response = await fetch(`${config.WAHA_URL}${path}`, {
    method: options.method ?? 'GET',
    headers: { 'X-Api-Key': config.WAHA_API_KEY, ...(options.body === undefined ? {} : { 'Content-Type': 'application/json' }) },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    signal: AbortSignal.timeout(30_000),
  })
  if (response.ok || (options.allowNotFound === true && response.status === 404)) return response
  throw new Error(`Failed to ${action}: ${response.status.toString()} ${await response.text()}`)
}

async function fetchSession(session: string): Promise<{ status: string } | undefined> {
  const response = await fetch(`${config.WAHA_URL}/api/sessions/${session}`, {
    headers: { 'X-Api-Key': config.WAHA_API_KEY },
    signal: AbortSignal.timeout(10_000),
  })
  if (response.status === 404) return undefined
  if (!response.ok) throw new Error(`Failed to get WhatsApp status: ${response.status.toString()} ${await response.text()}`)
  return z.object({ status: z.string() }).parse(await response.json())
}

async function fetchQr(session: string): Promise<string> {
  const response = await fetch(`${config.WAHA_URL}/api/${session}/auth/qr?format=raw`, {
    headers: { 'X-Api-Key': config.WAHA_API_KEY, Accept: 'application/json' },
    signal: AbortSignal.timeout(10_000),
  })
  if (!response.ok) throw new Error(`Failed to get WhatsApp QR code: ${response.status.toString()} ${await response.text()}`)
  return z.object({ value: z.string() }).parse(await response.json()).value
}

const chatIdSchema = z.union([z.string(), z.object({ _serialized: z.string() })])

const chatSchema = z.object({
  id: chatIdSchema,
  name: z.string().nullish(),
  archived: z.boolean().nullish(),
  isGroup: z.boolean().nullish(),
  timestamp: z.number().nullish(),
  conversationTimestamp: z.number().nullish(),
  lastMessage: z.object({ timestamp: z.number().nullish() }).nullish(),
})

const messageSchema = z.object({
  id: z.union([z.string(), z.object({ _serialized: z.string() })]),
  timestamp: z.number(),
  fromMe: z.boolean(),
  from: z.string().nullish(),
  author: z.string().nullish(),
  body: z.string().nullish(),
  notifyName: z.string().nullish(),
  _data: z.object({ notifyName: z.string().nullish() }).nullish(),
})

function mapChat(chat: z.infer<typeof chatSchema>): Chat {
  const id = typeof chat.id === 'string' ? chat.id : chat.id._serialized
  const name = chat.name?.trim()
  return {
    id,
    name: name ? name : id,
    isArchived: chat.archived === true,
    isGroup: chat.isGroup ?? id.endsWith('@g.us'),
    lastMessageTimestamp: toIso(chat.conversationTimestamp ?? chat.lastMessage?.timestamp ?? chat.timestamp),
  }
}

function mapMessage(message: z.infer<typeof messageSchema>): Message {
  const sender = message.author ?? message.from ?? ''
  const name = (message.notifyName ?? message._data?.notifyName ?? '').trim()
  return {
    id: typeof message.id === 'string' ? message.id : message.id._serialized,
    fromMe: message.fromMe,
    fromName: message.fromMe ? 'Me' : name || sender.replace(/@(?:c\.us|s\.whatsapp\.net|lid)$/, ''),
    content: message.body ?? '',
    messageTimestamp: toIso(message.timestamp),
  }
}

// WAHA reports timestamps as unix seconds.
function toIso(seconds: number | null | undefined): string {
  if (typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds <= 0) return ''
  return new Date(seconds * 1000).toISOString().replace(/\.\d{3}Z$/, 'Z')
}
