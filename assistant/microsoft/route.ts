import { IncomingMessage, ServerResponse } from 'http'
import { Temporal } from '@js-temporal/polyfill'
import { getSession, parseCookieHeader, UserSession } from '@/app/shared/auth/session'
import { logger } from '@/app/shared/logger'
import { getUserInfo, handleMicrosoftLoginCallback } from './graph'
import { getMicrosoftMailWorker, MicrosoftMessageFull, MicrosoftMessageListItem } from './mail'
import { getMicrosoftTodoWorker, MicrosoftTodoTask } from './todo'
import { getMicrosoftCalendarWorker, MicrosoftCalendarEvent } from './calendar'
import { deleteMicrosoftToken } from './data'
import { transactional } from '@/app/shared/_external/db/access'
import { logEvent } from '@/app/shared/_data/Event'
import { MicrosoftStatus, SerializedCalendarEvent, SerializedMessageFull, SerializedMessageListItem, SerializedTodoTask } from '@/app/startpage/microsoft/types'

export async function handleMicrosoftApi(req: IncomingMessage, res: ServerResponse, pathname: string): Promise<boolean> {
  if (!pathname.startsWith('/microsoft')) return false
  try {
    const user = await authenticate(req)
    const handled = await route(user, req, res, pathname)
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
  const cookieHeader = req.headers.cookie ?? ''
  const cookies = parseCookieHeader(cookieHeader)
  const session = await getSession(cookies)
  if (!session.userInfo) throw new Error('No authenticated user session found')
  return session.userInfo
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
    const url = new URL(req.url ?? '', `http://${req.headers.host ?? 'localhost'}`)
    const messageId = url.searchParams.get('id')
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
    const body = await readJson(req, { to: [] as string[], subject: '', body: '' })
    const worker = await getMicrosoftMailWorker(user)
    await worker.sendMail(user, body.to, body.subject, body.body)
    sendJson(res, 200, { success: true })
    return true
  }

  if (pathname === '/microsoft/mail/archive' && method === 'POST') {
    const body = await readJson(req, { messageId: '' })
    const worker = await getMicrosoftMailWorker(user)
    await worker.archiveMessage(user, body.messageId)
    sendJson(res, 200, { success: true })
    return true
  }

  if (pathname === '/microsoft/mail/archive-sender' && method === 'POST') {
    const body = await readJson(req, { senderEmail: '' })
    const worker = await getMicrosoftMailWorker(user)
    const count = await worker.archiveMessagesFromSender(user, body.senderEmail)
    sendJson(res, 200, { count })
    return true
  }

  if (pathname === '/microsoft/todo/lists' && method === 'GET') {
    const worker = await getMicrosoftTodoWorker(user)
    sendJson(res, 200, worker.getTodoLists())
    return true
  }

  if (pathname === '/microsoft/todo/tasks' && method === 'GET') {
    const worker = await getMicrosoftTodoWorker(user)
    const tasks = worker.getAllTasks().filter(t => t.status !== 'completed').map(serializeTodoTask)
    sendJson(res, 200, tasks)
    return true
  }

  if (pathname === '/microsoft/todo/tasks' && method === 'POST') {
    const body = await readJson(req, { listId: '', title: '', body: undefined as string | undefined, reminderDateTime: undefined as string | undefined })
    const worker = await getMicrosoftTodoWorker(user)
    const reminder = body.reminderDateTime ? Temporal.Instant.from(body.reminderDateTime) : undefined
    const result = await worker.createTask(user, body.listId, body.title, body.body, reminder)
    sendJson(res, 200, serializeTodoTask(result))
    return true
  }

  if (pathname === '/microsoft/todo/tasks/complete' && method === 'POST') {
    const body = await readJson(req, { listId: '', taskId: '' })
    const worker = await getMicrosoftTodoWorker(user)
    await worker.completeTask(user, body.listId, body.taskId)
    sendJson(res, 200, { success: true })
    return true
  }

  if (pathname === '/microsoft/todo/tasks/update' && method === 'POST') {
    const body = await readJson(req, { listId: '', taskId: '', updates: {} })
    const worker = await getMicrosoftTodoWorker(user)
    const updates = parseTodoUpdates(body.updates)
    const result = await worker.updateTask(user, body.listId, body.taskId, updates)
    sendJson(res, 200, serializeTodoTask(result))
    return true
  }

  if (pathname === '/microsoft/todo/tasks/delete' && method === 'POST') {
    const body = await readJson(req, { listId: '', taskId: '' })
    const worker = await getMicrosoftTodoWorker(user)
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
    const url = new URL(req.url ?? '', `http://${req.headers.host ?? 'localhost'}`)
    const startParam = url.searchParams.get('startDateTime')
    const endParam = url.searchParams.get('endDateTime')
    const start = startParam ? Temporal.Instant.from(startParam) : undefined
    const end = endParam ? Temporal.Instant.from(endParam) : undefined
    const worker = await getMicrosoftCalendarWorker(user)
    const events = worker.getAllEvents(start, end).map(serializeCalendarEvent)
    sendJson(res, 200, events)
    return true
  }

  if (pathname === '/microsoft/calendar/events' && method === 'POST') {
    const body = await readJson(req, { calendarId: '', subject: '', startDateTime: '', endDateTime: '', body: undefined as string | undefined, location: undefined as string | undefined })
    const worker = await getMicrosoftCalendarWorker(user)
    const start = Temporal.Instant.from(body.startDateTime)
    const end = Temporal.Instant.from(body.endDateTime)
    const result = await worker.createEvent(user, body.calendarId, body.subject, start, end, body.body, body.location)
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
      await logEvent(db, 'INFO', `Microsoft token deleted for user ${user.email}`)
      await deleteMicrosoftToken(db, user.email)
    })
    sendJson(res, 200, { success: true })
    return true
  }

  if (pathname === '/microsoft/login-url' && method === 'GET') {
    const url = new URL(req.url ?? '', `http://${req.headers.host ?? 'localhost'}`)
    const callbackUrl = url.searchParams.get('callbackUrl')
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
  if (!userInfo) return { connected: false, mailStatus: 'connecting', todoStatus: 'connecting', calendarStatus: 'connecting', messages: [], todos: [], events: [] }
  const [mailWorker, todoWorker, calendarWorker] = await Promise.all([
    getMicrosoftMailWorker(user),
    getMicrosoftTodoWorker(user),
    getMicrosoftCalendarWorker(user),
  ])
  const mailStatus = mailWorker.getStatus()
  const todoStatus = todoWorker.getStatus()
  const calendarStatus = calendarWorker.getStatus()
  const allConnected = mailStatus === 'connected' && todoStatus === 'connected' && calendarStatus === 'connected'
  if (!allConnected) {
    return { connected: true, userInfo, mailStatus, todoStatus, calendarStatus, messages: [], todos: [], events: [] }
  }
  const messages = mailWorker.getInboxMessages().map(serializeMessageListItem)
  const todos = todoWorker.getAllTasks().filter(t => t.status !== 'completed').map(serializeTodoTask)
  const events = calendarWorker.getAllEvents().map(serializeCalendarEvent)
  return { connected: true, userInfo, mailStatus, todoStatus, calendarStatus, messages, todos, events }
}

