import { describe, expect, test, vi, afterEach } from 'vitest'
import { Temporal } from '@js-temporal/polyfill'
import { transactional } from '@/app/shared/_external/db/access'
import { loadMicrosoftStatus, connectMicrosoft, disconnectMicrosoft } from './server'
import type { UserSession } from '@/app/shared/auth/auth'
import { getAuthenticatedUserSession } from '@/app/shared/auth/auth'
import { setMicrosoftToken, getMicrosoftToken } from '../_data/Microsoft'

vi.mock('@/app/shared/auth/auth', async () => {
  const actual = await vi.importActual('@/app/shared/auth/auth')
  return {
    ...actual,
    getAuthenticatedUserSession: vi.fn(),
  }
})

vi.mock('../_external/microsoft', async () => {
  const actual = await vi.importActual('../_external/microsoft')
  return {
    ...actual,
    getUserInfo: vi.fn(),
    getLoginRedirectUrl: vi.fn(),
  }
})

vi.mock('../_external/microsoft-mail', async () => {
  const actual = await vi.importActual('../_external/microsoft-mail')
  return {
    ...actual,
    getInboxMessages: vi.fn(),
  }
})

const { getUserInfo, getLoginRedirectUrl } = await import('../_external/microsoft')
const { getInboxMessages } = await import('../_external/microsoft-mail')

const mockUserInfo = {
  id: 'user-123',
  userPrincipalName: 'user@example.com',
  displayName: 'Test User',
  mail: 'user@example.com',
}

const mockMessages = [
  {
    id: 'msg-1',
    subject: 'Hello',
    from: { emailAddress: { address: 'sender@example.com', name: 'Sender' } },
    toRecipients: [{ emailAddress: { address: 'user@example.com', name: 'Test User' } }],
    receivedDateTime: Temporal.Instant.from('2025-07-08T10:00:00Z'),
    isRead: false,
    bodyPreview: 'Hello there',
  },
]

afterEach(() => {
  vi.clearAllMocks()
})

describe('loadMicrosoftStatus', () => {
  test('returns not connected when user has no token', async ({ task }) => {
    const user: UserSession = { name: 'Test User', email: task.id, applications: ['startpage'] }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)
    vi.mocked(getUserInfo).mockResolvedValue(undefined)

    const result = await loadMicrosoftStatus()

    expect(result).toEqual({ connected: false, messages: [], todos: [], events: [] })
  })

  test('returns connected with user info and messages', async ({ task }) => {
    const user: UserSession = { name: 'Test User', email: task.id, applications: ['startpage'] }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)
    vi.mocked(getUserInfo).mockResolvedValue(mockUserInfo)
    vi.mocked(getInboxMessages).mockResolvedValue(mockMessages)

    const result = await loadMicrosoftStatus()

    expect(result).toEqual({ connected: true, userInfo: mockUserInfo, messages: mockMessages, todos: [], events: [] })
  })
})

describe('connectMicrosoft', () => {
  test('returns the login redirect URL', async ({ task }) => {
    const user: UserSession = { name: 'Test User', email: task.id, applications: ['startpage'] }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)
    vi.mocked(getLoginRedirectUrl).mockResolvedValue(new URL('https://login.microsoftonline.com/authorize'))

    const result = await connectMicrosoft()

    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data).toBe('https://login.microsoftonline.com/authorize')
  })
})

describe('disconnectMicrosoft', () => {
  test('deletes the token from the database', async ({ task }) => {
    const user: UserSession = { name: 'Test User', email: task.id, applications: ['startpage'] }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    await transactional(async (db) => {
      await setMicrosoftToken(db, task.id, { access_token: 'test-token', refresh_token: 'test-refresh', expires_at: 2000000000 })
    })

    const result = await disconnectMicrosoft()

    expect(result.success).toBe(true)

    const token = await transactional(db => getMicrosoftToken(db, task.id))
    expect(token).toBeUndefined()
  })

  test('succeeds even when no token exists', async ({ task }) => {
    const user: UserSession = { name: 'Test User', email: task.id, applications: ['startpage'] }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    const result = await disconnectMicrosoft()

    expect(result.success).toBe(true)
  })
})
