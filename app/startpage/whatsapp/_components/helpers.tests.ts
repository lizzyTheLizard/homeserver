import { describe, expect, test } from 'vitest'
import { Chat, Contact, Message } from '../../_data/Whatsapp'
import { getChatName, getSenderName } from './helpers'

function makeChat(overrides: Partial<Chat> = {}): Chat {
  return {
    id: '123@lid',
    pn: '1234567890@s.whatsapp.net',
    name: undefined,
    is_group: false,
    unread_count: undefined,
    archived: undefined,
    last_message_timestamp: undefined,
    created_at: '',
    updated_at: '',
    owner_email: 'test@example.com',
    ...overrides,
  }
}

function makeContact(overrides: Partial<Contact> = {}): Contact {
  return {
    lid: '123@lid',
    pn: '1234567890@s.whatsapp.net',
    name: 'Alice',
    created_at: '',
    updated_at: '',
    owner_email: 'test@example.com',
    ...overrides,
  }
}

function makeMessage(overrides: Partial<Message> = {}): Message {
  return {
    id: 'msg1',
    chat_id: 'chat1',
    sender_id: undefined,
    content: 'Hello',
    mentioned: undefined,
    timestamp: '',
    created_at: '',
    updated_at: '',
    owner_email: 'test@example.com',
    ...overrides,
  }
}

describe('getChatName', () => {
  test('returns chat.name when it is set', () => {
    const chat = makeChat({ name: 'My Group' })
    expect(getChatName(chat, [])).toBe('My Group')
  })

  test('returns "Unnamed group" for a group chat without a name', () => {
    const chat = makeChat({ name: undefined, is_group: true })
    expect(getChatName(chat, [])).toBe('Unnamed group')
  })

  test('returns contact name for a known contact', () => {
    const chat = makeChat({ id: 'alice@s.whatsapp.net', name: undefined })
    const contacts = [makeContact({ pn: 'alice@s.whatsapp.net', name: 'Alice' })]
    expect(getChatName(chat, contacts)).toBe('Alice')
  })

  test('returns "Unknown contact" for @lid id with no matching LidMapping', () => {
    const chat = makeChat({ id: '999@lid', name: undefined })
    expect(getChatName(chat, [])).toBe('Unknown contact')
  })

  test('formats Swiss phone number from chat id when no contact found', () => {
    const chat = makeChat({ id: '41791234567@s.whatsapp.net', name: undefined })
    expect(getChatName(chat, [])).toBe('+41 79 123 45 67')
  })

  test('formats non-Swiss number with generic +prefix when no contact found', () => {
    const chat = makeChat({ id: '491701234567@s.whatsapp.net', name: undefined })
    expect(getChatName(chat, [])).toBe('+491701234567')
  })
})

describe('getSenderName', () => {
  test('returns undefined when message has no sender_id', () => {
    const message = makeMessage({ sender_id: undefined })
    expect(getSenderName(message, [])).toBeUndefined()
  })

  test('returns contact name for a known sender', () => {
    const message = makeMessage({ sender_id: 'alice@s.whatsapp.net' })
    const contacts = [makeContact({ pn: 'alice@s.whatsapp.net', name: 'Alice' })]
    expect(getSenderName(message, contacts)).toBe('Alice')
  })

  test('formats Swiss phone number when sender has no matching contact', () => {
    const message = makeMessage({ sender_id: '41791234567@s.whatsapp.net' })
    expect(getSenderName(message, [])).toBe('+41 79 123 45 67')
  })

  test('returns "Unknown contact" for @lid sender with no mapping', () => {
    const message = makeMessage({ sender_id: '999@lid' })
    expect(getSenderName(message, [])).toBe('Unknown contact')
  })
})
