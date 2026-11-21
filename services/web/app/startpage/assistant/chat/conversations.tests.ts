import { beforeEach, describe, expect, test, vi } from 'vitest'

vi.mock('./assistant', () => ({ createAssistantInstance: vi.fn(() => ({ on: vi.fn(), off: vi.fn(), init: vi.fn(), send: vi.fn() })) }))

import { CONVERSATION_TTL_MS, createConversation, findConversation } from './conversations'

const user = { name: 'A', email: 'a@test.com', applications: ['startpage'] }
const other = { name: 'B', email: 'b@test.com', applications: ['startpage'] }

beforeEach(() => {
  globalThis.assistantConversations = undefined
})

describe('conversations', () => {
  test('a created conversation is found by its owner', () => {
    const conversation = createConversation(user, 0)
    expect(findConversation(conversation.uuid, user, 1)).toBe(conversation)
  })

  test('another user does not find it', () => {
    const conversation = createConversation(user, 0)
    expect(findConversation(conversation.uuid, other, 1)).toBeUndefined()
  })

  test('an idle conversation expires', () => {
    const conversation = createConversation(user, 0)
    expect(findConversation(conversation.uuid, user, CONVERSATION_TTL_MS + 1)).toBeUndefined()
  })

  test('a request renews the lifetime', () => {
    const conversation = createConversation(user, 0)
    findConversation(conversation.uuid, user, CONVERSATION_TTL_MS - 1)
    expect(findConversation(conversation.uuid, user, CONVERSATION_TTL_MS * 1.5)).toBe(conversation)
  })

  test('an unknown identifier is not found', () => {
    expect(findConversation('nope', user)).toBeUndefined()
  })
})
