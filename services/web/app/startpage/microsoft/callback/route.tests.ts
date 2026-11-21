import { afterEach, describe, expect, test, vi } from 'vitest'
import type { NextRequest } from 'next/server'

const { mockCallback, mockUser } = vi.hoisted(() => ({ mockCallback: vi.fn(), mockUser: { name: 'A', email: 'a@test.com', applications: ['startpage'] } }))

vi.mock('@/app/shared/auth/auth', () => ({ getAuthenticatedUserSession: vi.fn(() => Promise.resolve(mockUser)) }))
vi.mock('@/app/shared/logger', () => ({ logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() } }))
vi.mock('../_external/graph', () => ({ handleMicrosoftLoginCallback: mockCallback }))

import { GET as handler } from './route'

afterEach(() => {
  vi.clearAllMocks()
})

function request(): NextRequest {
  return new Request('http://localhost:3000/startpage/microsoft/callback?code=abc') as NextRequest
}

describe('GET /startpage/microsoft/callback', () => {
  test('completes the connection for the signed-in user and redirects to the Microsoft page', async () => {
    mockCallback.mockResolvedValue(undefined)

    const response = await handler(request())

    expect(mockCallback).toHaveBeenCalledWith(mockUser, expect.objectContaining({ search: '?code=abc' }))
    expect(response.headers.get('location')).toMatch(/\/startpage\/microsoft$/)
  })

  test('redirects with an error when the exchange fails', async () => {
    mockCallback.mockRejectedValue(new Error('invalid grant'))

    const response = await handler(request())

    expect(response.headers.get('location')).toMatch(/\/startpage\/microsoft\?error=microsoft_callback_failed$/)
  })
})
