import { describe, expect, test } from 'vitest'
import { mapAuthenticated, mapChatArchived, mapChats, mapMessages } from './mapping'

describe('mapChats', () => {
  test('returns an empty array for non-array input', () => {
    expect(mapChats(undefined)).toEqual([])
    expect(mapChats(null)).toEqual([])
    expect(mapChats({})).toEqual([])
    expect(mapChats('nope')).toEqual([])
  })

  test('maps chat fields', () => {
    const chats = mapChats([
      { archived: true, jid: '123@s.whatsapp.net', last_message_ts: '2024-01-01T10:00:00Z', name: '  Alice  ' },
      { jid: '456@g.us', last_message_ts: '2024-01-02T10:00:00.250Z', name: '' },
    ])
    expect(chats).toEqual([
      { id: '456@g.us', isArchived: false, isGroup: true, lastMessageTimestamp: '2024-01-02T10:00:00Z', name: '456@g.us' },
      { id: '123@s.whatsapp.net', isArchived: true, isGroup: false, lastMessageTimestamp: '2024-01-01T10:00:00Z', name: 'Alice' },
    ])
  })

  test('drops the status broadcast chat', () => {
    const chats = mapChats([
      { jid: 'status@broadcast', name: 'Status' },
      { jid: '123@s.whatsapp.net', name: 'Alice' },
    ])
    expect(chats.map(chat => chat.id)).toEqual(['123@s.whatsapp.net'])
  })

  test('sorts by last message timestamp, newest first', () => {
    const chats = mapChats([
      { jid: 'a', last_message_ts: '2024-01-01T10:00:00Z', name: 'a' },
      { jid: 'b', last_message_ts: '2024-03-01T10:00:00Z', name: 'b' },
      { jid: 'c', last_message_ts: 'not-a-date', name: 'c' },
      { jid: 'd', last_message_ts: '2024-02-01T10:00:00Z', name: 'd' },
    ])
    expect(chats.map(chat => chat.id)).toEqual(['b', 'd', 'a', 'c'])
  })

  test('missing jid becomes an empty string', () => {
    const chats = mapChats([{ name: 'No Jid' }])
    expect(chats[0].id).toBe('')
  })
})

describe('mapAuthenticated', () => {
  test('is true only when authenticated is exactly true', () => {
    expect(mapAuthenticated({ authenticated: true })).toBe(true)
    expect(mapAuthenticated({ authenticated: false })).toBe(false)
    expect(mapAuthenticated({})).toBe(false)
    expect(mapAuthenticated(null)).toBe(false)
    expect(mapAuthenticated('yes')).toBe(false)
    expect(mapAuthenticated(undefined)).toBe(false)
  })
})

describe('mapChatArchived', () => {
  test('is true only when archived is exactly true', () => {
    expect(mapChatArchived({ archived: true, jid: '123@s.whatsapp.net' })).toBe(true)
  })

  test('is false when archived is explicitly false', () => {
    expect(mapChatArchived({ archived: false, jid: '123@s.whatsapp.net' })).toBe(false)
  })

  test('is false when archived is missing', () => {
    expect(mapChatArchived({ jid: '123@s.whatsapp.net' })).toBe(false)
  })

  test('is false for non-object input', () => {
    expect(mapChatArchived(undefined)).toBe(false)
    expect(mapChatArchived(null)).toBe(false)
    expect(mapChatArchived('yes')).toBe(false)
    expect(mapChatArchived([{ archived: true }])).toBe(false)
  })
})

describe('mapMessages', () => {
  test('returns an empty array without a messages list', () => {
    expect(mapMessages(undefined)).toEqual([])
    expect(mapMessages(null)).toEqual([])
    expect(mapMessages({})).toEqual([])
    expect(mapMessages({ messages: 'nope' })).toEqual([])
  })

  test('maps message fields', () => {
    const messages = mapMessages({
      messages: [
        {
          ChatJID: '123@s.whatsapp.net',
          FromMe: false,
          MsgID: 'id-1',
          SenderJID: '456@s.whatsapp.net',
          SenderName: 'Bob',
          Text: 'Hello',
          Timestamp: '2024-01-01T10:00:00.500Z',
        },
      ],
    })
    expect(messages).toEqual([
      {
        chatId: '123@s.whatsapp.net',
        content: 'Hello',
        fromMe: false,
        fromName: 'Bob',
        id: 'id-1',
        messageTimestamp: '2024-01-01T10:00:00Z',
      },
    ])
  })

  test('fromMe accepts booleans and numeric flags', () => {
    const messages = mapMessages({
      messages: [
        { FromMe: true, MsgID: 'a', Text: 'hi' },
        { FromMe: 1, MsgID: 'b', Text: 'hi' },
        { FromMe: 0, MsgID: 'c', Text: 'hi' },
      ],
    })
    expect(messages.map(message => [message.id, message.fromMe])).toEqual([
      ['a', true],
      ['b', true],
      ['c', false],
    ])
  })

  test('formats the sender name', () => {
    const cases: [Record<string, unknown>, string][] = [
      [{ FromMe: true, SenderJID: '456@s.whatsapp.net', Text: 'x' }, 'Me'],
      [{ SenderJID: '456@s.whatsapp.net', SenderName: '  Bob  ', Text: 'x' }, 'Bob'],
      [{ SenderJID: '456@s.whatsapp.net', Text: 'x' }, '456'],
      [{ SenderJID: 'someone@unknown.net', Text: 'x' }, 'someone@unknown.net'],
    ]
    for (const [input, expected] of cases) {
      const [message] = mapMessages({ messages: [input] })
      expect(message.fromName).toBe(expected)
    }
  })

  test('drops messages without text content', () => {
    const messages = mapMessages({
      messages: [
        { MsgID: 'a', Text: 'hello' },
        { MsgID: 'b' },
        { MsgID: 'c', Text: '' },
      ],
    })
    expect(messages.map(message => message.id)).toEqual(['a'])
  })

  test('normalizes message timestamps', () => {
    const messages = mapMessages({
      messages: [
        { MsgID: 'a', Text: 'x', Timestamp: '2024-01-01T10:00:00.123Z' },
        { MsgID: 'b', Text: 'x', Timestamp: '2024-01-01T10:00:00+00:00' },
        { MsgID: 'c', Text: 'x', Timestamp: 'garbage' },
        { MsgID: 'd', Text: 'x', Timestamp: '' },
        { MsgID: 'e', Text: 'x', Timestamp: 123456 },
      ],
    })
    expect(messages.map(message => message.messageTimestamp)).toEqual([
      '2024-01-01T10:00:00Z',
      '2024-01-01T10:00:00Z',
      'garbage',
      '',
      '',
    ])
  })
})
