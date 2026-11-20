import { z } from 'zod'
import type { Chat, Message, SyncStatus } from '@assistant/whatsapp/types'

export const syncStatusSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('needAuth'), qr: z.string() }),
  z.object({ type: z.literal('connected') }),
  z.object({ type: z.literal('fullsync') }),
  z.object({ type: z.literal('closed') }),
]) satisfies z.ZodType<SyncStatus>

export const messagesSchema = z.array(z.object({
  id: z.string(),
  fromMe: z.boolean(),
  fromName: z.string(),
  content: z.string(),
  messageTimestamp: z.string(),
})) satisfies z.ZodType<Message[]>

export const chatsSchema = z.array(z.object({
  id: z.string(),
  name: z.string(),
  isArchived: z.boolean(),
  isGroup: z.boolean(),
  lastMessageTimestamp: z.string(),
})) satisfies z.ZodType<Chat[]>
