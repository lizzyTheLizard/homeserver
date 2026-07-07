import { describe, expect, test, vi, beforeEach } from 'vitest'
import { getAuthenticatedUserSession, type UserSession } from '@/app/shared/auth/auth'
import { getWAFasade } from './whatsapp'
import { createStore, type DataStore, type WhatsAppStore } from '@lizzythelizard/whatsapp-mcp'
import { listWhatsappChatsTool, listAllWhatsappChatsTool, getWhatsappMessagesTool, sendWhatsappMessageTool, archiveWhatsappChatTool, setWhatsappChatReadStatusTool, getUnarchivedWhatsAppChats } from './whatsapp-tools'

vi.mock('@/app/shared/auth/auth', async () => {
  const actual = await vi.importActual('@/app/shared/auth/auth')
  return {
    ...actual,
    getAuthenticatedUserSession: vi.fn(),
  }
})

vi.mock('./whatsapp', async () => {
  const actual = await vi.importActual('./whatsapp')
  return {
    ...actual,
    getWAFasade: vi.fn(),
  }
})

const executionOptions = { toolCallId: 'test', messages: [], context: {} }
const testUser: UserSession = { name: 'Test User', email: 'test@test.com', applications: ['startpage'] }
const sendMessageMock = vi.fn().mockResolvedValue(undefined)
const setReadMock = vi.fn().mockResolvedValue(undefined)
const setArchivedMock = vi.fn().mockResolvedValue(undefined)

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getAuthenticatedUserSession).mockResolvedValue(testUser)
  const store = createTestStore()
  vi.mocked(getWAFasade).mockResolvedValue({
    ...store,
    getStatus: () => ({ type: 'ready' as const }),
    sendMessage: sendMessageMock,
    setRead: setReadMock,
    setArchived: setArchivedMock,
  })
})

describe('listWhatsappChatsTool', () => {
  test('returns only unarchived chats', async () => {
    const result = await listWhatsappChatsTool.execute({}, executionOptions) as { jid: string }[]

    expect(result).toHaveLength(2)
    const jids = result.map(c => c.jid)
    expect(jids).toContain('123456789@s.whatsapp.net')
    expect(jids).toContain('123456789-123456@g.us')
  })

  test('does not return the archived field', async () => {
    const result = await listWhatsappChatsTool.execute({}, executionOptions) as Record<string, unknown>[]

    expect(result).toHaveLength(2)
    for (const chat of result) {
      expect(chat).not.toHaveProperty('archived')
    }
  })

  test('includes chat metadata fields', async () => {
    const result = await listWhatsappChatsTool.execute(
      {},
      executionOptions,
    ) as { jid: string, name: string, unreadCount: number, lastMessageTimestamp: number, isGroup: boolean }[]

    const johnChat = result.find(c => c.jid === '123456789@s.whatsapp.net')
    expect(johnChat).toBeDefined()
    expect(johnChat?.name).toBe('John Doe')
    expect(johnChat?.unreadCount).toBe(3)
    expect(johnChat?.lastMessageTimestamp).toBe(1700000000)
    expect(johnChat?.isGroup).toBe(false)

    const groupChat = result.find(c => c.jid === '123456789-123456@g.us')
    expect(groupChat).toBeDefined()
    expect(groupChat?.name).toBe('Family Group')
    expect(groupChat?.unreadCount).toBe(5)
    expect(groupChat?.lastMessageTimestamp).toBe(1700100000)
    expect(groupChat?.isGroup).toBe(true)
  })
})

describe('listAllWhatsappChatsTool', () => {
  test('returns all chats including archived', async () => {
    const result = await listAllWhatsappChatsTool.execute({}, executionOptions) as { jid: string, archived: boolean }[]

    expect(result).toHaveLength(3)
    const archivedChat = result.find(c => c.jid === '987654321@s.whatsapp.net')
    expect(archivedChat).toBeDefined()
    expect(archivedChat?.archived).toBe(true)

    const unarchived = result.filter(c => !c.archived)
    expect(unarchived).toHaveLength(2)
  })
})

describe('getWhatsappMessagesTool', () => {
  test('returns messages for a specific chat', async () => {
    const result = await getWhatsappMessagesTool.execute(
      { chatId: '123456789@s.whatsapp.net' },
      executionOptions,
    ) as { id: string, message: string, messageTimestamp: number }[]

    expect(result).toHaveLength(2)
    expect(result.map(m => m.id)).toEqual(expect.arrayContaining(['msg1', 'msg2']))
  })

  test('returns message content and metadata', async () => {
    const result = await getWhatsappMessagesTool.execute(
      { chatId: '123456789@s.whatsapp.net' },
      executionOptions,
    ) as { id: string, message: string, messageTimestamp: number, from?: { jid: string, name: string } }[]

    const msg1 = result.find(m => m.id === 'msg1')
    expect(msg1).toBeDefined()
    expect(msg1?.message).toBe('Hello from John!')
    expect(msg1?.messageTimestamp).toBe(1700000000)
  })

  test('returns empty array for chat with no messages', async () => {
    const result = await getWhatsappMessagesTool.execute(
      { chatId: '123456789-123456@g.us' },
      executionOptions,
    )

    expect(result).toEqual([])
  })
})

describe('sendWhatsappMessageTool', () => {
  test('calls sendMessage with correct arguments', async () => {
    const result = await sendWhatsappMessageTool.execute(
      { chatId: '123456789@s.whatsapp.net', message: 'Test message' },
      executionOptions,
    )

    expect(result).toBe('Message sent successfully')
    expect(sendMessageMock).toHaveBeenCalledWith('123456789@s.whatsapp.net', 'Test message')
    expect(sendMessageMock).toHaveBeenCalledTimes(1)
  })
})

