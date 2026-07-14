import { Temporal } from '@js-temporal/polyfill'
import { createGraphApiClient, toInstant } from './microsoft'
import { UserSession } from '@/app/shared/auth/auth'

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
  const client = await createGraphApiClient(user)
  if (!client) return []
  const response = await client.api('/me/calendars').get() as { value: MicrosoftCalendar[] }
  return response.value
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
  const client = await createGraphApiClient(user)
  if (!client) return []
  const response = await client.api('/me/calendarView')
    .query({ startDateTime: start, endDateTime: end })
    .select('id,subject,bodyPreview,body,start,end,location,isAllDay,isCancelled,showAs,importance,sensitivity,createdDateTime,lastModifiedDateTime,organizer')
    .top(100)
    .orderby('start/dateTime')
    .get() as { value: RawCalendarEvent[] }
  return response.value.map(convertCalendarEvent)
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
