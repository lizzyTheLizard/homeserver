import { Temporal } from '@js-temporal/polyfill'
import { createGraphApiClient, toInstant, toPlainDate, toGraphDateTime } from './microsoft'
import { UserSession } from '@/app/shared/auth/auth'

export interface MicrosoftTodoList {
  id: string
  displayName: string
  isOwner: boolean
  isShared: boolean
}

export async function getTodoLists(user: UserSession): Promise<MicrosoftTodoList[]> {
  const client = await createGraphApiClient(user)
  if (!client) return []
  const response = await client.api('/me/todo/lists').get() as { value: MicrosoftTodoList[] }
  return response.value
}

async function getTodoList(user: UserSession, listId: string): Promise<MicrosoftTodoList> {
  const client = await createGraphApiClient(user)
  if (!client) throw new Error('No Microsoft Graph client available')
  return await client.api(`/me/todo/lists/${listId}`).get() as MicrosoftTodoList
}

export interface MicrosoftTodoTask {
  id: string
  title: string
  status: 'notStarted' | 'inProgress' | 'completed' | 'waitingOnOthers' | 'deferred'
  body?: { content: string, contentType: 'text' | 'html' }
  dueDate?: Temporal.PlainDate
  reminderDateTime?: Temporal.Instant
  createdDateTime: Temporal.Instant
  lastModifiedDateTime: Temporal.Instant
  importance: 'low' | 'normal' | 'high'
  listName: string
}

export async function getTasks(user: UserSession, listId: string): Promise<MicrosoftTodoTask[]> {
  const client = await createGraphApiClient(user)
  if (!client) return []
  const list = await getTodoList(user, listId)
  const response = await client.api(`/me/todo/lists/${listId}/tasks`)
    .top(100)
    .get() as { value: RawTodoTask[] }
  return response.value.map(raw => ({ ...convertTask(raw), listName: list.displayName }))
}

export async function getAllTasks(user: UserSession): Promise<MicrosoftTodoTask[]> {
  const lists = await getTodoLists(user)
  const tasks: MicrosoftTodoTask[] = []
  for (const list of lists) {
    const listTasks = await getTasks(user, list.id)
    for (const task of listTasks) {
      tasks.push({ ...task, listName: list.displayName })
    }
  }
  return tasks
}

export interface TodoTaskCounts {
  tasksDueToday: number
  tasksDueRestOfWeek: number
  tasksWithoutDate: number
}

export async function getTodoCount(user: UserSession): Promise<TodoTaskCounts> {
  const allTasks = await getAllTasks(user)
  const now = Temporal.Now.instant()
  const todayStart = now.toZonedDateTimeISO('UTC').with({ hour: 0, minute: 0, second: 0, millisecond: 0 }).toInstant()
  const todayEnd = todayStart.add({ hours: 24 })
  const weekEnd = todayStart.add({ hours: 7 * 24 })

  let tasksDueToday = 0
  let tasksDueRestOfWeek = 0
  let tasksWithoutDate = 0

  for (const task of allTasks) {
    if (task.status === 'completed') continue
    let instant: Temporal.Instant | undefined
    if (task.reminderDateTime) instant = task.reminderDateTime
    else if (task.dueDate) instant = task.dueDate.toZonedDateTime({ timeZone: 'UTC', plainTime: '00:00' }).toInstant()

    if (!instant) tasksWithoutDate++
    else if (Temporal.Instant.compare(instant, todayStart) >= 0 && Temporal.Instant.compare(instant, todayEnd) < 0) tasksDueToday++
    else if (Temporal.Instant.compare(instant, todayEnd) >= 0 && Temporal.Instant.compare(instant, weekEnd) < 0) tasksDueRestOfWeek++
  }

  return { tasksDueToday, tasksDueRestOfWeek, tasksWithoutDate }
}

export async function createTask(user: UserSession, listId: string, title: string, body?: string, reminderDateTime?: Temporal.Instant): Promise<MicrosoftTodoTask> {
  const client = await createGraphApiClient(user)
  if (!client) throw new Error('No Microsoft Graph client available. Please connect your Microsoft account.')
  const list = await getTodoList(user, listId)
  const taskBody: Record<string, unknown> = { title }
  if (body) taskBody.body = { content: body, contentType: 'text' }
  if (reminderDateTime) taskBody.reminderDateTime = toGraphDateTime(reminderDateTime)
  const result = await client.api(`/me/todo/lists/${listId}/tasks`).post(taskBody) as RawTodoTask
  return { ...convertTask(result), listName: list.displayName }
}

export async function updateTask(user: UserSession, listId: string, taskId: string, updates: { title?: string, body?: string, reminderDateTime?: Temporal.Instant, listId?: string }): Promise<MicrosoftTodoTask> {
  const client = await createGraphApiClient(user)
  if (!client) throw new Error('No Microsoft Graph client available. Please connect your Microsoft account.')
  const targetListId = updates.listId ?? listId
  const list = await getTodoList(user, targetListId)
  const patchBody: Record<string, unknown> = {}
  if (updates.title !== undefined) patchBody.title = updates.title
  if (updates.body !== undefined) patchBody.body = { content: updates.body, contentType: 'text' }
  if (updates.reminderDateTime !== undefined) patchBody.reminderDateTime = toGraphDateTime(updates.reminderDateTime)
  const result = await client.api(`/me/todo/lists/${targetListId}/tasks/${taskId}`).patch(patchBody) as RawTodoTask
  return { ...convertTask(result), listName: list.displayName }
}

export async function completeTask(user: UserSession, listId: string, taskId: string): Promise<void> {
  const client = await createGraphApiClient(user)
  if (!client) throw new Error('No Microsoft Graph client available. Please connect your Microsoft account.')
  await client.api(`/me/todo/lists/${listId}/tasks/${taskId}`).patch({ status: 'completed' })
}

export async function deleteTask(user: UserSession, listId: string, taskId: string): Promise<void> {
  const client = await createGraphApiClient(user)
  if (!client) throw new Error('No Microsoft Graph client available. Please connect your Microsoft account.')
  await client.api(`/me/todo/lists/${listId}/tasks/${taskId}`).delete()
}

interface RawTodoTask {
  id: string
  title: string
  status: 'notStarted' | 'inProgress' | 'completed' | 'waitingOnOthers' | 'deferred'
  body?: { content: string, contentType: 'text' | 'html' }
  dueDateTime?: { dateTime: string, timeZone: string }
  reminderDateTime?: { dateTime: string, timeZone: string }
  createdDateTime: string
  lastModifiedDateTime: string
  importance: 'low' | 'normal' | 'high'
}

function convertTask(raw: RawTodoTask): Omit<MicrosoftTodoTask, 'listName'> {
  return {
    id: raw.id,
    title: raw.title,
    status: raw.status,
    body: raw.body,
    dueDate: raw.dueDateTime ? toPlainDate(raw.dueDateTime.dateTime) : undefined,
    reminderDateTime: raw.reminderDateTime ? toInstant(raw.reminderDateTime.dateTime, raw.reminderDateTime.timeZone) : undefined,
    createdDateTime: toInstant(raw.createdDateTime, ''),
    lastModifiedDateTime: toInstant(raw.lastModifiedDateTime, ''),
    importance: raw.importance,
  }
}
