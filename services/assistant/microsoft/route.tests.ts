import { beforeEach, describe, expect, test, vi } from 'vitest'
import { EventEmitter } from 'events'
import { Temporal } from '@js-temporal/polyfill'
import { handleMicrosoftApi } from './route'
import type { UserSession } from '../session'

const { mockGetSession, mockGetUserInfo, mockGetMicrosoftMailWorker, mockGetMicrosoftTodoWorker, mockGetMicrosoftCalendarWorker } = vi.hoisted(() => ({
  mockGetMicrosoftCalendarWorker: vi.fn(),
  mockGetMicrosoftMailWorker: vi.fn(),
  mockGetMicrosoftTodoWorker: vi.fn(),
  mockGetSession: vi.fn(),
  mockGetUserInfo: vi.fn(),
})),

 mockUser: UserSession = { applications: ['startpage'], email: 'test@test.com', name: 'Test' }

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
    const req = createRequest('GET', '/health'),
     res = createResponse(),
     handled = await handleMicrosoftApi(req as never, res as never, '/health')
    expect(handled).toBe(false)
  })

  test('returns 401 when session is missing', async () => {
    mockGetSession.mockRejectedValue(new Error('No authenticated user session found'))
    const req = createRequest('GET', '/microsoft/status'),
     res = createResponse(),
     handled = await handleMicrosoftApi(req as never, res as never, '/microsoft/status')
    expect(handled).toBe(true)
    expect(res.writeHead).toHaveBeenCalledWith(401, { 'Content-Type': 'application/json' })
  })

  test('GET /microsoft/status returns status', async () => {
    mockGetUserInfo.mockResolvedValue({ displayName: 'Test', id: '1', mail: 'test@test.com', userPrincipalName: 'test@test.com' })
    mockGetMicrosoftMailWorker.mockResolvedValue({ archiveMessage: () => Promise.resolve(), archiveMessagesFromSender: () => Promise.resolve(0), getInboxCount: () => ({ focused: 0, focusedUnread: 0, other: 0, otherUnread: 0 }), getInboxMessages: () => [], getMessage: () => Promise.resolve(undefined), getStatus: () => 'connected', sendMail: () => Promise.resolve(), touch: () => { /* Mock */ } })
    mockGetMicrosoftTodoWorker.mockResolvedValue({ completeTask: () => Promise.resolve(), createTask: () => Promise.reject(new Error('not implemented')), deleteTask: () => Promise.resolve(), getAllTasks: () => [], getStatus: () => 'connected', getTasks: () => [], getTodoCount: () => ({ tasksDueRestOfWeek: 0, tasksDueToday: 0, tasksWithoutDate: 0 }), getTodoLists: () => [], touch: () => { /* Mock */ }, updateTask: () => Promise.reject(new Error('not implemented')) })
    mockGetMicrosoftCalendarWorker.mockResolvedValue({ createEvent: () => Promise.reject(new Error('not implemented')), getAllEvents: () => [], getCalendars: () => [], getEventCount: () => ({ eventsThisWeek: 0, eventsToday: 0 }), getStatus: () => 'connected', touch: () => { /* Mock */ } })

    const req = createRequest('GET', '/microsoft/status'),
     res = createResponse()
    await handleMicrosoftApi(req as never, res as never, '/microsoft/status')

    expect(res.writeHead).toHaveBeenCalledWith(200, { 'Content-Type': 'application/json' })
    expect(res.end).toHaveBeenCalled()
  })

  test('POST /microsoft/mail/send sends mail', async () => {
    const sendMail = vi.fn().mockResolvedValue(undefined)
    mockGetMicrosoftMailWorker.mockResolvedValue({ archiveMessage: () => Promise.resolve(), archiveMessagesFromSender: () => Promise.resolve(0), getInboxCount: () => ({ focused: 0, focusedUnread: 0, other: 0, otherUnread: 0 }), getInboxMessages: () => [], getMessage: () => Promise.resolve(undefined), getStatus: () => 'connected', sendMail, touch: () => { /* Mock */ } })

    const req = createRequest('POST', '/microsoft/mail/send', { body: 'Hello', subject: 'Hi', to: ['to@example.com'] }),
     res = createResponse()
    await handleMicrosoftApi(req as never, res as never, '/microsoft/mail/send')

    expect(sendMail).toHaveBeenCalledWith(mockUser, ['to@example.com'], 'Hi', 'Hello')
    expect(res.writeHead).toHaveBeenCalledWith(200, { 'Content-Type': 'application/json' })
  })

  test('POST /microsoft/calendar/events creates event', async () => {
    const start = Temporal.Now.instant(),
     end = start.add({ hours: 1 }),
     createdEvent = {
      body: { content: '', contentType: 'text' as const },
      bodyPreview: '',
      createdDateTime: start,
      end,
      id: 'evt-1',
      importance: 'normal' as const,
      isAllDay: false,
      isCancelled: false,
      lastModifiedDateTime: start,
      location: { displayName: '', uniqueIdType: '' },
      organizer: { emailAddress: { address: '', name: '' } },
      sensitivity: 'normal' as const,
      showAs: 'busy' as const,
      start,
      subject: 'Meeting',
    },
     createEvent = vi.fn().mockResolvedValue(createdEvent)
    mockGetMicrosoftCalendarWorker.mockResolvedValue({ createEvent, getAllEvents: () => [], getCalendars: () => [], getEventCount: () => ({ eventsThisWeek: 0, eventsToday: 0 }), getStatus: () => 'connected', touch: () => { /* Mock */ } })

    const req = createRequest('POST', '/microsoft/calendar/events', { calendarId: 'cal-1', endDateTime: end.toString(), startDateTime: start.toString(), subject: 'Meeting' }),
     res = createResponse()
    await handleMicrosoftApi(req as never, res as never, '/microsoft/calendar/events')

    expect(createEvent).toHaveBeenCalledWith(mockUser, 'cal-1', 'Meeting', start, end, undefined, undefined)
    expect(res.writeHead).toHaveBeenCalledWith(200, { 'Content-Type': 'application/json' })
  })
})
