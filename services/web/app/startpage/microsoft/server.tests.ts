import { afterEach, describe, expect, test, vi } from 'vitest'
import { checkMicrosoftStatus, connectMicrosoft, disconnectMicrosoft, loadMessage, loadMicrosoftStatus } from './server'
import type { UserSession } from '@/app/shared/auth/session'
import { getAuthenticatedUserSession } from '@/app/shared/auth/auth'
import { nontransactional } from '@/app/shared/_external/db/access'
import { getMicrosoftToken, setMicrosoftToken } from './_external/data'
import { getLoginRedirectUrl } from './_external/graph'
import { readMicrosoftConnectionStatus, readMicrosoftMessage, readMicrosoftStatus } from './_external/status'

vi.mock('@/app/shared/auth/auth', async () => {
  const actual = await vi.importActual('@/app/shared/auth/auth')
  return { ...actual, getAuthenticatedUserSession: vi.fn() }
})
vi.mock('./_external/graph', () => ({ getLoginRedirectUrl: vi.fn() }))
vi.mock('./_external/status', () => ({ readMicrosoftStatus: vi.fn(), readMicrosoftConnectionStatus: vi.fn(), readMicrosoftMessage: vi.fn() }))

const { mockWarn } = vi.hoisted(() => ({ mockWarn: vi.fn<(message: string) => void>() }))
vi.mock('@/app/shared/logger', () => ({ logger: { warn: mockWarn, error: vi.fn(), info: vi.fn(), debug: vi.fn() } }))

const mockStatus = {
  connected: true,
  userInfo: { id: 'user-123', userPrincipalName: 'user@example.com', displayName: 'Test User', mail: 'user@example.com' },
  mailStatus: 'connected',
  todoStatus: 'connected',
  calendarStatus: 'connected',
  messages: [],
  todos: [],
  events: [],
}

afterEach(() => {
  vi.clearAllMocks()
})

function signIn(email: string): UserSession {
  const user: UserSession = { name: 'Test User', email, applications: ['startpage'] }
  vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)
  return user
}

describe('loadMicrosoftStatus', () => {
  test('reads the status for the signed-in user', async ({ task }) => {
    const user = signIn(task.id)
    vi.mocked(readMicrosoftStatus).mockResolvedValue(mockStatus)

    expect(await loadMicrosoftStatus()).toEqual(mockStatus)
    expect(readMicrosoftStatus).toHaveBeenCalledWith(user)
  })

  test('logs and rethrows a failure', async ({ task }) => {
    signIn(task.id)
    vi.mocked(readMicrosoftStatus).mockRejectedValue(new Error('Graph is down'))

    await expect(loadMicrosoftStatus()).rejects.toThrow('Graph is down')
    expect(mockWarn).toHaveBeenCalledTimes(1)
    expect(mockWarn.mock.calls[0][0]).toContain('Graph is down')
  })

  test('is rejected without a session', async () => {
    vi.mocked(getAuthenticatedUserSession).mockRejectedValue(new Error('No user session found'))

    await expect(loadMicrosoftStatus()).rejects.toThrow('No user session found')
    expect(readMicrosoftStatus).not.toHaveBeenCalled()
  })
})

describe('checkMicrosoftStatus and loadMessage', () => {
  test('check reads the connection status', async ({ task }) => {
    const user = signIn(task.id)
    const status = { mailStatus: 'connected', todoStatus: 'connecting', calendarStatus: 'connected' }
    vi.mocked(readMicrosoftConnectionStatus).mockResolvedValue(status)

    expect(await checkMicrosoftStatus()).toEqual(status)
    expect(readMicrosoftConnectionStatus).toHaveBeenCalledWith(user)
  })

  test('loadMessage reads the message for the signed-in user', async ({ task }) => {
    const user = signIn(task.id)
    vi.mocked(readMicrosoftMessage).mockResolvedValue(undefined)

    expect(await loadMessage('m1')).toBeUndefined()
    expect(readMicrosoftMessage).toHaveBeenCalledWith(user, 'm1')
  })
})

describe('connectMicrosoft', () => {
  test('returns the login redirect URL for the callback of this application', async ({ task }) => {
    signIn(task.id)
    vi.mocked(getLoginRedirectUrl).mockResolvedValue(new URL('https://login.microsoftonline.com/authorize'))

    const result = await connectMicrosoft()

    expect(result).toEqual({ success: true, data: 'https://login.microsoftonline.com/authorize' })
    expect(vi.mocked(getLoginRedirectUrl).mock.calls[0][0]).toMatch(/\/startpage\/microsoft\/callback$/)
  })

  test('reports a failure', async ({ task }) => {
    signIn(task.id)
    vi.mocked(getLoginRedirectUrl).mockRejectedValue(new Error('discovery failed'))

    const result = await connectMicrosoft()

    expect(result.success).toBe(false)
  })
})

describe('disconnectMicrosoft', () => {
  test('removes the stored token of the signed-in user only', async ({ task }) => {
    const user = signIn(task.id)
    const token = { access_token: 'a', refresh_token: 'r', expires_at: 1 }
    await nontransactional(async db => {
      await setMicrosoftToken(db as never, user.email, token)
      await setMicrosoftToken(db as never, `other-${task.id}`, token)
    })

    const result = await disconnectMicrosoft()

    expect(result.success).toBe(true)
    await nontransactional(async db => {
      expect(await getMicrosoftToken(db as never, user.email)).toBeUndefined()
      expect(await getMicrosoftToken(db as never, `other-${task.id}`)).toEqual(token)
    })
  })
})