async function checkMicrosoftStatus(user: UserSession): Promise<{ mailStatus: string, todoStatus: string, calendarStatus: string }> {
  const userInfo = await getUserInfo(user)
  if (!userInfo) return { mailStatus: 'connecting', todoStatus: 'connecting', calendarStatus: 'connecting' }
  const [mailStatus, todoStatus, calendarStatus] = await Promise.all([
    getMicrosoftMailWorker(user).then(w => w.getStatus()),
    getMicrosoftTodoWorker(user).then(w => w.getStatus()),
    getMicrosoftCalendarWorker(user).then(w => w.getStatus()),
  ])
  return { mailStatus, todoStatus, calendarStatus }
}

async function loadMessage(user: UserSession, messageId: string): Promise<SerializedMessageFull | undefined> {
  const mailWorker = await getMicrosoftMailWorker(user)
  const msg = await mailWorker.getMessage(messageId)
  if (!msg) return undefined
  return serializeMessageFull(msg)
}

function serializeCalendarEvent(event: MicrosoftCalendarEvent): SerializedCalendarEvent {
  return {
    id: event.id,
    subject: event.subject,
    bodyPreview: event.bodyPreview,
    body: event.body,
    start: event.start.toString(),
    end: event.end.toString(),
    location: event.location,
    isAllDay: event.isAllDay,
    isCancelled: event.isCancelled,
    showAs: event.showAs,
    importance: event.importance,
    sensitivity: event.sensitivity,
    createdDateTime: event.createdDateTime.toString(),
    lastModifiedDateTime: event.lastModifiedDateTime.toString(),
    organizer: event.organizer,
    calendarName: event.calendarName,
  }
}

function serializeTodoTask(task: MicrosoftTodoTask): SerializedTodoTask {
  return {
    id: task.id,
    title: task.title,
    status: task.status,
    body: task.body,
    dueDate: task.dueDate?.toString(),
    reminderDateTime: task.reminderDateTime?.toString(),
    createdDateTime: task.createdDateTime.toString(),
    lastModifiedDateTime: task.lastModifiedDateTime.toString(),
    importance: task.importance,
    listName: task.listName,
  }
}

function serializeMessageListItem(msg: MicrosoftMessageListItem): SerializedMessageListItem {
  return {
    id: msg.id,
    subject: msg.subject,
    from: msg.from,
    toRecipients: msg.toRecipients,
    receivedDateTime: msg.receivedDateTime.toString(),
    isRead: msg.isRead,
    bodyPreview: msg.bodyPreview,
    inferenceClassification: msg.inferenceClassification,
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
  if (typeof updates.title === 'string') result.title = updates.title
  if (typeof updates.body === 'string') result.body = updates.body
  if (typeof updates.listId === 'string') result.listId = updates.listId
  if (typeof updates.reminderDateTime === 'string') result.reminderDateTime = Temporal.Instant.from(updates.reminderDateTime)
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
