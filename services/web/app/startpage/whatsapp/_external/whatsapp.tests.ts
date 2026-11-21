import { afterEach, describe, expect, test, vi } from 'vitest'
import {
  archiveWhatsappChat,
  disconnectWhatsapp,
  getWhatsappChats,
  getWhatsappMessages,
  getWhatsappStatus,
  mapChats,
  mapMessages,
  mapSessionStatus,
  sendWhatsappMessage,
  sessionName,
  startWhatsapp,
} from './whatsapp'

const fetchMock = vi.fn<typeof fetch>()
vi.stubGlobal('fetch', fetchMock)

afterEach(() => {
  fetchMock.mockReset()
})

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

function calls(): { url: string; method: string; body?: string }[] {
  return fetchMock.mock.calls.map(([url, init]) => ({
    url: typeof url === 'string' ? url : url instanceof URL ? url.href : url.url,
    method: init?.method ?? 'GET',
    body: init?.body as string | undefined,
  }))
}

describe('sessionName', () => {
  test('is deterministic, case-insensitive and URL-safe', () => {
    expect(sessionName('A@b.ch')).toBe(sessionName('a@b.ch'))
    expect(sessionName('a@b.ch')).toMatch(/^u[0-9a-f]{16}$/)
    expect(sessionName('a@b.ch')).not.toBe(sessionName('c@b.ch'))
  })
})

describe('mapSessionStatus', () => {
  test.each([
    ['WORKING', 'connected'],
    ['STARTING', 'starting'],
    ['STOPPED', 'closed'],
    ['FAILED', 'closed'],
    ['PASSKEY_REQUIRED', 'closed'],
  ])('%s maps to %s', (state, type) => {
    expect(mapSessionStatus(state).type).toBe(type)
  })
})

describe('mapChats', () => {
  test('maps ids, names, flags and timestamps and sorts by last message', () => {
    const chats = mapChats([
      { id: 'a@c.us', name: ' Alice ', archived: false, timestamp: 1_700_000_000 },
      { id: { _serialized: 'g@g.us' }, name: '', archived: true, lastMessage: { timestamp: 1_800_000_000 } },
      { id: 'status@broadcast', name: 'Status' },
    ])

    expect(chats).toEqual([
      { id: 'g@g.us', name: 'g@g.us', isArchived: true, isGroup: true, lastMessageTimestamp: '2027-01-15T08:00:00Z' },
      { id: 'a@c.us', name: 'Alice', isArchived: false, isGroup: false, lastMessageTimestamp: '2023-11-14T22:13:20Z' },
    ])
  })

  test('reads the conversation timestamp WAHA reports', () => {
    expect(mapChats([{ id: 'a@c.us', conversationTimestamp: 1_700_000_000 }])[0]?.lastMessageTimestamp).toBe('2023-11-14T22:13:20Z')
  })

  test('chats without an archived flag are not archived', () => {
    expect(mapChats([{ id: 'a@c.us' }])[0]?.isArchived).toBe(false)
  })
})

describe('mapMessages', () => {
  test('maps, drops empty messages and sorts oldest first', () => {
    const messages = mapMessages([
      { id: 'm2', timestamp: 1_700_000_100, fromMe: false, from: '4179@c.us', body: 'later', _data: { notifyName: 'Bob' } },
      { id: { _serialized: 'm1' }, timestamp: 1_700_000_000, fromMe: true, body: 'first' },
      { id: 'm3', timestamp: 1_700_000_200, fromMe: false, from: '4179@c.us', body: '' },
      { id: 'm4', timestamp: 1_700_000_300, fromMe: false, from: 'g@g.us', author: '4178@c.us', body: 'group' },
    ])

    expect(messages.map(m => [m.id, m.fromName, m.content])).toEqual([
      ['m1', 'Me', 'first'],
      ['m2', 'Bob', 'later'],
      ['m4', '4178', 'group'],
    ])
  })
})

