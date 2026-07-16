import { Temporal } from '@js-temporal/polyfill'
import { graphApiRequest, toGraphDateTime, toInstant } from './microsoft'
import { UserSession } from '@/app/shared/auth/auth'
import { transactional } from '@/app/shared/_external/db/access'
import { logEvent } from '@/app/shared/_data/Event'
import { logger } from '@/app/shared/logger'

export interface MicrosoftCalendar {
  id: string
  name: string
  color: string
  hexColor: string
  isDefaultCalendar: boolean
  canEdit: boolean
  canShare: boolean
  canViewPrivateItems: boolean
  owner: { name: string, address: string }
}

export async function getCalendars(user: UserSession): Promise<MicrosoftCalendar[]> {
  return await graphApiRequest(user, '/me/calendars', async (request) => {
    const response = await request.get() as { value: MicrosoftCalendar[] }
    return response.value
  })
}

export interface MicrosoftCalendarEvent {
  id: string
  subject: string
  bodyPreview: string
  body: { contentType: 'text' | 'html', content: string }
  start: Temporal.Instant
  end: Temporal.Instant
  location: { displayName: string, uniqueIdType: string }
  isAllDay: boolean
  isCancelled: boolean
  showAs: 'free' | 'tentative' | 'busy' | 'oof' | 'workingElsewhere' | 'unknown'
  importance: 'low' | 'normal' | 'high'
  sensitivity: 'normal' | 'private' | 'personal' | 'confidential'
  createdDateTime: Temporal.Instant
  lastModifiedDateTime: Temporal.Instant
  organizer: { emailAddress: { name: string, address: string } }
  calendarName?: string
}

export async function getAllEvents(user: UserSession, startDateTime?: Temporal.Instant, endDateTime?: Temporal.Instant): Promise<MicrosoftCalendarEvent[]> {
  const now = Temporal.Now.instant()
  const start = (startDateTime ?? now).toString().replace('Z', '')
  const end = (endDateTime ?? now.add({ hours: 7 * 24 })).toString().replace('Z', '')
  return await graphApiRequest(user, '/me/calendarView', async (request) => {
    const response = await request
      .query({ startDateTime: start, endDateTime: end })
      .select('id,subject,bodyPreview,body,start,end,location,isAllDay,isCancelled,showAs,importance,sensitivity,createdDateTime,lastModifiedDateTime,organizer')
      .top(100)
      .orderby('start/dateTime')
      .get() as { value: RawCalendarEvent[] }
    return response.value.map(convertCalendarEvent)
  })
}

export interface EventCounts {
  eventsToday: number
  eventsThisWeek: number
}

export async function getEventCount(user: UserSession): Promise<EventCounts> {
  const now = Temporal.Now.instant()
  const todayStart = now.toZonedDateTimeISO('UTC').with({ hour: 0, minute: 0, second: 0, millisecond: 0 }).toInstant()
  const todayEnd = todayStart.add({ hours: 24 })
  const weekEnd = todayStart.add({ hours: 7 * 24 })
  const events = await getAllEvents(user, now, weekEnd)
  let eventsToday = 0
  let eventsThisWeek = 0
  for (const event of events) {
    if (event.isCancelled) continue
    if (Temporal.Instant.compare(event.start, todayStart) >= 0 && Temporal.Instant.compare(event.start, todayEnd) < 0) eventsToday++
    else eventsThisWeek++
  }
  return { eventsToday, eventsThisWeek }
}

export async function createEvent(
  user: UserSession,
  calendarId: string,
  subject: string,
  start: Temporal.Instant,
  end: Temporal.Instant,
  body?: string,
  location?: string,
): Promise<MicrosoftCalendarEvent> {
  return await transactional(async (tx) => {
    const response = await graphApiRequest(user, `/me/calendars/${calendarId}/events`, async (request) => {
      const eventBody: Record<string, unknown> = {
        subject,
        start: toGraphDateTime(start),
        end: toGraphDateTime(end),
      }
      if (body) eventBody.body = { contentType: 'text', content: body }
      if (location) eventBody.location = { displayName: location }
      return await request.post(eventBody) as RawCalendarEvent
    })
    const event = convertCalendarEvent(response)
    await logEvent(tx, 'INFO', `Created calendar event "${subject}"`)
    return event
  }).catch(async (error: unknown) => {
    logger.warn(`Failed to create calendar event "${subject}"`, error)
    await transactional(async (tx) => { await logEvent(tx, 'ERROR', `Failed to create calendar event "${subject}"`) })
    throw error
  })
}

interface RawCalendarEvent {
  id: string
  subject: string
  bodyPreview: string
  body: { contentType: 'text' | 'html', content: string }
  start: { dateTime: string, timeZone: string }
  end: { dateTime: string, timeZone: string }
  location: { displayName: string, uniqueIdType: string }
  isAllDay: boolean
  isCancelled: boolean
  showAs: 'free' | 'tentative' | 'busy' | 'oof' | 'workingElsewhere' | 'unknown'
  importance: 'low' | 'normal' | 'high'
  sensitivity: 'normal' | 'private' | 'personal' | 'confidential'
  createdDateTime: string
  lastModifiedDateTime: string
  organizer: { emailAddress: { name: string, address: string } }
  calendarName?: string
}

function convertCalendarEvent(raw: RawCalendarEvent): MicrosoftCalendarEvent {
  return {
    id: raw.id,
    subject: raw.subject,
    bodyPreview: raw.bodyPreview,
    body: raw.body,
    start: toInstant(raw.start.dateTime, raw.start.timeZone),
    end: toInstant(raw.end.dateTime, raw.end.timeZone),
    location: raw.location,
    isAllDay: raw.isAllDay,
    isCancelled: raw.isCancelled,
    showAs: raw.showAs,
    importance: raw.importance,
    sensitivity: raw.sensitivity,
    createdDateTime: toInstant(raw.createdDateTime, ''),
    lastModifiedDateTime: toInstant(raw.lastModifiedDateTime, ''),
    organizer: raw.organizer,
    calendarName: raw.calendarName,
  }
}
