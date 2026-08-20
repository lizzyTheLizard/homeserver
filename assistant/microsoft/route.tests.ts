import { describe, expect, test, vi, beforeEach } from 'vitest'
import { EventEmitter } from 'events'
import { Temporal } from '@js-temporal/polyfill'
import { handleMicrosoftApi } from './route'
import type { UserSession } from '../session'

const { mockGetSession, mockGetUserInfo, mockGetMicrosoftMailWorker, mockGetMicrosoftTodoWorker, mockGetMicrosoftCalendarWorker } = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
  mockGetUserInfo: vi.fn(),
  mockGetMicrosoftMailWorker: vi.fn(),
  mockGetMicrosoftTodoWorker: vi.fn(),
  mockGetMicrosoftCalendarWorker: vi.fn(),
}))

const mockUser: UserSession = { name: 'Test', email: 'test@test.com', applications: ['startpage'] }

vi.mock('../session', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../session')>()
  return {
    ...actual,
    getUserSession: mockGetSession as typeof import('../session').getUserSession,
  }
})

vi.mock('./graph', () => ({
  getUserInfo: mockGetUserInfo as typeof import('./graph').getUserInfo,
  handleMicrosoftLoginCallback: vi.fn(),
}))

vi.mock('./mail', () => ({
  getMicrosoftMailWorker: mockGetMicrosoftMailWorker as typeof import('./mail').getMicrosoftMailWorker,
}))

vi.mock('./todo', () => ({
  getMicrosoftTodoWorker: mockGetMicrosoftTodoWorker as typeof import('./todo').getMicrosoftTodoWorker,
}))

vi.mock('./calendar', () => ({
  getMicrosoftCalendarWorker: mockGetMicrosoftCalendarWorker as typeof import('./calendar').getMicrosoftCalendarWorker,
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

describe('handleMicrosoftApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetSession.mockResolvedValue(mockUser)
  })

  test('returns false for non-microsoft paths', async () => {
    const req = createRequest('GET', '/health')
    const res = createResponse()
    const handled = await handleMicrosoftApi(req as never, res as never, '/health')
    expect(handled).toBe(false)
  })

  test('returns 401 when session is missing', async () => {
    mockGetSession.mockRejectedValue(new Error('No authenticated user session found'))
    const req = createRequest('GET', '/microsoft/status')
    const res = createResponse()
    const handled = await handleMicrosoftApi(req as never, res as never, '/microsoft/status')
    expect(handled).toBe(true)
    expect(res.writeHead).toHaveBeenCalledWith(401, { 'Content-Type': 'application/json' })
  })

  test('GET /microsoft/status returns status', async () => {
    mockGetUserInfo.mockResolvedValue({ id: '1', userPrincipalName: 'test@test.com', displayName: 'Test', mail: 'test@test.com' })
    mockGetMicrosoftMailWorker.mockResolvedValue({ getStatus: () => 'connected', getInboxMessages: () => [], getInboxCount: () => ({ focused: 0, focusedUnread: 0, other: 0, otherUnread: 0 }), getMessage: () => Promise.resolve(undefined), sendMail: () => Promise.resolve(), archiveMessage: () => Promise.resolve(), archiveMessagesFromSender: () => Promise.resolve(0), touch: () => { /* mock */ } })
    mockGetMicrosoftTodoWorker.mockResolvedValue({ getStatus: () => 'connected', getTodoCount: () => ({ tasksDueToday: 0, tasksDueRestOfWeek: 0, tasksWithoutDate: 0 }), getTodoLists: () => [], getTasks: () => [], getAllTasks: () => [], createTask: () => Promise.reject(new Error('not implemented')), updateTask: () => Promise.reject(new Error('not implemented')), completeTask: () => Promise.resolve(), deleteTask: () => Promise.resolve(), touch: () => { /* mock */ } })
    mockGetMicrosoftCalendarWorker.mockResolvedValue({ getStatus: () => 'connected', getCalendars: () => [], getAllEvents: () => [], getEventCount: () => ({ eventsToday: 0, eventsThisWeek: 0 }), createEvent: () => Promise.reject(new Error('not implemented')), touch: () => { /* mock */ } })

    const req = createRequest('GET', '/microsoft/status')
    const res = createResponse()
    await handleMicrosoftApi(req as never, res as never, '/microsoft/status')

    expect(res.writeHead).toHaveBeenCalledWith(200, { 'Content-Type': 'application/json' })
    expect(res.end).toHaveBeenCalled()
  })

  test('POST /microsoft/mail/send sends mail', async () => {
    const sendMail = vi.fn().mockResolvedValue(undefined)
    mockGetMicrosoftMailWorker.mockResolvedValue({ getStatus: () => 'connected', sendMail, getInboxMessages: () => [], getInboxCount: () => ({ focused: 0, focusedUnread: 0, other: 0, otherUnread: 0 }), getMessage: () => Promise.resolve(undefined), archiveMessage: () => Promise.resolve(), archiveMessagesFromSender: () => Promise.resolve(0), touch: () => { /* mock */ } })

    const req = createRequest('POST', '/microsoft/mail/send', { to: ['to@example.com'], subject: 'Hi', body: 'Hello' })
    const res = createResponse()
    await handleMicrosoftApi(req as never, res as never, '/microsoft/mail/send')

    expect(sendMail).toHaveBeenCalledWith(mockUser, ['to@example.com'], 'Hi', 'Hello')
    expect(res.writeHead).toHaveBeenCalledWith(200, { 'Content-Type': 'application/json' })
  })

  test('POST /microsoft/calendar/events creates event', async () => {
    const start = Temporal.Now.instant()
    const end = start.add({ hours: 1 })
    const createdEvent = {
      id: 'evt-1',
      subject: 'Meeting',
      bodyPreview: '',
      body: { contentType: 'text' as const, content: '' },
      start,
      end,
      location: { displayName: '', uniqueIdType: '' },
      isAllDay: false,
      isCancelled: false,
      showAs: 'busy' as const,
      importance: 'normal' as const,
      sensitivity: 'normal' as const,
      createdDateTime: start,
      lastModifiedDateTime: start,
      organizer: { emailAddress: { name: '', address: '' } },
    }
    const createEvent = vi.fn().mockResolvedValue(createdEvent)
    mockGetMicrosoftCalendarWorker.mockResolvedValue({ getStatus: () => 'connected', createEvent, getCalendars: () => [], getAllEvents: () => [], getEventCount: () => ({ eventsToday: 0, eventsThisWeek: 0 }), touch: () => { /* mock */ } })

    const req = createRequest('POST', '/microsoft/calendar/events', { calendarId: 'cal-1', subject: 'Meeting', startDateTime: start.toString(), endDateTime: end.toString() })
    const res = createResponse()
    await handleMicrosoftApi(req as never, res as never, '/microsoft/calendar/events')

    expect(createEvent).toHaveBeenCalledWith(mockUser, 'cal-1', 'Meeting', start, end, undefined, undefined)
    expect(res.writeHead).toHaveBeenCalledWith(200, { 'Content-Type': 'application/json' })
  })
})
