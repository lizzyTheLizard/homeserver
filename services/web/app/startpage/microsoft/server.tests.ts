import { afterEach, describe, expect, test, vi } from 'vitest'
import { connectMicrosoft, disconnectMicrosoft, loadMicrosoftStatus } from './server'
import type { UserSession } from '@/app/shared/auth/session'
import { cookies } from 'next/headers'
import { getAuthenticatedUserSession } from '@/app/shared/auth/auth'

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

vi.mock('@/app/shared/logger', () => ({ logger: { debug: vi.fn(), error: vi.fn(), info: vi.fn(), warn: mockWarn } }))

const mockUserInfo = {
  displayName: 'Test User',
  id: 'user-123',
  mail: 'user@example.com',
  userPrincipalName: 'user@example.com',
},

 mockStatus = {
  calendarStatus: 'connected',
  connected: true,
  events: [],
  mailStatus: 'connected',
  messages: [],
  todoStatus: 'connected',
  todos: [],
  userInfo: mockUserInfo,
},

 originalFetch = globalThis.fetch

afterEach(() => {
  vi.clearAllMocks()
  globalThis.fetch = originalFetch
})

describe('loadMicrosoftStatus', () => {
  test('returns status from assistant API', async ({ task }) => {
    const user: UserSession = { applications: ['startpage'], email: task.id, name: 'Test User' }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)
    vi.mocked(cookies).mockResolvedValue({ toString: () => 'homeserver-session=abc' } as unknown as ReadonlyRequestCookies)
    globalThis.fetch = vi.fn().mockResolvedValue({ json: () => Promise.resolve(mockStatus), ok: true })

    const result = await loadMicrosoftStatus()

    expect(result).toEqual(mockStatus)
    expect(fetch).toHaveBeenCalledWith('http://dev-machine:8500/microsoft/status', { headers: { Cookie: 'homeserver-session=abc' } })
  })
})

describe('assistant call logging', () => {
  test('logs the assistant URL when the assistant is unreachable', async ({ task }) => {
    const user: UserSession = { applications: ['startpage'], email: task.id, name: 'Test User' }
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
    const user: UserSession = { applications: ['startpage'], email: task.id, name: 'Test User' }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)
    vi.mocked(cookies).mockResolvedValue({ toString: () => 'homeserver-session=abc' } as unknown as ReadonlyRequestCookies)
    globalThis.fetch = vi.fn().mockResolvedValue({ json: () => Promise.resolve({ url: 'https://login.microsoftonline.com/authorize' }), ok: true })

    const result = await connectMicrosoft()

    expect(result.success).toBe(true)
    if (!result.success) {return}
    expect(result.data).toBe('https://login.microsoftonline.com/authorize')
  })
})

describe('disconnectMicrosoft', () => {
  test('calls assistant disconnect endpoint', async ({ task }) => {
    const user: UserSession = { applications: ['startpage'], email: task.id, name: 'Test User' }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)
    vi.mocked(cookies).mockResolvedValue({ toString: () => 'homeserver-session=abc' } as unknown as ReadonlyRequestCookies)
    globalThis.fetch = vi.fn().mockResolvedValue({ json: () => Promise.resolve({ success: true }), ok: true })

    const result = await disconnectMicrosoft()

    expect(result.success).toBe(true)
    expect(fetch).toHaveBeenCalledWith('http://dev-machine:8500/microsoft/disconnect', {
      body: '{}',
      headers: { 'Content-Type': 'application/json', 'Cookie': 'homeserver-session=abc' },
      method: 'POST',
    })
  })
})
