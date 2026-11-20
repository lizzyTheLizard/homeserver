import type { IncomingMessage, ServerResponse } from 'http'
import { type MicrosoftCalendarEvent, getMicrosoftCalendarWorker } from './calendar';
import { type MicrosoftMessageFull, type MicrosoftMessageListItem, getMicrosoftMailWorker } from './mail';
import type { MicrosoftStatus, SerializedCalendarEvent, SerializedMessageFull, SerializedMessageListItem, SerializedTodoTask } from './types'
import { type MicrosoftTodoTask, getMicrosoftTodoWorker } from './todo';
import { type UserSession, getUserSession, parseCookieHeader } from '../session'
import { getUserInfo, handleMicrosoftLoginCallback } from './graph'
import { Temporal } from '@js-temporal/polyfill'
import { deleteMicrosoftToken } from './data'
import { logger } from '../logger'
import { transactional } from '../db'

export async function handleMicrosoftApi(req: IncomingMessage, res: ServerResponse, pathname: string): Promise<boolean> {
  if (!pathname.startsWith('/microsoft')) {return false}
  try {
    const user = await authenticate(req),
     handled = await route(user, req, res, pathname)
    if (!handled) {
      sendJson(res, 404, { error: 'Not found' })
    }
    return true
  }
  catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unauthorized'
    logger.warn(`Microsoft API auth error: ${message}`)
    sendJson(res, 401, { error: message })
    return true
  }
}

async function authenticate(req: IncomingMessage): Promise<UserSession> {
  const cookieHeader = req.headers.cookie ?? '',
   cookies = parseCookieHeader(cookieHeader)
  return await getUserSession(cookies)
}

