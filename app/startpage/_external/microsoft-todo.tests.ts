import { describe, expect, test, beforeAll } from 'vitest'
import { Temporal } from '@js-temporal/polyfill'
import { transactional } from '@/app/shared/_external/db/access'
import { setMicrosoftToken } from '../_data/Microsoft'
import { getTodoLists, getTasks, getAllTasks, getTodoCount, createTask, updateTask, completeTask, deleteTask } from './microsoft-todo'
import type { UserSession } from '@/app/shared/auth/auth'

const TEST_MICROSOFT_REFRESH_TOKEN = process.env.TEST_MICROSOFT_REFRESH_TOKEN

describe.skipIf(!TEST_MICROSOFT_REFRESH_TOKEN)('microsoft-todo', () => {
  const token = TEST_MICROSOFT_REFRESH_TOKEN!  // eslint-disable-line
  let user: UserSession

  beforeAll(async () => {
    user = { name: 'Test', email: 'todo-test@test.com', applications: ['startpage'] }
    await transactional(db => setMicrosoftToken(db, user.email, {
      access_token: '',
      refresh_token: token,
      expires_at: 0,
    }))
  })

  test('getTodoLists returns lists', async () => {
    const lists = await getTodoLists(user)

    expect(lists.length).toBeGreaterThan(0)
    expect(lists[0]).toHaveProperty('id')
    expect(lists[0]).toHaveProperty('displayName')
    expect(typeof lists[0].displayName).toBe('string')
  })

  test('getTasks returns tasks for a list', async () => {
    const lists = await getTodoLists(user)
    const tasks = await getTasks(user, lists[0].id)

    expect(Array.isArray(tasks)).toBe(true)
    if (tasks.length > 0) {
      expect(tasks[0]).toHaveProperty('id')
      expect(tasks[0]).toHaveProperty('title')
      expect(tasks[0].createdDateTime).toBeInstanceOf(Temporal.Instant)
    }
  })

  test('getAllTasks returns tasks across all lists', async () => {
    const tasks = await getAllTasks(user)

    expect(Array.isArray(tasks)).toBe(true)
    if (tasks.length > 0) {
      expect(tasks[0]).toHaveProperty('listName')
    }
  })

  test('getTodoCount returns counts', async () => {
    const counts = await getTodoCount(user)

    expect(typeof counts.tasksDueToday).toBe('number')
    expect(typeof counts.tasksDueRestOfWeek).toBe('number')
    expect(typeof counts.tasksWithoutDate).toBe('number')
  })

  describe('CRUD operations', () => {
    test('create, read, update, complete, delete a test todo', async () => {
      const lists = await getTodoLists(user)
      const listId = lists[0].id
      const uniqueTitle = `test TODO ${String(Date.now())}`

      const created = await createTask(user, listId, uniqueTitle)
      expect(created.title).toBe(uniqueTitle)
      expect(created.status).toBe('notStarted')

      const tasksAfterCreate = await getTasks(user, listId)
      const found = tasksAfterCreate.find(t => t.id === created.id)
      expect(found).toBeDefined()
      if (found) {
        expect(found.title).toBe(uniqueTitle)
      }

      const updated = await updateTask(user, listId, created.id, { title: uniqueTitle + ' (updated)' })
      expect(updated.title).toBe(uniqueTitle + ' (updated)')

      const tasksAfterUpdate = await getTasks(user, listId)
      const foundUpdated = tasksAfterUpdate.find(t => t.id === created.id)
      expect(foundUpdated).toBeDefined()
      if (foundUpdated) {
        expect(foundUpdated.title).toBe(uniqueTitle + ' (updated)')
      }

      await completeTask(user, listId, created.id)

      const tasksAfterComplete = await getTasks(user, listId)
      const foundComplete = tasksAfterComplete.find(t => t.id === created.id)
      expect(foundComplete).toBeDefined()
      if (foundComplete) {
        expect(foundComplete.status).toBe('completed')
      }

      await deleteTask(user, listId, created.id)

      const tasksAfterDelete = await getTasks(user, listId)
      const foundDeleted = tasksAfterDelete.find(t => t.id === created.id)
      expect(foundDeleted).toBeUndefined()
    }, 30000)
  })
})
