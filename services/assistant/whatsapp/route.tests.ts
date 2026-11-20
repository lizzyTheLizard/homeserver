import { describe, expect, test, vi, beforeEach } from 'vitest'
import { EventEmitter } from 'events'
import { handleWhatsappApi } from './route'
import type { UserSession } from '../session'

const { mockGetSession, mockGetWhatsappStatus, mockGetWhatsappChats } = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
  mockGetWhatsappStatus: vi.fn(),
  mockGetWhatsappChats: vi.fn(),
}))

const mockUser: UserSession = { name: 'Test', email: 'test@test.com', applications: ['startpage'] }

vi.mock('../session', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../session')>()
  return {
    ...actual,
    getUserSession: mockGetSession as typeof import('../session').getUserSession,
  }
})

vi.mock('./whatsapp', () => ({
  getWhatsappStatus: mockGetWhatsappStatus as typeof import('./whatsapp').getWhatsappStatus,
  getWhatsappChats: mockGetWhatsappChats as typeof import('./whatsapp').getWhatsappChats,
  getWhatsappMessages: vi.fn(),
  sendWhatsappMessage: vi.fn(),
  archiveWhatsappChat: vi.fn(),
  triggerWhatsappFullSync: vi.fn(),
}))

function createRequest(method: string, url: string, body?: unknown, cookie?: string): EventEmitter {
  const req = new EventEmitter() as EventEmitter & { method: string, url: string, headers: Record<string, string | undefined> }
  req.method = method
  req.url = url
  req.headers = cookie ? { cookie } : {}
  if (body) {
    process.nextTick(() => {
      req.emit('data', Buffer.from(JSON.stringify(body)))
      req.emit('end')
    })
  }
  else {
    process.nextTick(() => { req.emit('end') })
  }
  return req
}

function createResponse(): EventEmitter & { writeHead: ReturnType<typeof vi.fn>, end: ReturnType<typeof vi.fn>, statusCode?: number } {
  const res = new EventEmitter() as EventEmitter & { writeHead: ReturnType<typeof vi.fn>, end: ReturnType<typeof vi.fn>, statusCode?: number }
  res.writeHead = vi.fn().mockReturnValue(res)
  res.end = vi.fn().mockReturnValue(res)
  return res
}

describe('handleWhatsappApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetSession.mockResolvedValue(mockUser)
  })

  test('returns false for non-whatsapp paths', async () => {
    const req = createRequest('GET', '/health')
    const res = createResponse()
    const handled = await handleWhatsappApi(req as never, res as never, '/health')
    expect(handled).toBe(false)
  })

  test('GET /whatsapp/status returns status', async () => {
    mockGetWhatsappStatus.mockResolvedValue({ type: 'connected' })
    const req = createRequest('GET', '/whatsapp/status')
    const res = createResponse()
    await handleWhatsappApi(req as never, res as never, '/whatsapp/status')
    expect(res.writeHead).toHaveBeenCalledWith(200, { 'Content-Type': 'application/json' })
  })

  test('GET /whatsapp/chats returns chats', async () => {
    mockGetWhatsappChats.mockResolvedValue([])
    const req = createRequest('GET', '/whatsapp/chats')
    const res = createResponse()
    await handleWhatsappApi(req as never, res as never, '/whatsapp/chats')
    expect(res.writeHead).toHaveBeenCalledWith(200, { 'Content-Type': 'application/json' })
  })
})
