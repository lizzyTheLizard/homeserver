import { beforeAll, describe, expect, test, vi } from 'vitest'
import { Temporal } from '@js-temporal/polyfill'
import { transactional } from '../db'
import { setMicrosoftToken } from './data'
import { getMicrosoftCalendarWorker } from './calendar'
import type { UserSession } from '../session'

const {TEST_MICROSOFT_REFRESH_TOKEN} = process.env

describe.skipIf(!TEST_MICROSOFT_REFRESH_TOKEN)('microsoft-calendar', () => {
  const token = TEST_MICROSOFT_REFRESH_TOKEN!  // oxlint-disable-line
  let user: UserSession

  beforeAll(async () => {
    user = { applications: ['startpage'], email: 'calendar-test@test.com', name: 'Test' }
    await transactional(db => setMicrosoftToken(db, user.email, {
      access_token: '',
      expires_at: 0,
      refresh_token: token,
    }))
  })

  test('getCalendars returns calendars', async () => {
    const worker = await getMicrosoftCalendarWorker(user)
    await vi.waitFor(() => {
      expect(worker.getCalendars().length).toBeGreaterThan(0)
    }, { timeout: 10000 })
    const calendars = worker.getCalendars()

    expect(calendars[0]).toHaveProperty('id')
    expect(calendars[0]).toHaveProperty('name')
    expect(typeof calendars[0].name).toBe('string')
  })

  test('getAllEvents returns events with Temporal types', async () => {
    const worker = await getMicrosoftCalendarWorker(user),
     events = worker.getAllEvents()

    expect(Array.isArray(events)).toBe(true)
    for (const event of events) {
      expect(event.start).toBeInstanceOf(Temporal.Instant)
      expect(event.end).toBeInstanceOf(Temporal.Instant)
      expect(event.createdDateTime).toBeInstanceOf(Temporal.Instant)
      expect(event.lastModifiedDateTime).toBeInstanceOf(Temporal.Instant)
      expect(typeof event.subject).toBe('string')
    }
  })

  test('getAllEvents accepts optional date range', async () => {
    const now = Temporal.Now.instant(),
     nextWeek = now.add({ hours: 7 * 24 }),
     worker = await getMicrosoftCalendarWorker(user),
     events = worker.getAllEvents(now, nextWeek)

    expect(Array.isArray(events)).toBe(true)
  })
})
