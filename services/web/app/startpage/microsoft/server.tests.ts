import { describe, expect, test, vi, afterEach } from 'vitest'
import { loadMicrosoftStatus, connectMicrosoft, disconnectMicrosoft } from './server'
import type { UserSession } from '@/app/shared/auth/session'
import { getAuthenticatedUserSession } from '@/app/shared/auth/auth'
import { cookies } from 'next/headers'

vi.mock('@/app/shared/auth/auth', async () => {
  const actual = await vi.importActual('@/app/shared/auth/auth')
  return {
    ...actual,
    getAuthenticatedUserSession: vi.fn(),
  }
})

type ReadonlyRequestCookies = Awaited<ReturnType<typeof cookies>>

vi.mock('next/headers', () => ({ cookies: vi.fn() }))

const { mockWarn } = vi.hoisted(() => ({ mockWarn: vi.fn<(message: string) => void>() }))

vi.mock('@/app/shared/logger', () => ({ logger: { warn: mockWarn, error: vi.fn(), info: vi.fn(), debug: vi.fn() } }))

const mockUserInfo = {
  id: 'user-123',
  userPrincipalName: 'user@example.com',
  displayName: 'Test User',
  mail: 'user@example.com',
}

const mockStatus = {
  connected: true,
  userInfo: mockUserInfo,
  mailStatus: 'connected',
  todoStatus: 'connected',
  calendarStatus: 'connected',
  messages: [],
  todos: [],
  events: [],
}

const originalFetch = globalThis.fetch

afterEach(() => {
  vi.clearAllMocks()
  globalThis.fetch = originalFetch
})

describe('loadMicrosoftStatus', () => {
  test('returns status from assistant API', async ({ task }) => {
    const user: UserSession = { name: 'Test User', email: task.id, applications: ['startpage'] }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)
    vi.mocked(cookies).mockResolvedValue({ toString: () => 'homeserver-session=abc' } as unknown as ReadonlyRequestCookies)
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(mockStatus) })

    const result = await loadMicrosoftStatus()

    expect(result).toEqual(mockStatus)
    expect(fetch).toHaveBeenCalledWith('http://dev-machine:8500/microsoft/status', { headers: { Cookie: 'homeserver-session=abc' } })
  })
})

describe('assistant call logging', () => {
  test('logs the assistant URL when the assistant is unreachable', async ({ task }) => {
    const user: UserSession = { name: 'Test User', email: task.id, applications: ['startpage'] }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)
    vi.mocked(cookies).mockResolvedValue({ toString: () => 'homeserver-session=abc' } as unknown as ReadonlyRequestCookies)
    const cause = new Error('connect ECONNREFUSED 127.0.0.1:8500')
    globalThis.fetch = vi.fn().mockRejectedValue(new TypeError('fetch failed', { cause }))

    await expect(loadMicrosoftStatus()).rejects.toThrow('fetch failed')

    expect(mockWarn).toHaveBeenCalledTimes(1)
    expect(mockWarn.mock.calls[0][0]).toContain('http://dev-machine:8500/microsoft/status')
    expect(mockWarn.mock.calls[0][0]).toContain('ECONNREFUSED')
  })
})

describe('connectMicrosoft', () => {
  test('returns the login redirect URL from assistant API', async ({ task }) => {
    const user: UserSession = { name: 'Test User', email: task.id, applications: ['startpage'] }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)
    vi.mocked(cookies).mockResolvedValue({ toString: () => 'homeserver-session=abc' } as unknown as ReadonlyRequestCookies)
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ url: 'https://login.microsoftonline.com/authorize' }) })

    const result = await connectMicrosoft()

    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data).toBe('https://login.microsoftonline.com/authorize')
  })
})

describe('disconnectMicrosoft', () => {
  test('calls assistant disconnect endpoint', async ({ task }) => {
    const user: UserSession = { name: 'Test User', email: task.id, applications: ['startpage'] }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)
    vi.mocked(cookies).mockResolvedValue({ toString: () => 'homeserver-session=abc' } as unknown as ReadonlyRequestCookies)
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ success: true }) })

    const result = await disconnectMicrosoft()

    expect(result.success).toBe(true)
    expect(fetch).toHaveBeenCalledWith('http://dev-machine:8500/microsoft/disconnect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cookie': 'homeserver-session=abc' },
      body: '{}',
    })
  })
})
