import type { UserSession } from '@/app/shared/auth/session'
import { getUserInfo } from './graph'
import type { MicrosoftMessageFull, MicrosoftMessageListItem } from './mail'
import { getMicrosoftMailWorker } from './mail'
import type { MicrosoftTodoTask } from './todo'
import { getMicrosoftTodoWorker } from './todo'
import type { MicrosoftCalendarEvent } from './calendar'
import { getMicrosoftCalendarWorker } from './calendar'
import type {
  MicrosoftConnectionStatus,
  MicrosoftStatus,
  SerializedCalendarEvent,
  SerializedMessageFull,
  SerializedMessageListItem,
  SerializedTodoTask,
} from './types'

export async function readMicrosoftStatus(user: UserSession): Promise<MicrosoftStatus> {
  const userInfo = await getUserInfo(user)
  if (!userInfo) {
    return {
      connected: false,
      mailStatus: 'connecting',
      todoStatus: 'connecting',
      calendarStatus: 'connecting',
      messages: [],
      todos: [],
      events: [],
    }
  }
  const [mailWorker, todoWorker, calendarWorker] = await Promise.all([
    getMicrosoftMailWorker(user),
    getMicrosoftTodoWorker(user),
    getMicrosoftCalendarWorker(user),
  ])
  const mailStatus = mailWorker.getStatus()
  const todoStatus = todoWorker.getStatus()
  const calendarStatus = calendarWorker.getStatus()
  const allConnected = mailStatus === 'connected' && todoStatus === 'connected' && calendarStatus === 'connected'
  if (!allConnected) return { connected: true, userInfo, mailStatus, todoStatus, calendarStatus, messages: [], todos: [], events: [] }

  const messages = mailWorker.getInboxMessages().map(serializeMessageListItem)
  const todos = todoWorker
    .getAllTasks()
    .filter(t => t.status !== 'completed')
    .map(serializeTodoTask)
  const events = calendarWorker.getAllEvents().map(serializeCalendarEvent)
  return { connected: true, userInfo, mailStatus, todoStatus, calendarStatus, messages, todos, events }
}

export async function readMicrosoftConnectionStatus(user: UserSession): Promise<MicrosoftConnectionStatus> {
  const userInfo = await getUserInfo(user)
  if (!userInfo) return { mailStatus: 'connecting', todoStatus: 'connecting', calendarStatus: 'connecting' }
  const [mailStatus, todoStatus, calendarStatus] = await Promise.all([
    getMicrosoftMailWorker(user).then(w => w.getStatus()),
    getMicrosoftTodoWorker(user).then(w => w.getStatus()),
    getMicrosoftCalendarWorker(user).then(w => w.getStatus()),
  ])
  return { mailStatus, todoStatus, calendarStatus }
}

export async function readMicrosoftMessage(user: UserSession, messageId: string): Promise<SerializedMessageFull | undefined> {
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
