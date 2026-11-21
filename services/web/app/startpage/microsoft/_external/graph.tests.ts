import { describe, expect, test, vi } from 'vitest'

vi.mock('@/app/shared/logger', () => ({ logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn(), silly: vi.fn() } }))

import { getUserInfo } from './graph'
import { readMicrosoftConnectionStatus, readMicrosoftStatus } from './status'

describe('without a Microsoft token', () => {
  test('getUserInfo answers undefined instead of failing', async ({ task }) => {
    const user = { name: 'A', email: `${task.id}@test.com`, applications: ['startpage'] }
    expect(await getUserInfo(user)).toBeUndefined()
  })

  test('the status reports the account as not connected', async ({ task }) => {
    const user = { name: 'A', email: `${task.id}@test.com`, applications: ['startpage'] }
    const status = await readMicrosoftStatus(user)
    expect(status).toMatchObject({ connected: false, mailStatus: 'connecting', messages: [], todos: [], events: [] })
    expect(await readMicrosoftConnectionStatus(user)).toEqual({ mailStatus: 'connecting', todoStatus: 'connecting', calendarStatus: 'connecting' })
  })
})
