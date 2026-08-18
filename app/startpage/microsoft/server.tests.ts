import { describe, expect, test, vi, afterEach } from 'vitest'
import { Temporal } from '@js-temporal/polyfill'
import { transactional } from '@/app/shared/_external/db/access'
import { loadMicrosoftStatus, connectMicrosoft, disconnectMicrosoft } from './server'
import type { UserSession } from '@/app/shared/auth/session'
import { getAuthenticatedUserSession } from '@/app/shared/auth/auth'
import { setMicrosoftToken, getMicrosoftToken } from '../_data/Microsoft'
import type { MicrosoftTodoWorker } from '../_external/microsoft-todo'

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
    getMicrosoftMailWorker: vi.fn(),
  }
})

vi.mock('../_external/microsoft-calendar', async () => {
  const actual = await vi.importActual('../_external/microsoft-calendar')
  return {
    ...actual,
    getMicrosoftCalendarWorker: vi.fn(),
  }
})

vi.mock('../_external/microsoft-todo', async () => {
  const actual = await vi.importActual('../_external/microsoft-todo')
  return {
    ...actual,
    getMicrosoftTodoWorker: vi.fn(),
  }
})

const { getUserInfo, getLoginRedirectUrl } = await import('../_external/microsoft')
const { getMicrosoftMailWorker } = await import('../_external/microsoft-mail')
const { getMicrosoftCalendarWorker } = await import('../_external/microsoft-calendar')
const { getMicrosoftTodoWorker } = await import('../_external/microsoft-todo')

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

const serializedMockMessages = mockMessages.map(msg => ({
  ...msg,
  receivedDateTime: msg.receivedDateTime.toString(),
}))

afterEach(() => {
  vi.clearAllMocks()
})

describe('loadMicrosoftStatus', () => {
  test('returns not connected when user has no token', async ({ task }) => {
    const user: UserSession = { name: 'Test User', email: task.id, applications: ['startpage'] }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)
    vi.mocked(getUserInfo).mockResolvedValue(undefined)

    const result = await loadMicrosoftStatus()

    expect(result).toEqual({ connected: false, mailStatus: 'connecting', todoStatus: 'connecting', calendarStatus: 'connecting', messages: [], todos: [], events: [] })
  })

  test('returns connected with user info and messages', async ({ task }) => {
    const user: UserSession = { name: 'Test User', email: task.id, applications: ['startpage'] }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)
    vi.mocked(getUserInfo).mockResolvedValue(mockUserInfo)
    vi.mocked(getMicrosoftMailWorker).mockResolvedValue({
      getInboxMessages: () => mockMessages,
      getInboxCount: () => ({ focused: 0, focusedUnread: 0, other: 0, otherUnread: 0 }),
      getMessage: () => Promise.resolve(undefined),
      getStatus: () => 'connected',
      sendMail: () => Promise.resolve(),
      archiveMessage: () => Promise.resolve(),
      archiveMessagesFromSender: () => Promise.resolve(0),
      touch: () => { /* mock */ },
    })
    const mockTodoWorker = { getAllTasks: () => [] as never[], getStatus: () => 'connected', touch: () => { /* mock */ } } as unknown as MicrosoftTodoWorker
    vi.mocked(getMicrosoftTodoWorker).mockResolvedValue(mockTodoWorker)
    vi.mocked(getMicrosoftCalendarWorker).mockResolvedValue({ getCalendars: () => [], getAllEvents: () => [], getEventCount: () => ({ eventsToday: 0, eventsThisWeek: 0 }), getStatus: () => 'connected', createEvent: () => Promise.reject(new Error('not implemented')), touch: () => { /* mock */ } })

    const result = await loadMicrosoftStatus()

    expect(result).toEqual({ connected: true, userInfo: mockUserInfo, mailStatus: 'connected', todoStatus: 'connected', calendarStatus: 'connected', messages: serializedMockMessages, todos: [], events: [] })
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
