import { describe, expect, test } from 'vitest'
import { mapAuthenticated, mapChats, mapMessages } from './mapping'

describe('mapChats', () => {
  test('returns an empty array for non-array input', () => {
    expect(mapChats(undefined)).toEqual([])
    expect(mapChats(null)).toEqual([])
    expect(mapChats({})).toEqual([])
    expect(mapChats('nope')).toEqual([])
  })

  test('maps chat fields', () => {
    const chats = mapChats([
      { jid: '123@s.whatsapp.net', name: '  Alice  ', archived: true, last_message_ts: '2024-01-01T10:00:00Z' },
      { jid: '456@g.us', name: '', last_message_ts: '2024-01-02T10:00:00.250Z' },
    ])
    expect(chats).toEqual([
      { id: '456@g.us', name: '456@g.us', isArchived: false, isGroup: true, lastMessageTimestamp: '2024-01-02T10:00:00Z' },
      { id: '123@s.whatsapp.net', name: 'Alice', isArchived: true, isGroup: false, lastMessageTimestamp: '2024-01-01T10:00:00Z' },
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
      { jid: 'a', name: 'a', last_message_ts: '2024-01-01T10:00:00Z' },
      { jid: 'b', name: 'b', last_message_ts: '2024-03-01T10:00:00Z' },
      { jid: 'c', name: 'c', last_message_ts: 'not-a-date' },
      { jid: 'd', name: 'd', last_message_ts: '2024-02-01T10:00:00Z' },
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
          MsgID: 'id-1',
          ChatJID: '123@s.whatsapp.net',
          SenderJID: '456@s.whatsapp.net',
          SenderName: 'Bob',
          FromMe: false,
          Text: 'Hello',
          Timestamp: '2024-01-01T10:00:00.500Z',
        },
      ],
    })
    expect(messages).toEqual([
      {
        id: 'id-1',
        chatId: '123@s.whatsapp.net',
        fromMe: false,
        fromName: 'Bob',
        content: 'Hello',
        messageTimestamp: '2024-01-01T10:00:00Z',
      },
    ])
  })

  test('fromMe accepts booleans and numeric flags', () => {
    const messages = mapMessages({
      messages: [
        { MsgID: 'a', FromMe: true, Text: 'hi' },
        { MsgID: 'b', FromMe: 1, Text: 'hi' },
        { MsgID: 'c', FromMe: 0, Text: 'hi' },
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
        { MsgID: 'a', Timestamp: '2024-01-01T10:00:00.123Z', Text: 'x' },
        { MsgID: 'b', Timestamp: '2024-01-01T10:00:00+00:00', Text: 'x' },
        { MsgID: 'c', Timestamp: 'garbage', Text: 'x' },
        { MsgID: 'd', Timestamp: '', Text: 'x' },
        { MsgID: 'e', Timestamp: 123456, Text: 'x' },
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
