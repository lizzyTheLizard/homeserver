import { describe, expect, test, beforeAll } from 'vitest'
import { Temporal } from '@js-temporal/polyfill'
import { transactional } from '@/app/shared/_external/db/access'
import { setMicrosoftToken } from '../_data/Microsoft'
import { getCalendars, getAllEvents } from './microsoft-calendar'
import type { UserSession } from '@/app/shared/auth/auth'

const TEST_MICROSOFT_REFRESH_TOKEN = process.env.TEST_MICROSOFT_REFRESH_TOKEN

describe.skipIf(!TEST_MICROSOFT_REFRESH_TOKEN)('microsoft-calendar', () => {
  const token = TEST_MICROSOFT_REFRESH_TOKEN!  // eslint-disable-line
  let user: UserSession

  beforeAll(async () => {
    user = { name: 'Test', email: 'calendar-test@test.com', applications: ['startpage'] }
    await transactional(db => setMicrosoftToken(db, user.email, {
      access_token: '',
      refresh_token: token,
      expires_at: 0,
    }))
  })

  test('getCalendars returns calendars', async () => {
    const calendars = await getCalendars(user)

    expect(calendars.length).toBeGreaterThan(0)
    expect(calendars[0]).toHaveProperty('id')
    expect(calendars[0]).toHaveProperty('name')
    expect(typeof calendars[0].name).toBe('string')
  })

  test('getAllEvents returns events with Temporal types', async () => {
    const events = await getAllEvents(user)

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
    const now = Temporal.Now.instant()
    const nextWeek = now.add({ hours: 7 * 24 })

    const events = await getAllEvents(user, now, nextWeek)

    expect(Array.isArray(events)).toBe(true)
  })
})
