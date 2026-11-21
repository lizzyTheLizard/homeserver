import type { UserSession } from '@/app/shared/auth/session'
import { createAssistantInstance } from './assistant'
import type { Assistant } from './types'

export const CONVERSATION_TTL_MS = 5 * 60 * 1000

export interface Conversation {
  uuid: string
  ownerEmail: string
  assistant: Assistant
  lastUsed: number
  busy: boolean
}

declare global {
  var assistantConversations: Map<string, Conversation> | undefined
}

export function createConversation(user: UserSession, now = Date.now()): Conversation {
  removeExpired(now)
  const conversation: Conversation = { uuid: crypto.randomUUID(), ownerEmail: user.email, assistant: createAssistantInstance(user), lastUsed: now, busy: false }
  conversations().set(conversation.uuid, conversation)
  return conversation
}

/** Returns the conversation when it exists, has not expired and belongs to the user; renews its lifetime. */
export function findConversation(uuid: string, user: UserSession, now = Date.now()): Conversation | undefined {
  removeExpired(now)
  const conversation = conversations().get(uuid)
  if (conversation?.ownerEmail !== user.email) return undefined
  conversation.lastUsed = now
  return conversation
}

export function discardConversation(uuid: string): void {
  conversations().delete(uuid)
}

// Kept on globalThis so that Next's dev reloads do not lose the conversations.
function conversations(): Map<string, Conversation> {
  globalThis.assistantConversations ??= new Map()
  return globalThis.assistantConversations
}

function removeExpired(now: number): void {
  for (const [uuid, conversation] of conversations()) if (!conversation.busy && now - conversation.lastUsed > CONVERSATION_TTL_MS) conversations().delete(uuid)
}
