import { createHmac, timingSafeEqual } from 'node:crypto'
import { isRecord } from './isRecord'
import { logger } from './logger'
import type { Supervisor } from './supervisor'

// Chats with an unarchive in flight, so concurrent webhook deliveries for the
// Same chat coalesce into a single unarchive.
const inflightUnarchive = new Set<string>()

// Handles a wacli `sync --webhook` delivery: verifies the signature, parses the
// Payload, and unarchives the chat when a new incoming message lands in an
// Archived chat.
export async function handleInternalWebhook(supervisor: Supervisor, body: unknown, signatureHeader: string | undefined): Promise<void> {
  const payload = parseWebhookPayload(supervisor.getWebhookSecret(), body, signatureHeader)
  const message = isRecord(payload) ? payload : {}
  if (message.FromMe === true || message.FromMe === 1) return
  const chatId = typeof message.Chat === 'string' ? message.Chat : ''
  if (!chatId || inflightUnarchive.has(chatId)) return
  inflightUnarchive.add(chatId)
  try {
    if (!(await supervisor.isArchived(chatId))) return
    logger.info(`[${supervisor.userId}] auto-unarchive ${chatId} on incoming message`)
    await supervisor.archiveChat(chatId, false)
  } catch (err: unknown) {
    logger.warn(`[${supervisor.userId}] could not auto-unarchive ${chatId}`, err)
  } finally {
    inflightUnarchive.delete(chatId)
  }
}

// Verifies the HMAC-SHA256 signature wacli attaches to webhook deliveries as
// `X-Wacli-Signature: sha256=<hex>` against the raw request body.
function verifyWebhookSignature(secret: string, body: string, signatureHeader: string | undefined): boolean {
  if (!signatureHeader?.startsWith('sha256=')) return false
  const provided = signatureHeader.slice('sha256='.length).toLowerCase()
  const expected = createHmac('sha256', secret).update(body).digest('hex')
  if (!/^[0-9a-f]+$/.test(provided) || provided.length !== expected.length) return false
  return timingSafeEqual(Buffer.from(provided, 'hex'), Buffer.from(expected, 'hex'))
}

// Verifies the signature and parses a raw webhook body, returning the parsed
// Payload. Throws on any failure so the caller can map it to an error response.
function parseWebhookPayload(secret: string, body: unknown, signatureHeader: string | undefined): unknown {
  const rawBody = Buffer.isBuffer(body) ? body.toString('utf8') : typeof body === 'string' ? body : ''
  if (!verifyWebhookSignature(secret, rawBody, signatureHeader)) throw new Error('invalid webhook signature')

  return JSON.parse(rawBody)
}
