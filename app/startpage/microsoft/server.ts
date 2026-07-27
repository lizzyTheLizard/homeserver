'use server'
import { getAuthenticatedUserSession } from '@/app/shared/auth/auth'
import { getUserInfo, getLoginRedirectUrl, MicrosoftUserInfo } from '../_external/microsoft'
import { MicrosoftMessageListItem, MicrosoftMessageFull, getMicrosoftMailWorker } from '../_external/microsoft-mail'
import { MicrosoftTodoTask, getMicrosoftTodoWorker } from '../_external/microsoft-todo'
import { MicrosoftCalendarEvent, getMicrosoftCalendarWorker } from '../_external/microsoft-calendar'
import { ActionResponse, toResponse } from '@/app/shared/_helper/ActionResponse'
import { nontransactional, transactional } from '@/app/shared/_external/db/access'
import { deleteMicrosoftToken } from '../_data/Microsoft'
import { config } from '@/app/shared/config'
import { logEvent } from '@/app/shared/_data/Event'

const MICROSOFT_CALLBACK_PATH = '/startpage/microsoft/callback'

export type SerializedCalendarEvent = Omit<MicrosoftCalendarEvent, 'start' | 'end' | 'createdDateTime' | 'lastModifiedDateTime'> & {
  start: string
  end: string
  createdDateTime: string
  lastModifiedDateTime: string
}

export type SerializedTodoTask = Omit<MicrosoftTodoTask, 'dueDate' | 'reminderDateTime' | 'createdDateTime' | 'lastModifiedDateTime'> & {
  dueDate?: string
  reminderDateTime?: string
  createdDateTime: string
  lastModifiedDateTime: string
}

export type SerializedMessageListItem = Omit<MicrosoftMessageListItem, 'receivedDateTime'> & {
  receivedDateTime: string
}

export type SerializedMessageFull = SerializedMessageListItem & {
  body: { contentType: string, content: string }
}

export interface MicrosoftStatus {
  connected: boolean
  userInfo?: MicrosoftUserInfo
  mailStatus: string
  todoStatus: string
  calendarStatus: string
  messages: SerializedMessageListItem[]
  todos: SerializedTodoTask[]
  events: SerializedCalendarEvent[]
}

function serializeCalendarEvent(event: MicrosoftCalendarEvent): SerializedCalendarEvent {
  return {
    ...event,
    start: event.start.toString(),
    end: event.end.toString(),
    createdDateTime: event.createdDateTime.toString(),
    lastModifiedDateTime: event.lastModifiedDateTime.toString(),
  }
}

function serializeTodoTask(task: MicrosoftTodoTask): SerializedTodoTask {
  return {
    ...task,
    dueDate: task.dueDate?.toString(),
    reminderDateTime: task.reminderDateTime?.toString(),
    createdDateTime: task.createdDateTime.toString(),
    lastModifiedDateTime: task.lastModifiedDateTime.toString(),
  }
}

function serializeMessageListItem(msg: MicrosoftMessageListItem): SerializedMessageListItem {
  return {
    ...msg,
    receivedDateTime: msg.receivedDateTime.toString(),
  }
}

function serializeMessageFull(msg: MicrosoftMessageFull): SerializedMessageFull {
  return {
    ...serializeMessageListItem(msg),
    body: msg.body,
  }
}

export async function loadMicrosoftStatus(): Promise<MicrosoftStatus> {
  const user = await getAuthenticatedUserSession('startpage')
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

export async function checkMicrosoftStatus(): Promise<{ mailStatus: string, todoStatus: string, calendarStatus: string }> {
  const user = await getAuthenticatedUserSession('startpage')
  const userInfo = await getUserInfo(user)
  if (!userInfo) return { mailStatus: 'connecting', todoStatus: 'connecting', calendarStatus: 'connecting' }
  const [mailStatus, todoStatus, calendarStatus] = await Promise.all([
    getMicrosoftMailWorker(user).then(w => w.getStatus()),
    getMicrosoftTodoWorker(user).then(w => w.getStatus()),
    getMicrosoftCalendarWorker(user).then(w => w.getStatus()),
  ])
  return { mailStatus, todoStatus, calendarStatus }
}

export async function loadMessage(messageId: string): Promise<SerializedMessageFull | undefined> {
  const user = await getAuthenticatedUserSession('startpage')
  const mailWorker = await getMicrosoftMailWorker(user)
  const msg = await mailWorker.getMessage(messageId)
  if (!msg) return undefined
  return serializeMessageFull(msg)
}

export async function connectMicrosoft(): Promise<ActionResponse<string>> {
  return toResponse(nontransactional(async () => {
    await getAuthenticatedUserSession('startpage')
    const callbackUrl = config.APP_URL + MICROSOFT_CALLBACK_PATH
    const url = await getLoginRedirectUrl(callbackUrl)
    return url.href
  }))
}

export async function disconnectMicrosoft(): Promise<ActionResponse<void>> {
  return toResponse(transactional(async (db) => {
    const user = await getAuthenticatedUserSession('startpage')
    await logEvent(db, 'INFO', `Microsoft token deleted for user ${user.email}`)
    await deleteMicrosoftToken(db, user.email)
  }))
}
