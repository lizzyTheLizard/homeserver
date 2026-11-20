import { beforeEach, describe, expect, test, vi } from 'vitest'

const { mockGetWhatsappStatus, mockGetWhatsappMessages } = vi.hoisted(() => ({
  mockGetWhatsappMessages: vi.fn(),
  mockGetWhatsappStatus: vi.fn(),
}))

vi.mock('../whatsapp/whatsapp', () => ({
  archiveWhatsappChat: vi.fn(),
  getWhatsappChats: vi.fn(),
  getWhatsappMessages: mockGetWhatsappMessages,
  getWhatsappStatus: mockGetWhatsappStatus,
  sendWhatsappMessage: vi.fn(),
}))

import getTools from './whatsapp-tools'

const user = { applications: ['startpage'], email: 'test@test.com', name: 'Test User' },

 now = Date.now(),
 hoursAgo = (h: number) => new Date(now - h * 60 * 60 * 1000).toISOString(),
 daysAgo = (d: number) => new Date(now - d * 24 * 60 * 60 * 1000).toISOString()

function message(id: string, messageTimestamp: string) {
  return { content: `content ${id}`, fromMe: false, fromName: 'Alex', id, messageTimestamp }
}

async function getMessages(chatId: string): Promise<{ id: string }[]> {
  const tools = getTools(user)
  // oxlint-disable-next-line typescript/no-non-null-assertion
  return (await tools.get_whatsapp_messages.execute!({ chatId }, { context: {}, messages: [], toolCallId: '1' })) as { id: string }[]
}

describe('get_whatsapp_messages', () => {
  beforeEach(() => {
    mockGetWhatsappStatus.mockReset()
    mockGetWhatsappMessages.mockReset()
    mockGetWhatsappStatus.mockResolvedValue({ type: 'connected' })
  })

  test('orders messages chronologically', async () => {
    mockGetWhatsappMessages.mockResolvedValue([
      message('newest', hoursAgo(1)),
      message('oldest', hoursAgo(5)),
      message('middle', hoursAgo(3)),
    ])

    const result = await getMessages('test-jid')

    expect(result.map(m => m.id)).toEqual(['oldest', 'middle', 'newest'])
  })

  test('returns only messages from the last day when any exist', async () => {
    mockGetWhatsappMessages.mockResolvedValue([
      message('today', hoursAgo(2)),
      message('three-days-ago', daysAgo(3)),
      message('ten-days-ago', daysAgo(10)),
    ])

    const result = await getMessages('test-jid')

    expect(result.map(m => m.id)).toEqual(['today'])
  })

  test('falls back to the last week when nothing is within the last day', async () => {
    mockGetWhatsappMessages.mockResolvedValue([
      message('ten-days-ago', daysAgo(10)),
      message('three-days-ago', daysAgo(3)),
    ])

    const result = await getMessages('test-jid')

    expect(result.map(m => m.id)).toEqual(['three-days-ago'])
  })

  test('falls back to the last 30 days when nothing is within the last week', async () => {
    mockGetWhatsappMessages.mockResolvedValue([
      message('forty-days-ago', daysAgo(40)),
      message('ten-days-ago', daysAgo(10)),
      message('fifteen-days-ago', daysAgo(15)),
    ])

    const result = await getMessages('test-jid')

    expect(result.map(m => m.id)).toEqual(['fifteen-days-ago', 'ten-days-ago'])
  })

  test('returns an empty list when there are no messages within the last 30 days', async () => {
    mockGetWhatsappMessages.mockResolvedValue([
      message('forty-days-ago', daysAgo(40)),
      message('sixty-days-ago', daysAgo(60)),
    ])

    const result = await getMessages('test-jid')

    expect(result).toEqual([])
  })
})
