'use server'

import { Mutex } from 'async-mutex'
import { Temporal } from '@js-temporal/polyfill'
import { toInstant, toPlainDate, toGraphDateTime, graphApiRequest, DeltaResponse } from './microsoft'
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
globalThis.msTodoWorkers ??= new Map<string, MicrosoftTodoWorker>()

const facadeMutex = new Mutex()
const inactivityTimeoutMs = 5 * 60 * 1000
const deltaPollIntervalMs = 15 * 1000

function createMicrosoftTodoWorker(user: UserSession): MicrosoftTodoWorker {
  const userId = user.email
  let lists: MicrosoftTodoList[] = []
  const tasks = new Map<string, MicrosoftTodoTask[]>()
  const tasksDeltaLinks = new Map<string, string>()
  let interval: NodeJS.Timeout | undefined
  let timeout: NodeJS.Timeout | undefined
  let status: 'connecting' | 'connected' | 'error' = 'connecting'

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
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(close, inactivityTimeoutMs)
  }

  function getTodoLists(): MicrosoftTodoList[] { return lists }

  function getStatus(): string { return status }

  function getTasks(listId: string): MicrosoftTodoTask[] { return tasks.get(listId) ?? [] }

  function getAllTasks(): MicrosoftTodoTask[] {
    const seen = new Set<string>()
    const result: MicrosoftTodoTask[] = []
    for (const listTasks of tasks.values()) {
      for (const task of listTasks) {
        if (seen.has(task.id)) continue
        seen.add(task.id)
        result.push(task)
      }
    }
    return result
  }

  function getTodoCount(): TodoTaskCounts {
    const allTasks = getAllTasks().filter(t => t.status !== 'completed')
    const now = Temporal.Now.instant()
    const todayStart = now.toZonedDateTimeISO('UTC').with({ hour: 0, minute: 0, second: 0, millisecond: 0 }).toInstant()
    const todayEnd = todayStart.add({ hours: 24 })
    const weekEnd = todayStart.add({ hours: 7 * 24 })

    let tasksDueToday = 0
    let tasksDueRestOfWeek = 0
    let tasksWithoutDate = 0

    for (const task of allTasks) {
      let instant: Temporal.Instant | undefined
      if (task.reminderDateTime) instant = task.reminderDateTime
      else if (task.dueDate) instant = task.dueDate.toZonedDateTime({ timeZone: 'UTC', plainTime: '00:00' }).toInstant()

      if (!instant) tasksWithoutDate++
      else if (Temporal.Instant.compare(instant, todayStart) >= 0 && Temporal.Instant.compare(instant, todayEnd) < 0) tasksDueToday++
      else if (Temporal.Instant.compare(instant, todayEnd) >= 0 && Temporal.Instant.compare(instant, weekEnd) < 0) tasksDueRestOfWeek++
    }

    return { tasksDueToday, tasksDueRestOfWeek, tasksWithoutDate }
  }

  function addTaskToMemory(task: MicrosoftTodoTask, listId: string): void {
    const listTasks = tasks.get(listId) ?? []
    const existingIdx = listTasks.findIndex(t => t.id === task.id)
    if (existingIdx >= 0) listTasks[existingIdx] = task
    else listTasks.push(task)
    tasks.set(listId, listTasks)
  }

  function removeTaskFromMemory(taskId: string, listId: string): void {
    const listTasks = tasks.get(listId)
    if (!listTasks) return
    tasks.set(listId, listTasks.filter(t => t.id !== taskId))
  }

  async function createTask(user: UserSession, listId: string, title: string, body?: string, reminderDateTime?: Temporal.Instant): Promise<MicrosoftTodoTask> {
    return await transactional(async (tx) => {
      const taskBody: Record<string, unknown> = { title }
      if (body) taskBody.body = { content: body, contentType: 'text' }
      if (reminderDateTime) taskBody.reminderDateTime = toGraphDateTime(reminderDateTime)
      const list = lists.find(l => l.id === listId)
      if (!list) throw new Error(`List with ID ${listId} not found`)
      logger.debug(`Create task in list ${listId} with body ${JSON.stringify(taskBody)}`)
      const result = await graphApiRequest(user, `/me/todo/lists/${listId}/tasks`, async (request) => {
        const response = await request.post(taskBody) as RawTodoTask
        return { ...convertTask(response), listName: list.displayName }
      })
      addTaskToMemory(result, listId)
      await logEvent(tx, 'INFO', `Created Microsoft Todo task "${title}"`)
      return result
    }).catch(async (error: unknown) => {
      logger.warn(`Failed to create Microsoft Todo task "${title}"`, error)
      await transactional(async (tx) => { await logEvent(tx, 'ERROR', `Failed to create Microsoft Todo task "${title}"`) })
      throw error
    })
  }

  async function updateTask(user: UserSession, listId: string, taskId: string, updates: { title?: string, body?: string, reminderDateTime?: Temporal.Instant, listId?: string }): Promise<MicrosoftTodoTask> {
    return await transactional(async (tx) => {
      const targetListId = updates.listId ?? listId
      const list = lists.find(l => l.id === targetListId)
      if (!list) throw new Error(`List with ID ${targetListId} not found`)
      const patchBody: Record<string, unknown> = {}
      if (updates.title !== undefined) patchBody.title = updates.title
      if (updates.body !== undefined) patchBody.body = { content: updates.body, contentType: 'text' }
      if (updates.reminderDateTime !== undefined) patchBody.reminderDateTime = toGraphDateTime(updates.reminderDateTime)
      logger.debug(`Update task ${taskId} with ${JSON.stringify(patchBody)}`)
      const result = await graphApiRequest(user, `/me/todo/lists/${targetListId}/tasks/${taskId}`, async (request) => {
        const response = await request.patch(patchBody) as RawTodoTask
        return { ...convertTask(response), listName: list.displayName }
      })
      if (targetListId !== listId) removeTaskFromMemory(taskId, listId)
      addTaskToMemory(result, targetListId)
      await logEvent(tx, 'INFO', `Updated Microsoft Todo task "${taskId}"`)
      return result
    }).catch(async (error: unknown) => {
      logger.warn(`Failed to update Microsoft Todo task "${taskId}"`, error)
      await transactional(async (tx) => { await logEvent(tx, 'ERROR', `Failed to update Microsoft Todo task "${taskId}"`) })
      throw error
    })
  }

  async function completeTask(user: UserSession, listId: string, taskId: string): Promise<void> {
    await transactional(async (tx) => {
      logger.debug(`Complete task ${taskId}`)
      await graphApiRequest(user, `/me/todo/lists/${listId}/tasks/${taskId}`, async (request) => {
        await request.patch({ status: 'completed' })
      })
      const listTasks = tasks.get(listId)
      if (listTasks) {
        const idx = listTasks.findIndex(t => t.id === taskId)
        if (idx >= 0) listTasks[idx] = { ...listTasks[idx], status: 'completed' }
      }
      await logEvent(tx, 'INFO', `Completed Microsoft Todo task "${taskId}"`)
    }).catch(async (error: unknown) => {
      logger.warn(`Failed to complete Microsoft Todo task "${taskId}"`, error)
      await transactional(async (tx) => { await logEvent(tx, 'ERROR', `Failed to complete Microsoft Todo task "${taskId}"`) })
      throw error
    })
  }

  async function deleteTask(user: UserSession, listId: string, taskId: string): Promise<void> {
    await transactional(async (tx) => {
      logger.debug(`Delete task ${taskId}`)
      await graphApiRequest(user, `/me/todo/lists/${listId}/tasks/${taskId}`, async (request) => {
        await request.delete()
      })
      removeTaskFromMemory(taskId, listId)
      await logEvent(tx, 'INFO', `Deleted Microsoft Todo task "${taskId}"`)
    }).catch(async (error: unknown) => {
      logger.warn(`Failed to delete Microsoft Todo task "${taskId}"`, error)
      await transactional(async (tx) => { await logEvent(tx, 'ERROR', `Failed to delete Microsoft Todo task "${taskId}"`) })
      throw error
    })
  }

  async function doInitialFetch(): Promise<void> {
    lists = await graphApiRequest(user, '/me/todo/lists', async (request) => {
      const response = await request.get() as { value: MicrosoftTodoList[] }
      return response.value
    })
    tasks.clear()
    tasksDeltaLinks.clear()
    for (const list of lists) {
      await syncListTasks(list, `/me/todo/lists/${list.id}/tasks/delta`)
    }
    const listCount = lists.length
    const taskCount = getAllTasks().length
    logger.debug(`[MicrosoftTodoWorker] Initial fetch complete for user ${userId}: ${String(listCount)} lists, ${String(taskCount)} tasks`)
  }

  async function doDeltaPoll(): Promise<void> {
    for (const list of lists) {
      const deltaLink = tasksDeltaLinks.get(list.id)
      if (!deltaLink) throw new Error('Delta link is not set. Initial fetch must be completed before delta polling can occur.')
      await syncListTasks(list, deltaLink)
    }
    logger.debug(`[MicrosoftTodoWorker] Delta poll complete for user ${userId}: ${String(getAllTasks().length)} tasks`)
  }

  async function syncListTasks(list: MicrosoftTodoList, url: string): Promise<void> {
    let currentUrl: string | undefined = url
    while (currentUrl) {
      const deltaResult: DeltaResponse<RawTodoTask> = await graphApiRequest(user, currentUrl, async (request) => {
        return await request.get() as DeltaResponse<RawTodoTask>
      })
      for (const rawTask of deltaResult.value) {
        if (rawTask['@removed']) removeTaskFromMemory(rawTask.id, list.id)
        else addTaskToMemory({ ...convertTask(rawTask), listName: list.displayName }, list.id)
      }
      if (deltaResult['@odata.nextLink']) {
        currentUrl = deltaResult['@odata.nextLink']
      }
      else {
        if (deltaResult['@odata.deltaLink']) tasksDeltaLinks.set(list.id, deltaResult['@odata.deltaLink'])
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

  return { getTodoCount, getTodoLists, getTasks, getAllTasks, getStatus, createTask, updateTask, completeTask, deleteTask, touch }
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
