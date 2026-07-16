import { Temporal } from '@js-temporal/polyfill'
import { toInstant, toPlainDate, toGraphDateTime, graphApiRequest } from './microsoft'
import { UserSession } from '@/app/shared/auth/auth'
import { transactional } from '@/app/shared/_external/db/access'
import { logEvent } from '@/app/shared/_data/Event'
import { logger } from '@/app/shared/logger'

export interface MicrosoftTodoList {
  id: string
  displayName: string
  isOwner: boolean
  isShared: boolean
}

export async function getTodoLists(user: UserSession): Promise<MicrosoftTodoList[]> {
  logger.debug('Fetch data from GraphAPI /me/todo/lists')
  return await graphApiRequest(user, '/me/todo/lists', async (request) => {
    const response = await request.get() as { value: MicrosoftTodoList[] }
    return response.value
  })
}

async function getTodoList(user: UserSession, listId: string): Promise<MicrosoftTodoList> {
  return await graphApiRequest(user, `/me/todo/lists/${listId}`, async request => await request.get() as MicrosoftTodoList)
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
  const list = await getTodoList(user, listId)
  return await graphApiRequest(user, `/me/todo/lists/${listId}/tasks`, async (request) => {
    const response = await request.top(100).get() as { value: RawTodoTask[] }
    return response.value.map(raw => ({ ...convertTask(raw), listName: list.displayName }))
  })
}

export async function getAllTasks(user: UserSession): Promise<MicrosoftTodoTask[]> {
  const lists = await getTodoLists(user)
  const tasks: MicrosoftTodoTask[] = []
  await Promise.all(lists.map(l => getTasks(user, l.id).then((listTasks) => { listTasks.forEach(task => tasks.push({ ...task, listName: l.displayName })) })))
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
  return await transactional(async (tx) => {
    const taskBody: Record<string, unknown> = { title }
    if (body) taskBody.body = { content: body, contentType: 'text' }
    if (reminderDateTime) taskBody.reminderDateTime = toGraphDateTime(reminderDateTime)
    const list = await getTodoList(user, listId)
    logger.debug(`Create task in list ${listId} with body ${JSON.stringify(taskBody)}`)
    const result = await graphApiRequest(user, `/me/todo/lists/${listId}/tasks`, async (request) => {
      const response = await request.post(taskBody) as RawTodoTask
      return { ...convertTask(response), listName: list.displayName }
    })
    await logEvent(tx, 'INFO', `Created Microsoft Todo task "${title}"`)
    return result
  }).catch(async (error: unknown) => {
    logger.warn(`Failed to create Microsoft Todo task "${title}"`, error)
    await transactional(async (tx) => { await logEvent(tx, 'ERROR', `Failed to create Microsoft Todo task "${title}"`) })
    throw error
  })
}

export async function updateTask(user: UserSession, listId: string, taskId: string, updates: { title?: string, body?: string, reminderDateTime?: Temporal.Instant, listId?: string }): Promise<MicrosoftTodoTask> {
  return await transactional(async (tx) => {
    const targetListId = updates.listId ?? listId
    const list = await getTodoList(user, targetListId)
    const patchBody: Record<string, unknown> = {}
    if (updates.title !== undefined) patchBody.title = updates.title
    if (updates.body !== undefined) patchBody.body = { content: updates.body, contentType: 'text' }
    if (updates.reminderDateTime !== undefined) patchBody.reminderDateTime = toGraphDateTime(updates.reminderDateTime)
    logger.debug(`Update task ${taskId} with ${JSON.stringify(patchBody)}`)
    const result = await graphApiRequest(user, `/me/todo/lists/${targetListId}/tasks/${taskId}`, async (request) => {
      const response = await request.patch(patchBody) as RawTodoTask
      return { ...convertTask(response), listName: list.displayName }
    })
    await logEvent(tx, 'INFO', `Updated Microsoft Todo task "${taskId}"`)
    return result
  }).catch(async (error: unknown) => {
    logger.warn(`Failed to update Microsoft Todo task "${taskId}"`, error)
    await transactional(async (tx) => { await logEvent(tx, 'ERROR', `Failed to update Microsoft Todo task "${taskId}"`) })
    throw error
  })
}

export async function completeTask(user: UserSession, listId: string, taskId: string): Promise<void> {
  await transactional(async (tx) => {
    logger.debug(`Complete task ${taskId}`)
    await graphApiRequest(user, `/me/todo/lists/${listId}/tasks/${taskId}`, async (request) => {
      await request.patch({ status: 'completed' })
    })
    await logEvent(tx, 'INFO', `Completed Microsoft Todo task "${taskId}"`)
  }).catch(async (error: unknown) => {
    logger.warn(`Failed to complete Microsoft Todo task "${taskId}"`, error)
    await transactional(async (tx) => { await logEvent(tx, 'ERROR', `Failed to complete Microsoft Todo task "${taskId}"`) })
    throw error
  })
}

export async function deleteTask(user: UserSession, listId: string, taskId: string): Promise<void> {
  await transactional(async (tx) => {
    logger.debug(`Delete task ${taskId}`)
    await graphApiRequest(user, `/me/todo/lists/${listId}/tasks/${taskId}`, async (request) => {
      await request.delete()
    })
    await logEvent(tx, 'INFO', `Deleted Microsoft Todo task "${taskId}"`)
  }).catch(async (error: unknown) => {
    logger.warn(`Failed to delete Microsoft Todo task "${taskId}"`, error)
    await transactional(async (tx) => { await logEvent(tx, 'ERROR', `Failed to delete Microsoft Todo task "${taskId}"`) })
    throw error
  })
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
