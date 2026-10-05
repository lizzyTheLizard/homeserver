import { afterEach, describe, expect, test, vi } from 'vitest'
import { loadMessages } from './server'
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

vi.mock('next/headers', () => ({ cookies: vi.fn() }))

const { mockWarn } = vi.hoisted(() => ({ mockWarn: vi.fn<(message: string) => void>() }))

vi.mock('@/app/shared/logger', () => ({ logger: { warn: mockWarn, error: vi.fn(), info: vi.fn(), debug: vi.fn() } }))

type ReadonlyRequestCookies = Awaited<ReturnType<typeof cookies>>

const originalFetch = globalThis.fetch

afterEach(() => {
  vi.clearAllMocks()
  globalThis.fetch = originalFetch
})

describe('loadMessages', () => {
  test('logs the assistant URL when the assistant is unreachable', async ({ task }) => {
    const user: UserSession = { name: 'Test User', email: task.id, applications: ['startpage'] }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)
    vi.mocked(cookies).mockResolvedValue({ toString: () => 'homeserver-session=abc' } as unknown as ReadonlyRequestCookies)
    const cause = new Error('connect ECONNREFUSED 127.0.0.1:8500')
    globalThis.fetch = vi.fn().mockRejectedValue(new TypeError('fetch failed', { cause }))

    await expect(loadMessages('123@s.whatsapp.net')).rejects.toThrow('fetch failed')

    expect(mockWarn).toHaveBeenCalledTimes(1)
    expect(mockWarn.mock.calls[0][0]).toContain('http://dev-machine:8500/whatsapp/messages?chatId=123%40s.whatsapp.net')
    expect(mockWarn.mock.calls[0][0]).toContain('ECONNREFUSED')
  })
})