async function route(user: UserSession, req: IncomingMessage, res: ServerResponse, pathname: string): Promise<boolean> {
  const method = req.method ?? 'GET'

  if (pathname === '/microsoft/status' && method === 'GET') {
    const status = await loadMicrosoftStatus(user)
    sendJson(res, 200, status)
    return true
  }

  if (pathname === '/microsoft/check-status' && method === 'GET') {
    const status = await checkMicrosoftStatus(user)
    sendJson(res, 200, status)
    return true
  }

  if (pathname === '/microsoft/mail/messages' && method === 'GET') {
    const url = new URL(req.url ?? '', `http://${req.headers.host ?? 'localhost'}`),
     messageId = url.searchParams.get('id')
    if (!messageId) {
      sendJson(res, 400, { error: 'Missing message id' })
      return true
    }
    const msg = await loadMessage(user, messageId)
    if (!msg) {
      sendJson(res, 404, { error: 'Message not found' })
      return true
    }
    sendJson(res, 200, msg)
    return true
  }

  if (pathname === '/microsoft/mail/send' && method === 'POST') {
    const body = await readJson(req, { body: '', subject: '', to: [] as string[] }),
     worker = await getMicrosoftMailWorker(user)
    await worker.sendMail(user, body.to, body.subject, body.body)
    sendJson(res, 200, { success: true })
    return true
  }

  if (pathname === '/microsoft/mail/archive' && method === 'POST') {
    const body = await readJson(req, { messageId: '' }),
     worker = await getMicrosoftMailWorker(user)
    await worker.archiveMessage(user, body.messageId)
    sendJson(res, 200, { success: true })
    return true
  }

  if (pathname === '/microsoft/mail/archive-sender' && method === 'POST') {
    const body = await readJson(req, { senderEmail: '' }),
     worker = await getMicrosoftMailWorker(user),
     count = await worker.archiveMessagesFromSender(user, body.senderEmail)
    sendJson(res, 200, { count })
    return true
  }

  if (pathname === '/microsoft/todo/lists' && method === 'GET') {
    const worker = await getMicrosoftTodoWorker(user)
    sendJson(res, 200, worker.getTodoLists())
    return true
  }

  if (pathname === '/microsoft/todo/tasks' && method === 'GET') {
    const worker = await getMicrosoftTodoWorker(user),
     tasks = worker.getAllTasks().filter(t => t.status !== 'completed').map(serializeTodoTask)
    sendJson(res, 200, tasks)
    return true
  }

  if (pathname === '/microsoft/todo/tasks' && method === 'POST') {
    const body = await readJson(req, { body: undefined as string | undefined, listId: '', reminderDateTime: undefined as string | undefined, title: '' }),
     worker = await getMicrosoftTodoWorker(user),
     reminder = body.reminderDateTime ? Temporal.Instant.from(body.reminderDateTime) : undefined,
     result = await worker.createTask(user, body.listId, body.title, body.body, reminder)
    sendJson(res, 200, serializeTodoTask(result))
    return true
  }

  if (pathname === '/microsoft/todo/tasks/complete' && method === 'POST') {
    const body = await readJson(req, { listId: '', taskId: '' }),
     worker = await getMicrosoftTodoWorker(user)
    await worker.completeTask(user, body.listId, body.taskId)
    sendJson(res, 200, { success: true })
    return true
  }

  if (pathname === '/microsoft/todo/tasks/update' && method === 'POST') {
    const body = await readJson(req, { listId: '', taskId: '', updates: {} }),
     worker = await getMicrosoftTodoWorker(user),
     updates = parseTodoUpdates(body.updates),
     result = await worker.updateTask(user, body.listId, body.taskId, updates)
    sendJson(res, 200, serializeTodoTask(result))
    return true
  }

  if (pathname === '/microsoft/todo/tasks/delete' && method === 'POST') {
    const body = await readJson(req, { listId: '', taskId: '' }),
     worker = await getMicrosoftTodoWorker(user)
    await worker.deleteTask(user, body.listId, body.taskId)
    sendJson(res, 200, { success: true })
    return true
  }

  if (pathname === '/microsoft/calendar/calendars' && method === 'GET') {
    const worker = await getMicrosoftCalendarWorker(user)
    sendJson(res, 200, worker.getCalendars())
    return true
  }

  if (pathname === '/microsoft/calendar/events' && method === 'GET') {
    const url = new URL(req.url ?? '', `http://${req.headers.host ?? 'localhost'}`),
     startParam = url.searchParams.get('startDateTime'),
     endParam = url.searchParams.get('endDateTime'),
     start = startParam ? Temporal.Instant.from(startParam) : undefined,
     end = endParam ? Temporal.Instant.from(endParam) : undefined,
     worker = await getMicrosoftCalendarWorker(user),
     events = worker.getAllEvents(start, end).map(serializeCalendarEvent)
    sendJson(res, 200, events)
    return true
  }

  if (pathname === '/microsoft/calendar/events' && method === 'POST') {
    const body = await readJson(req, { body: undefined as string | undefined, calendarId: '', endDateTime: '', location: undefined as string | undefined, startDateTime: '', subject: '' }),
     worker = await getMicrosoftCalendarWorker(user),
     start = Temporal.Instant.from(body.startDateTime),
     end = Temporal.Instant.from(body.endDateTime),
     result = await worker.createEvent(user, body.calendarId, body.subject, start, end, body.body, body.location)
    sendJson(res, 200, serializeCalendarEvent(result))
    return true
  }

  if (pathname === '/microsoft/callback' && method === 'POST') {
    const body = await readJson(req, { callbackUrl: '' })
    await handleMicrosoftLoginCallback(user, new URL(body.callbackUrl))
    sendJson(res, 200, { success: true })
    return true
  }

  if (pathname === '/microsoft/disconnect' && method === 'POST') {
    await transactional(async (db) => {
      await deleteMicrosoftToken(db, user.email)
    })
    sendJson(res, 200, { success: true })
    return true
  }

  if (pathname === '/microsoft/login-url' && method === 'GET') {
    const url = new URL(req.url ?? '', `http://${req.headers.host ?? 'localhost'}`),
     callbackUrl = url.searchParams.get('callbackUrl')
    if (!callbackUrl) {
      sendJson(res, 400, { error: 'Missing callbackUrl' })
      return true
    }
    const redirectUrl = await getLoginRedirectUrl(callbackUrl)
    sendJson(res, 200, { url: redirectUrl.href })
    return true
  }

  return false
}

async function loadMicrosoftStatus(user: UserSession): Promise<MicrosoftStatus> {
  const userInfo = await getUserInfo(user)
  if (!userInfo) {return { calendarStatus: 'connecting', connected: false, events: [], mailStatus: 'connecting', messages: [], todoStatus: 'connecting', todos: [] }}
  const [mailWorker, todoWorker, calendarWorker] = await Promise.all([
    getMicrosoftMailWorker(user),
    getMicrosoftTodoWorker(user),
    getMicrosoftCalendarWorker(user),
  ]),
   mailStatus = mailWorker.getStatus(),
   todoStatus = todoWorker.getStatus(),
   calendarStatus = calendarWorker.getStatus(),
   allConnected = mailStatus === 'connected' && todoStatus === 'connected' && calendarStatus === 'connected'
  if (!allConnected) {
    return { calendarStatus, connected: true, events: [], mailStatus, messages: [], todoStatus, todos: [], userInfo }
  }
  const messages = mailWorker.getInboxMessages().map(serializeMessageListItem),
   todos = todoWorker.getAllTasks().filter(t => t.status !== 'completed').map(serializeTodoTask),
   events = calendarWorker.getAllEvents().map(serializeCalendarEvent)
  return { calendarStatus, connected: true, events, mailStatus, messages, todoStatus, todos, userInfo }
}

