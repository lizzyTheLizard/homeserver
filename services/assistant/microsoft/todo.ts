import { type DeltaResponse, graphApiRequest, toGraphDateTime, toInstant, toPlainDate } from './graph'
import { Mutex } from 'async-mutex'
import { Temporal } from '@js-temporal/polyfill'
import type { UserSession } from '../session'
import { logger } from '../logger'

export interface MicrosoftTodoList {
  id: string
  displayName: string
  isOwner: boolean
  isShared: boolean
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

export interface TodoTaskCounts {
  tasksDueToday: number
  tasksDueRestOfWeek: number
  tasksWithoutDate: number
}

export interface MicrosoftTodoWorker {
  getTodoCount(): TodoTaskCounts
  getTodoLists(): MicrosoftTodoList[]
  getTasks(listId: string): MicrosoftTodoTask[]
  getAllTasks(): MicrosoftTodoTask[]
  getStatus(): string
  createTask(user: UserSession, listId: string, title: string, body?: string, reminderDateTime?: Temporal.Instant): Promise<MicrosoftTodoTask>
  updateTask(user: UserSession, listId: string, taskId: string, updates: { title?: string, body?: string, reminderDateTime?: Temporal.Instant, listId?: string }): Promise<MicrosoftTodoTask>
  completeTask(user: UserSession, listId: string, taskId: string): Promise<void>
  deleteTask(user: UserSession, listId: string, taskId: string): Promise<void>
  touch(): void
}

export async function getMicrosoftTodoWorker(user: UserSession): Promise<MicrosoftTodoWorker> {
  return await facadeMutex.runExclusive(() => {
    const existing = globalThis.msTodoWorkers?.get(user.email)
    if (existing) {
      existing.touch()
      return existing
    }
    const worker = createMicrosoftTodoWorker(user)
    globalThis.msTodoWorkers?.set(user.email, worker)
    return worker
  })
}

declare global {
  var msTodoWorkers: Map<string, MicrosoftTodoWorker> | undefined
}
globalThis.msTodoWorkers = globalThis.msTodoWorkers ?? new Map<string, MicrosoftTodoWorker>()

const facadeMutex = new Mutex(),
 inactivityTimeoutMs = 5 * 60 * 1000,
 deltaPollIntervalMs = 15 * 1000

function createMicrosoftTodoWorker(user: UserSession): MicrosoftTodoWorker {
  const userId = user.email
  let lists: MicrosoftTodoList[] = []
  const tasks = new Map<string, MicrosoftTodoTask[]>(),
   tasksDeltaLinks = new Map<string, string>()
  let interval: NodeJS.Timeout | undefined,
   timeout: NodeJS.Timeout | undefined,
   status: 'connecting' | 'connected' | 'error' = 'connecting'

  function close(): void {
    if (interval) {
      clearInterval(interval)
      interval = undefined
    }
    if (timeout) {
      clearTimeout(timeout)
      timeout = undefined
    }
    globalThis.msTodoWorkers?.delete(userId)
    logger.info(`[MicrosoftTodoWorker] Worker stopped for user ${userId}`)
  }

  function touch(): void {
    if (timeout) {clearTimeout(timeout)}
    timeout = setTimeout(close, inactivityTimeoutMs)
  }

  function getTodoLists(): MicrosoftTodoList[] { return lists }

  function getStatus(): string { return status }

  function getTasks(listId: string): MicrosoftTodoTask[] { return tasks.get(listId) ?? [] }

  function getAllTasks(): MicrosoftTodoTask[] {
    return [...tasks.values()].flatMap(t => t)
  }

  function getTodoCount(): TodoTaskCounts {
    const allTasks = getAllTasks().filter(t => t.status !== 'completed'),
     now = Temporal.Now.instant(),
     todayStart = now.toZonedDateTimeISO('UTC').with({ hour: 0, millisecond: 0, minute: 0, second: 0 }).toInstant(),
     todayEnd = todayStart.add({ hours: 24 }),
     weekEnd = todayStart.add({ hours: 7 * 24 })

    let tasksDueToday = 0,
     tasksDueRestOfWeek = 0,
     tasksWithoutDate = 0

    for (const task of allTasks) {
      let instant: Temporal.Instant | undefined
      if (task.reminderDateTime) {instant = task.reminderDateTime}
      else if (task.dueDate) {instant = task.dueDate.toZonedDateTime({ plainTime: '00:00', timeZone: 'UTC' }).toInstant()}

      if (!instant) {tasksWithoutDate++}
      else if (Temporal.Instant.compare(instant, todayStart) >= 0 && Temporal.Instant.compare(instant, todayEnd) < 0) {tasksDueToday++}
      else if (Temporal.Instant.compare(instant, todayEnd) >= 0 && Temporal.Instant.compare(instant, weekEnd) < 0) {tasksDueRestOfWeek++}
    }

    return { tasksDueRestOfWeek, tasksDueToday, tasksWithoutDate }
  }

  function addTaskToMemory(task: MicrosoftTodoTask, listId: string): void {
    const listTasks = tasks.get(listId) ?? [],
     existingIdx = listTasks.findIndex(t => t.id === task.id)
    if (existingIdx >= 0) {listTasks[existingIdx] = task}
    else {listTasks.push(task)}
    tasks.set(listId, listTasks)
  }

  function removeTaskFromMemory(taskId: string, listId: string): void {
    const listTasks = tasks.get(listId)
    if (!listTasks) {return}
    tasks.set(listId, listTasks.filter(t => t.id !== taskId))
  }

  async function createTask(user: UserSession, listId: string, title: string, body?: string, reminderDateTime?: Temporal.Instant): Promise<MicrosoftTodoTask> {
    try {
      const taskBody: Record<string, unknown> = { title }
      if (body) {taskBody.body = { content: body, contentType: 'text' }}
      if (reminderDateTime) {taskBody.reminderDateTime = toGraphDateTime(reminderDateTime)}
      const list = lists.find(l => l.id === listId)
      if (!list) {throw new Error(`List with ID ${listId} not found`)}
      logger.debug(`Create task in list ${listId} with body ${JSON.stringify(taskBody)}`)
      const result = await graphApiRequest(user, `/me/todo/lists/${listId}/tasks`, async (request) => {
        // oxlint-disable-next-line typescript/no-unsafe-type-assertion
        const response = await request.post(taskBody) as RawTodoTask
        return { ...convertTask(response), listName: list.displayName }
      })
      addTaskToMemory(result, listId)
      return result
    }
    catch (error: unknown) {
      logger.warn(`Failed to create Microsoft Todo task "${title}"`, error)
      throw error
    }
  }

  async function updateTask(user: UserSession, listId: string, taskId: string, updates: { title?: string, body?: string, reminderDateTime?: Temporal.Instant, listId?: string }): Promise<MicrosoftTodoTask> {
    try {
      const targetListId = updates.listId ?? listId,
       list = lists.find(l => l.id === targetListId)
      if (!list) {throw new Error(`List with ID ${targetListId} not found`)}
      const patchBody: Record<string, unknown> = {}
      if (updates.title !== undefined) {patchBody.title = updates.title}
      if (updates.body !== undefined) {patchBody.body = { content: updates.body, contentType: 'text' }}
      if (updates.reminderDateTime !== undefined) {patchBody.reminderDateTime = toGraphDateTime(updates.reminderDateTime)}
      logger.debug(`Update task ${taskId} with ${JSON.stringify(patchBody)}`)
      const result = await graphApiRequest(user, `/me/todo/lists/${targetListId}/tasks/${taskId}`, async (request) => {
        // oxlint-disable-next-line typescript/no-unsafe-type-assertion
        const response = await request.patch(patchBody) as RawTodoTask
        return { ...convertTask(response), listName: list.displayName }
      })
      if (targetListId !== listId) {removeTaskFromMemory(taskId, listId)}
      addTaskToMemory(result, targetListId)
      return result
    }
    catch (error: unknown) {
      logger.warn(`Failed to update Microsoft Todo task "${taskId}"`, error)
      throw error
    }
  }

  async function completeTask(user: UserSession, listId: string, taskId: string): Promise<void> {
    try {
      logger.debug(`Complete task ${taskId}`)
      await graphApiRequest(user, `/me/todo/lists/${listId}/tasks/${taskId}`, async (request) => {
        await request.patch({ status: 'completed' })
      })
      const listTasks = tasks.get(listId)
      if (listTasks) {
        const idx = listTasks.findIndex(t => t.id === taskId)
        if (idx >= 0) {listTasks[idx] = { ...listTasks[idx], status: 'completed' }}
      }
    }
    catch (error: unknown) {
      logger.warn(`Failed to complete Microsoft Todo task "${taskId}"`, error)
      throw error
    }
  }

  async function deleteTask(user: UserSession, listId: string, taskId: string): Promise<void> {
    try {
      logger.debug(`Delete task ${taskId}`)
      await graphApiRequest(user, `/me/todo/lists/${listId}/tasks/${taskId}`, async (request) => {
        await request.delete()
      })
      removeTaskFromMemory(taskId, listId)
    }
    catch (error: unknown) {
      logger.warn(`Failed to delete Microsoft Todo task "${taskId}"`, error)
      throw error
    }
  }

  async function doInitialFetch(): Promise<void> {
    lists = await graphApiRequest(user, '/me/todo/lists', async (request) => {
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion
      const response = await request.get() as { value: MicrosoftTodoList[] }
      return response.value
    })
    tasks.clear()
    tasksDeltaLinks.clear()
    for (const list of lists) {
      await syncListTasks(list, `/me/todo/lists/${list.id}/tasks/delta`)
    }
    const listCount = lists.length,
     taskCount = getAllTasks().length
    logger.debug(`[MicrosoftTodoWorker] Initial fetch complete for user ${userId}: ${String(listCount)} lists, ${String(taskCount)} tasks`)
  }

  async function doDeltaPoll(): Promise<void> {
    for (const list of lists) {
      const deltaLink = tasksDeltaLinks.get(list.id)
      if (!deltaLink) {throw new Error('Delta link is not set. Initial fetch must be completed before delta polling can occur.')}
      await syncListTasks(list, deltaLink)
    }
    logger.debug(`[MicrosoftTodoWorker] Delta poll complete for user ${userId}: ${String(getAllTasks().length)} tasks`)
  }

  async function syncListTasks(list: MicrosoftTodoList, url: string): Promise<void> {
    let currentUrl: string | undefined = url
    while (currentUrl) {
      const deltaResult: DeltaResponse<RawTodoTask> = await graphApiRequest(user, currentUrl, async (request) => 
        // oxlint-disable-next-line typescript/no-unsafe-type-assertion
        await request.get() as DeltaResponse<RawTodoTask>
      )
      for (const rawTask of deltaResult.value) {
        if (rawTask['@removed']) {removeTaskFromMemory(rawTask.id, list.id)}
        else {addTaskToMemory({ ...convertTask(rawTask), listName: list.displayName }, list.id)}
      }
      if (deltaResult['@odata.nextLink']) {
        currentUrl = deltaResult['@odata.nextLink']
      }
      else {
        if (deltaResult['@odata.deltaLink']) {tasksDeltaLinks.set(list.id, deltaResult['@odata.deltaLink'])}
        currentUrl = undefined
      }
    }
  }

  status = 'connecting'
  doInitialFetch()
    .then(() => { status = 'connected' })
    .catch((error: unknown) => {
      status = 'error'
      logger.warn(`[MicrosoftTodoWorker] Initial fetch failed for user ${userId}`, error)
    })
  interval = setInterval(() => {
    doDeltaPoll()
      .catch((error: unknown) => {
        logger.warn(`[MicrosoftTodoWorker] Poll crash for user ${userId}`, error)
        status = 'connecting'
        doInitialFetch()
          .then(() => { status = 'connected' })
          .catch((error: unknown) => {
            status = 'error'
            logger.warn(`[MicrosoftTodoWorker] Re-fetch after poll crash failed for user ${userId}`, error)
          })
      })
  }, deltaPollIntervalMs)
  timeout = setTimeout(close, inactivityTimeoutMs)

  return { completeTask, createTask, deleteTask, getAllTasks, getStatus, getTasks, getTodoCount, getTodoLists, touch, updateTask }
}

interface RawTodoTask {
  'id': string
  'title': string
  'status': 'notStarted' | 'inProgress' | 'completed' | 'waitingOnOthers' | 'deferred'
  'body'?: { content: string, contentType: 'text' | 'html' }
  'dueDateTime'?: { dateTime: string, timeZone: string }
  'reminderDateTime'?: { dateTime: string, timeZone: string }
  'createdDateTime': string
  'lastModifiedDateTime': string
  'importance': 'low' | 'normal' | 'high'
  '@removed'?: { reason: string }
}

function convertTask(raw: RawTodoTask): Omit<MicrosoftTodoTask, 'listName'> {
  return {
    body: raw.body,
    createdDateTime: toInstant(raw.createdDateTime, ''),
    dueDate: raw.dueDateTime ? toPlainDate(raw.dueDateTime.dateTime) : undefined,
    id: raw.id,
    importance: raw.importance,
    lastModifiedDateTime: toInstant(raw.lastModifiedDateTime, ''),
    reminderDateTime: raw.reminderDateTime ? toInstant(raw.reminderDateTime.dateTime, raw.reminderDateTime.timeZone) : undefined,
    status: raw.status,
    title: raw.title,
  }
}
