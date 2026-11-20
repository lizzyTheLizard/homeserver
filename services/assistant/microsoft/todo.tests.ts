import { beforeAll, describe, expect, test } from 'vitest'
import { Temporal } from '@js-temporal/polyfill'
import { transactional } from '../db'
import { setMicrosoftToken } from './data'
import { type MicrosoftTodoWorker, getMicrosoftTodoWorker } from './todo'
import type { UserSession } from '../session'

const {TEST_MICROSOFT_REFRESH_TOKEN} = process.env

async function waitForData(worker: MicrosoftTodoWorker): Promise<void> {
  for (let i = 0; i < 20; i++) {
    if (worker.getTodoLists().length > 0) {return}
    await new Promise(resolve => setTimeout(resolve, 500))
  }
}

describe.skipIf(!TEST_MICROSOFT_REFRESH_TOKEN)('microsoft-todo', () => {
  const token = TEST_MICROSOFT_REFRESH_TOKEN!  // oxlint-disable-line
  let user: UserSession,
   worker: MicrosoftTodoWorker

  beforeAll(async () => {
    user = { applications: ['startpage'], email: 'todo-test@test.com', name: 'Test' }
    await transactional(db => setMicrosoftToken(db, user.email, {
      access_token: '',
      expires_at: 0,
      refresh_token: token,
    }))
    worker = await getMicrosoftTodoWorker(user)
    await waitForData(worker)
  })

  test('getTodoLists returns lists', () => {
    const lists = worker.getTodoLists()

    expect(lists.length).toBeGreaterThan(0)
    expect(lists[0]).toHaveProperty('id')
    expect(lists[0]).toHaveProperty('displayName')
    expect(typeof lists[0].displayName).toBe('string')
  })

  test('getTasks returns tasks for a list', () => {
    const lists = worker.getTodoLists(),
     tasks = worker.getTasks(lists[0].id)

    expect(Array.isArray(tasks)).toBe(true)
    if (tasks.length > 0) {
      expect(tasks[0]).toHaveProperty('id')
      expect(tasks[0]).toHaveProperty('title')
      expect(tasks[0].createdDateTime).toBeInstanceOf(Temporal.Instant)
    }
  })

  test('getAllTasks returns tasks across all lists', () => {
    const tasks = worker.getAllTasks()

    expect(Array.isArray(tasks)).toBe(true)
    if (tasks.length > 0) {
      expect(tasks[0]).toHaveProperty('listName')
    }
  })

  test('getTodoCount returns counts', () => {
    const counts = worker.getTodoCount()

    expect(typeof counts.tasksDueToday).toBe('number')
    expect(typeof counts.tasksDueRestOfWeek).toBe('number')
    expect(typeof counts.tasksWithoutDate).toBe('number')
  })

  describe('CRUD operations', () => {
    test('create, read, update, complete, delete a test todo', async () => {
      const lists = worker.getTodoLists(),
       listId = lists[0].id,
       uniqueTitle = `test TODO ${String(Date.now())}`,

       created = await worker.createTask(user, listId, uniqueTitle)
      expect(created.title).toBe(uniqueTitle)
      expect(created.status).toBe('notStarted')

      const tasksAfterCreate = worker.getTasks(listId),
       found = tasksAfterCreate.find(t => t.id === created.id)
      expect(found).toBeDefined()
      if (found) {
        expect(found.title).toBe(uniqueTitle)
      }

      const updated = await worker.updateTask(user, listId, created.id, { title: `${uniqueTitle  } (updated)` })
      expect(updated.title).toBe(`${uniqueTitle  } (updated)`)

      const tasksAfterUpdate = worker.getTasks(listId),
       foundUpdated = tasksAfterUpdate.find(t => t.id === created.id)
      expect(foundUpdated).toBeDefined()
      if (foundUpdated) {
        expect(foundUpdated.title).toBe(`${uniqueTitle  } (updated)`)
      }

      await worker.completeTask(user, listId, created.id)

      const tasksAfterComplete = worker.getTasks(listId),
       foundComplete = tasksAfterComplete.find(t => t.id === created.id)
      expect(foundComplete).toBeDefined()
      if (foundComplete) {
        expect(foundComplete.status).toBe('completed')
      }

      await worker.deleteTask(user, listId, created.id)

      const tasksAfterDelete = worker.getTasks(listId),
       foundDeleted = tasksAfterDelete.find(t => t.id === created.id)
      expect(foundDeleted).toBeUndefined()
    }, 30000)
  })
})
