import { afterEach, describe, expect, test, vi } from 'vitest'
import { archiveChat, disconnectAccount, fullSync, getStatus, loadData, loadMessages, sendChatMessage } from './server'
import type { UserSession } from '@/app/shared/auth/session'
import { getAuthenticatedUserSession } from '@/app/shared/auth/auth'
import {
  archiveWhatsappChat,
  disconnectWhatsapp,
  getWhatsappChats,
  getWhatsappMessages,
  getWhatsappStatus,
  sendWhatsappMessage,
  startWhatsapp,
  triggerWhatsappFullSync,
} from './_external/whatsapp'

vi.mock('@/app/shared/auth/auth', async () => {
  const actual = await vi.importActual('@/app/shared/auth/auth')
  return { ...actual, getAuthenticatedUserSession: vi.fn() }
})
vi.mock('./_external/whatsapp', () => ({
  archiveWhatsappChat: vi.fn(),
  disconnectWhatsapp: vi.fn(),
  getWhatsappChats: vi.fn(),
  getWhatsappMessages: vi.fn(),
  getWhatsappStatus: vi.fn(),
  sendWhatsappMessage: vi.fn(),
  startWhatsapp: vi.fn(),
  triggerWhatsappFullSync: vi.fn(),
}))

const { mockWarn } = vi.hoisted(() => ({ mockWarn: vi.fn<(message: string) => void>() }))
vi.mock('@/app/shared/logger', () => ({ logger: { warn: mockWarn, error: vi.fn(), info: vi.fn(), debug: vi.fn() } }))

afterEach(() => {
  vi.clearAllMocks()
})

function signIn(email: string): UserSession {
  const user: UserSession = { name: 'Test User', email, applications: ['startpage'] }
  vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)
  return user
}

describe('loadData', () => {
  test('loads the chats of a connected account for the signed-in user', async ({ task }) => {
    signIn(task.id)
    const chats = [{ id: 'c1', name: 'Chat', isArchived: false, isGroup: false, lastMessageTimestamp: '2026-01-01T00:00:00Z' }]
    vi.mocked(startWhatsapp).mockResolvedValue({ type: 'connected' })
    vi.mocked(getWhatsappChats).mockResolvedValue(chats)

    expect(await loadData()).toEqual({ chats, status: { type: 'connected' } })
    expect(getWhatsappChats).toHaveBeenCalledWith(task.id)
  })

  test('does not load chats while not connected', async ({ task }) => {
    signIn(task.id)
    vi.mocked(startWhatsapp).mockResolvedValue({ type: 'needAuth', qr: 'qr' })

    expect(await loadData()).toEqual({ chats: [], status: { type: 'needAuth', qr: 'qr' } })
    expect(getWhatsappChats).not.toHaveBeenCalled()
  })

  test('reports a bridge failure as closed with the error', async ({ task }) => {
    signIn(task.id)
    vi.mocked(startWhatsapp).mockRejectedValue(new Error('bridge down'))

    expect(await loadData()).toEqual({ chats: [], status: { type: 'closed' }, error: 'bridge down' })
    expect(mockWarn).toHaveBeenCalled()
  })
})

describe('loadMessages', () => {
  test('loads the messages for the signed-in user', async ({ task }) => {
    signIn(task.id)
    vi.mocked(getWhatsappMessages).mockResolvedValue([])

    expect(await loadMessages('123@s.whatsapp.net')).toEqual([])
    expect(getWhatsappMessages).toHaveBeenCalledWith(task.id, '123@s.whatsapp.net')
  })

  test('logs and rethrows a failure', async ({ task }) => {
    signIn(task.id)
    vi.mocked(getWhatsappMessages).mockRejectedValue(new Error('bridge down'))

    await expect(loadMessages('x')).rejects.toThrow('bridge down')
    expect(mockWarn.mock.calls[0][0]).toContain('bridge down')
  })
})

describe('actions', () => {
  test('call the bridge for the signed-in user', async ({ task }) => {
    signIn(task.id)
    vi.mocked(getWhatsappStatus).mockResolvedValue({ type: 'closed' })

    expect(await getStatus()).toEqual({ success: true, data: { type: 'closed' } })
    expect((await archiveChat('c1', true)).success).toBe(true)
    expect((await sendChatMessage('c1', 'hi')).success).toBe(true)
    expect((await fullSync()).success).toBe(true)
    expect((await disconnectAccount()).success).toBe(true)

    expect(archiveWhatsappChat).toHaveBeenCalledWith(task.id, 'c1', true)
    expect(sendWhatsappMessage).toHaveBeenCalledWith(task.id, 'c1', 'hi')
    expect(triggerWhatsappFullSync).toHaveBeenCalledWith(task.id)
    expect(disconnectWhatsapp).toHaveBeenCalledWith(task.id)
  })

  test('report a bridge failure', async ({ task }) => {
    signIn(task.id)
    vi.mocked(sendWhatsappMessage).mockRejectedValue(new Error('send failed'))

    expect(await sendChatMessage('c1', 'hi')).toEqual({ success: false, error: 'send failed' })
  })

  test('are rejected without a session and do not call the bridge', async () => {
    vi.mocked(getAuthenticatedUserSession).mockRejectedValue(new Error('No user session found'))

    expect((await sendChatMessage('c1', 'hi')).success).toBe(false)
    expect((await getStatus()).success).toBe(false)
    expect(sendWhatsappMessage).not.toHaveBeenCalled()
    expect(getWhatsappStatus).not.toHaveBeenCalled()
  })
})