describe('client', () => {
  test('startWhatsapp creates a missing session and reports its status', async () => {
    fetchMock
      .mockResolvedValueOnce(json({}, 404))
      .mockResolvedValueOnce(json({}))
      .mockResolvedValueOnce(json({ status: 'STARTING' }))

    const status = await startWhatsapp('a@b.ch')

    expect(status).toEqual({ type: 'starting' })
    expect(calls()[1]).toMatchObject({ method: 'POST', url: expect.stringContaining('/api/sessions') as string })
    expect(JSON.parse(calls()[1]?.body ?? '')).toEqual({ name: sessionName('a@b.ch'), start: true })
  })

  test('startWhatsapp starts a stopped session', async () => {
    fetchMock
      .mockResolvedValueOnce(json({ status: 'STOPPED' }))
      .mockResolvedValueOnce(json({}))
      .mockResolvedValueOnce(json({ status: 'STARTING' }))

    await startWhatsapp('a@b.ch')

    expect(calls()[1]?.url).toContain(`/api/sessions/${sessionName('a@b.ch')}/start`)
  })

  test('getWhatsappStatus returns the QR code while a scan is needed', async () => {
    fetchMock.mockResolvedValueOnce(json({ status: 'SCAN_QR_CODE' })).mockResolvedValueOnce(json({ value: 'qr-payload' }))

    expect(await getWhatsappStatus('a@b.ch')).toEqual({ type: 'needAuth', qr: 'qr-payload' })
  })

  test('getWhatsappStatus is closed for an unknown session and sends the API key', async () => {
    fetchMock.mockResolvedValueOnce(json({}, 404))

    expect(await getWhatsappStatus('a@b.ch')).toEqual({ type: 'closed' })
    const headers = fetchMock.mock.calls[0]?.[1]?.headers as Record<string, string>
    expect(headers['X-Api-Key']).toBeTruthy()
  })

  test('getWhatsappChats and getWhatsappMessages map the responses', async () => {
    fetchMock.mockResolvedValueOnce(json([{ id: 'a@c.us', name: 'Alice', archived: true, timestamp: 1_700_000_000 }]))
    fetchMock.mockResolvedValueOnce(json([{ id: 'm1', timestamp: 1_700_000_000, fromMe: true, body: 'hi' }]))

    expect((await getWhatsappChats('a@b.ch'))[0]?.isArchived).toBe(true)
    expect(await getWhatsappMessages('a@b.ch', 'a@c.us')).toHaveLength(1)
    expect(calls()[1]?.url).toContain('/chats/a%40c.us/messages')
    expect(calls()[0]?.url).toContain('sortBy=conversationTimestamp')
  })

  test('actions call the matching WAHA endpoints', async () => {
    fetchMock.mockResolvedValue(json({}))

    await sendWhatsappMessage('a@b.ch', 'a@c.us', 'hello')
    await archiveWhatsappChat('a@b.ch', 'a@c.us', true)
    await archiveWhatsappChat('a@b.ch', 'a@c.us', false)

    const [send, archive, unarchive] = calls()
    expect(send?.url).toContain('/api/sendText')
    expect(JSON.parse(send?.body ?? '')).toEqual({ session: sessionName('a@b.ch'), chatId: 'a@c.us', text: 'hello' })
    expect(archive?.url).toContain('/chats/a%40c.us/archive')
    expect(unarchive?.url).toContain('/chats/a%40c.us/unarchive')
  })

  test('disconnect logs out and deletes the session, tolerating a missing one', async () => {
    fetchMock.mockResolvedValueOnce(json({}, 404)).mockResolvedValueOnce(json({}, 404))

    await disconnectWhatsapp('a@b.ch')

    expect(calls().map(c => [c.method, c.url.split('/api')[1]])).toEqual([
      ['POST', `/sessions/${sessionName('a@b.ch')}/logout`],
      ['DELETE', `/sessions/${sessionName('a@b.ch')}`],
    ])
  })

  test('a failing WAHA call is reported as an error', async () => {
    fetchMock.mockResolvedValueOnce(json({ message: 'boom' }, 500))

    await expect(sendWhatsappMessage('a@b.ch', 'a@c.us', 'hello')).rejects.toThrow('Failed to send message: 500')
  })
})