async function checkMicrosoftStatus(user: UserSession): Promise<{ mailStatus: string, todoStatus: string, calendarStatus: string }> {
  const userInfo = await getUserInfo(user)
  if (!userInfo) {return { calendarStatus: 'connecting', mailStatus: 'connecting', todoStatus: 'connecting' }}
  const [mailStatus, todoStatus, calendarStatus] = await Promise.all([
    getMicrosoftMailWorker(user).then(w => w.getStatus()),
    getMicrosoftTodoWorker(user).then(w => w.getStatus()),
    getMicrosoftCalendarWorker(user).then(w => w.getStatus()),
  ])
  return { calendarStatus, mailStatus, todoStatus }
}

async function loadMessage(user: UserSession, messageId: string): Promise<SerializedMessageFull | undefined> {
  const mailWorker = await getMicrosoftMailWorker(user),
   msg = await mailWorker.getMessage(messageId)
  if (!msg) {return undefined}
  return serializeMessageFull(msg)
}

function serializeCalendarEvent(event: MicrosoftCalendarEvent): SerializedCalendarEvent {
  return {
    body: event.body,
    bodyPreview: event.bodyPreview,
    calendarName: event.calendarName,
    createdDateTime: event.createdDateTime.toString(),
    end: event.end.toString(),
    id: event.id,
    importance: event.importance,
    isAllDay: event.isAllDay,
    isCancelled: event.isCancelled,
    lastModifiedDateTime: event.lastModifiedDateTime.toString(),
    location: event.location,
    organizer: event.organizer,
    sensitivity: event.sensitivity,
    showAs: event.showAs,
    start: event.start.toString(),
    subject: event.subject,
  }
}

function serializeTodoTask(task: MicrosoftTodoTask): SerializedTodoTask {
  return {
    body: task.body,
    createdDateTime: task.createdDateTime.toString(),
    dueDate: task.dueDate?.toString(),
    id: task.id,
    importance: task.importance,
    lastModifiedDateTime: task.lastModifiedDateTime.toString(),
    listName: task.listName,
    reminderDateTime: task.reminderDateTime?.toString(),
    status: task.status,
    title: task.title,
  }
}

function serializeMessageListItem(msg: MicrosoftMessageListItem): SerializedMessageListItem {
  return {
    bodyPreview: msg.bodyPreview,
    from: msg.from,
    id: msg.id,
    inferenceClassification: msg.inferenceClassification,
    isRead: msg.isRead,
    receivedDateTime: msg.receivedDateTime.toString(),
    subject: msg.subject,
    toRecipients: msg.toRecipients,
  }
}

function serializeMessageFull(msg: MicrosoftMessageFull): SerializedMessageFull {
  return {
    ...serializeMessageListItem(msg),
    body: msg.body,
  }
}

function parseTodoUpdates(updates: Record<string, unknown>): { title?: string, body?: string, reminderDateTime?: Temporal.Instant, listId?: string } {
  const result: { title?: string, body?: string, reminderDateTime?: Temporal.Instant, listId?: string } = {}
  if (typeof updates.title === 'string') {result.title = updates.title}
  if (typeof updates.body === 'string') {result.body = updates.body}
  if (typeof updates.listId === 'string') {result.listId = updates.listId}
  if (typeof updates.reminderDateTime === 'string') {result.reminderDateTime = Temporal.Instant.from(updates.reminderDateTime)}
  return result
}

function sendJson(res: ServerResponse, status: number, data: unknown): void {
  res.writeHead(status, { 'Content-Type': 'application/json' }).end(JSON.stringify(data))
}

async function readJson<T>(req: IncomingMessage, defaults: T): Promise<T> {
  return new Promise((resolve, reject) => {
    let body = ''
    req.on('data', (chunk: Buffer) => { body += chunk.toString() })
    req.on('end', () => {
      try {
        const parsed = body ? JSON.parse(body) as T : defaults
        resolve({ ...defaults, ...parsed })
      }
      catch (error) {
        reject(error instanceof Error ? error : new Error(String(error)))
      }
    })
    req.on('error', reject)
  })
}

async function getLoginRedirectUrl(callbackUrl: string): Promise<URL> {
  const { getLoginRedirectUrl: getUrl } = await import('./graph')
  return getUrl(callbackUrl)
}