describe('archiveWhatsappChatTool', () => {
  test('calls setArchived with (jid, true)', async () => {
    const result = await archiveWhatsappChatTool.execute(
      { chatId: '123456789@s.whatsapp.net' },
      executionOptions,
    )

    expect(result).toBe('Chat archived successfully')
    expect(setArchivedMock).toHaveBeenCalledWith('123456789@s.whatsapp.net', true)
    expect(setArchivedMock).toHaveBeenCalledTimes(1)
  })
})

describe('setWhatsappChatReadStatusTool', () => {
  test('marks chat as read', async () => {
    const result = await setWhatsappChatReadStatusTool.execute(
      { chatId: '123456789@s.whatsapp.net', read: true },
      executionOptions,
    )

    expect(result).toBe('Chat marked as read')
    expect(setReadMock).toHaveBeenCalledWith('123456789@s.whatsapp.net', true)
    expect(setReadMock).toHaveBeenCalledTimes(1)
  })

  test('marks chat as unread', async () => {
    const result = await setWhatsappChatReadStatusTool.execute(
      { chatId: '123456789@s.whatsapp.net', read: false },
      executionOptions,
    )

    expect(result).toBe('Chat marked as unread')
    expect(setReadMock).toHaveBeenCalledWith('123456789@s.whatsapp.net', false)
    expect(setReadMock).toHaveBeenCalledTimes(1)
  })
})

describe('getUnarchivedWhatsAppChats', () => {
  test('returns only unarchived chats', async () => {
    const result = await getUnarchivedWhatsAppChats()

    expect(result).toHaveLength(2)
    expect(result.every(c => !c.archived)).toBe(true)
  })

  test('excludes archived chats', async () => {
    const result = await getUnarchivedWhatsAppChats()

    const jids = result.map(c => c.jid)
    expect(jids).not.toContain('987654321@s.whatsapp.net')
  })

  test('sorts chats by lastMessageTimestamp descending', async () => {
    const result = await getUnarchivedWhatsAppChats()

    for (let i = 0; i < result.length - 1; i++) {
      expect(result[i].lastMessageTimestamp).toBeGreaterThanOrEqual(result[i + 1].lastMessageTimestamp)
    }
  })

  test('returns empty array when no unarchived chats exist', async () => {
    const emptyStore = createStore({
      chats: {},
      contacts: {},
      messages: {},
      auth: '',
    })
    vi.mocked(getWAFasade).mockResolvedValue({
      ...emptyStore,
      getStatus: () => ({ type: 'ready' as const }),
      sendMessage: sendMessageMock,
      setRead: setReadMock,
      setArchived: setArchivedMock,
    })

    const result = await getUnarchivedWhatsAppChats()
    expect(result).toEqual([])
  })

  test('calls getAuthenticatedUserSession with startpage', async () => {
    await getUnarchivedWhatsAppChats()

    expect(getAuthenticatedUserSession).toHaveBeenCalledWith('startpage')
  })

  test('returns chats with correct properties', async () => {
    const result = await getUnarchivedWhatsAppChats()

    expect(result).toHaveLength(2)
    const groupChat = result.find(c => c.isGroup)
    expect(groupChat).toBeDefined()
    expect(groupChat?.name).toBe('Family Group')
    expect(groupChat?.unreadCount).toBe(5)

    const johnChat = result.find(c => !c.isGroup)
    expect(johnChat).toBeDefined()
    expect(johnChat?.name).toBe('John Doe')
    expect(johnChat?.unreadCount).toBe(3)
  })
})

function createTestStore(): WhatsAppStore {
  const testData: DataStore = {
    chats: {
      '123456789@s.whatsapp.net': JSON.stringify({
        id: '123456789@s.whatsapp.net',
        unreadCount: 3,
        readOnly: false,
        archived: false,
        messages: [{}],
        lastMsgTimestamp: 1700000000,
      }),
      '987654321@s.whatsapp.net': JSON.stringify({
        id: '987654321@s.whatsapp.net',
        unreadCount: 0,
        readOnly: false,
        archived: true,
        messages: [{}],
        lastMsgTimestamp: 1699900000,
      }),
      '123456789-123456@g.us': JSON.stringify({
        id: '123456789-123456@g.us',
        unreadCount: 5,
        readOnly: false,
        name: 'Family Group',
        archived: false,
        messages: [{}],
        lastMsgTimestamp: 1700100000,
      }),
    },
    contacts: {
      '123456789@s.whatsapp.net': JSON.stringify({
        id: '123456789@s.whatsapp.net',
        name: 'John Doe',
        phoneNumber: '123456789@s.whatsapp.net',
      }),
      '987654321@s.whatsapp.net': JSON.stringify({
        id: '987654321@s.whatsapp.net',
        name: 'Jane Smith',
        phoneNumber: '987654321@s.whatsapp.net',
      }),
    },
    messages: {
      msg1: JSON.stringify({
        key: { id: 'msg1', remoteJid: '123456789@s.whatsapp.net' },
        message: { conversation: 'Hello from John!' },
        messageTimestamp: 1700000000,
      }),
      msg2: JSON.stringify({
        key: { id: 'msg2', remoteJid: '123456789@s.whatsapp.net' },
        message: { conversation: 'How are you?' },
        messageTimestamp: 1700000100,
      }),
      msg3: JSON.stringify({
        key: { id: 'msg3', remoteJid: '987654321@s.whatsapp.net' },
        message: { conversation: 'Archived chat message' },
        messageTimestamp: 1699900000,
      }),
    },
    auth: '',
  }
  return createStore(testData)
}
