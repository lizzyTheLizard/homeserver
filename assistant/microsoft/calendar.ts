import { Temporal } from '@js-temporal/polyfill'
import { Mutex } from 'async-mutex'
import { DeltaResponse, graphApiRequest, toGraphDateTime, toInstant } from './graph'
import { UserSession } from '@/app/shared/auth/session'
import { logger } from '@/app/shared/logger'
import { logEvent } from '@/app/shared/_data/Event'

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

export interface EventCounts {
  eventsToday: number
  eventsThisWeek: number
}

export interface MicrosoftCalendarWorker {
  getCalendars(): MicrosoftCalendar[]
  getAllEvents(startDateTime?: Temporal.Instant, endDateTime?: Temporal.Instant): MicrosoftCalendarEvent[]
  getEventCount(): EventCounts
  getStatus(): string
  createEvent(user: UserSession, calendarId: string, subject: string, start: Temporal.Instant, end: Temporal.Instant, body?: string, location?: string): Promise<MicrosoftCalendarEvent>
  touch(): void
}

export async function getMicrosoftCalendarWorker(user: UserSession): Promise<MicrosoftCalendarWorker> {
  return facadeMutex.runExclusive(() => {
    const existing = globalThis.calendarWorkers?.get(user.email)
    if (existing) {
      existing.touch()
      return existing
    }
    const worker = createMicrosoftCalendarWorker(user)
    globalThis.calendarWorkers?.set(user.email, worker)
    return worker
  })
}

declare global {
  var calendarWorkers: Map<string, MicrosoftCalendarWorker> | undefined
}
globalThis.calendarWorkers ??= new Map<string, MicrosoftCalendarWorker>()

const facadeMutex = new Mutex()
const inactivityTimeoutMs = 5 * 60 * 1000
const deltaPollIntervalMs = 15 * 1000
const eventWindowMonths = 2

function createMicrosoftCalendarWorker(user: UserSession): MicrosoftCalendarWorker {
  const userId = user.email
  let calendars: MicrosoftCalendar[] = []
  const events = new Map<string, MicrosoftCalendarEvent>()
  let deltaLink: string | undefined
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
    globalThis.calendarWorkers?.delete(userId)
    logger.info(`[MicrosoftCalendarWorker] Worker stopped for user ${userId}`)
  }

  function touch(): void {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(close, inactivityTimeoutMs)
  }

  function getCalendars(): MicrosoftCalendar[] { return calendars }

  function getStatus(): string { return status }

  function getAllEvents(startDateTime?: Temporal.Instant, endDateTime?: Temporal.Instant): MicrosoftCalendarEvent[] {
    const now = Temporal.Now.instant()
    const windowEnd = now.toZonedDateTimeISO('UTC').add({ months: eventWindowMonths }).toInstant()
    const start = startDateTime ?? now
    const end = endDateTime ?? windowEnd

    if (Temporal.Instant.compare(end, windowEnd) > 0) {
      throw new Error(`Cannot retrieve events beyond the next ${eventWindowMonths.toString()} months. Only events within this window are kept in memory.`)
    }

    return Array.from(events.values())
      .filter(e => Temporal.Instant.compare(e.end, start) > 0 && Temporal.Instant.compare(e.start, end) < 0)
      .sort((a, b) => Temporal.Instant.compare(a.start, b.start))
  }

  function getEventCount(): EventCounts {
    const now = Temporal.Now.instant()
    const todayStart = now.toZonedDateTimeISO('UTC').with({ hour: 0, minute: 0, second: 0, millisecond: 0 }).toInstant()
    const todayEnd = todayStart.add({ hours: 24 })
    const weekEnd = todayStart.add({ hours: 7 * 24 })

    let eventsToday = 0
    let eventsThisWeek = 0
    for (const event of events.values()) {
      if (event.isCancelled) continue
      if (Temporal.Instant.compare(event.start, todayStart) >= 0 && Temporal.Instant.compare(event.start, todayEnd) < 0) eventsToday++
      else if (Temporal.Instant.compare(event.start, todayEnd) >= 0 && Temporal.Instant.compare(event.start, weekEnd) < 0) eventsThisWeek++
    }
    return { eventsToday, eventsThisWeek }
  }

  async function createEvent(
    createUser: UserSession,
    calendarId: string,
    subject: string,
    start: Temporal.Instant,
    end: Temporal.Instant,
    body?: string,
    location?: string,
  ): Promise<MicrosoftCalendarEvent> {
    try {
      const eventBody: Record<string, unknown> = {
        subject,
        start: toGraphDateTime(start),
        end: toGraphDateTime(end),
      }
      if (body) eventBody.body = { contentType: 'text', content: body }
      if (location) eventBody.location = { displayName: location }
      const response = await graphApiRequest(createUser, `/me/calendars/${calendarId}/events`, async (request) => {
        return await request.post(eventBody) as RawCalendarEvent
      })
      const event = convertCalendarEvent(response)
      const windowEnd = Temporal.Now.instant().toZonedDateTimeISO('UTC').add({ months: eventWindowMonths }).toInstant()
      if (Temporal.Instant.compare(event.start, windowEnd) <= 0) {
        events.set(event.id, event)
      }
      await logEvent(undefined, 'INFO', `Created calendar event "${subject}"`)
      return event
    }
    catch (error: unknown) {
      logger.warn(`Failed to create calendar event "${subject}"`, error)
      await logEvent(undefined, 'ERROR', `Failed to create calendar event "${subject}"`)
      throw error
    }
  }

  async function doInitialFetch(): Promise<void> {
    calendars = await graphApiRequest(user, '/me/calendars', async (request) => {
      const response = await request.get() as { value: MicrosoftCalendar[] }
      return response.value
    })
    events.clear()
    deltaLink = undefined

    const now = Temporal.Now.instant()
    const windowEnd = now.toZonedDateTimeISO('UTC').add({ months: eventWindowMonths }).toInstant()

    await syncCalendarEvents('/me/calendarView/delta', { startDateTime: now.toString(), endDateTime: windowEnd.toString() })

    const calendarCount = calendars.length
    const eventCount = events.size
    logger.debug(`[MicrosoftCalendarWorker] Initial fetch complete for user ${userId}: ${String(calendarCount)} calendars, ${String(eventCount)} events`)
  }

  async function doDeltaPoll(): Promise<void> {
    if (!deltaLink) throw new Error('Delta link is not set. Initial fetch must be completed before delta polling can occur.')
    await syncCalendarEvents(deltaLink)
    logger.debug(`[MicrosoftCalendarWorker] Delta poll complete for user ${userId}: ${String(events.size)} events`)
  }

  async function syncCalendarEvents(url: string, queryParams?: Record<string, string>): Promise<void> {
    let currentUrl: string | undefined = url
    let queryOnFirstCall = queryParams

    while (currentUrl) {
      const deltaResult: DeltaResponse<RawCalendarEvent & { '@removed'?: { reason: string } }> = await graphApiRequest(user, currentUrl, async (request) => {
        if (queryOnFirstCall) {
          const params = queryOnFirstCall
          queryOnFirstCall = undefined
          return await request
            .query(params)
            .select('id,subject,bodyPreview,body,start,end,location,isAllDay,isCancelled,showAs,importance,sensitivity,createdDateTime,lastModifiedDateTime,organizer')
            .get() as DeltaResponse<RawCalendarEvent & { '@removed'?: { reason: string } }>
        }
        return await request.get() as DeltaResponse<RawCalendarEvent & { '@removed'?: { reason: string } }>
      })

      for (const item of deltaResult.value) {
        if (item['@removed']) {
          events.delete(item.id)
        }
        else {
          const event = convertCalendarEvent(item)
          const windowEnd = Temporal.Now.instant().toZonedDateTimeISO('UTC').add({ months: eventWindowMonths }).toInstant()
          if (Temporal.Instant.compare(event.start, windowEnd) <= 0) {
            events.set(event.id, event)
          }
        }
      }

      if (deltaResult['@odata.nextLink']) {
        currentUrl = deltaResult['@odata.nextLink']
      }
      else {
        if (deltaResult['@odata.deltaLink']) {
          deltaLink = deltaResult['@odata.deltaLink']
        }
        currentUrl = undefined
      }
    }
  }

  status = 'connecting'
  doInitialFetch()
    .then(() => { status = 'connected' })
    .catch((error: unknown) => {
      status = 'error'
      logger.warn(`[MicrosoftCalendarWorker] Initial fetch failed for user ${userId}`, error)
    })
  interval = setInterval(() => {
    doDeltaPoll()
      .catch((error: unknown) => {
        logger.warn(`[MicrosoftCalendarWorker] Poll crash for user ${userId}`, error)
        status = 'connecting'
        doInitialFetch()
          .then(() => { status = 'connected' })
          .catch((error: unknown) => {
            status = 'error'
            logger.warn(`[MicrosoftCalendarWorker] Re-fetch after poll crash failed for user ${userId}`, error)
          })
      })
  }, deltaPollIntervalMs)
  timeout = setTimeout(close, inactivityTimeoutMs)

  return { getCalendars, getAllEvents, getEventCount, getStatus, createEvent, touch }
}

interface RawCalendarEvent {
  id: string
  subject?: string
  bodyPreview?: string
  body?: { contentType: 'text' | 'html', content: string }
  start: { dateTime: string, timeZone: string }
  end: { dateTime: string, timeZone: string }
  location?: { displayName: string, uniqueIdType: string }
  isAllDay?: boolean
  isCancelled?: boolean
  showAs?: 'free' | 'tentative' | 'busy' | 'oof' | 'workingElsewhere' | 'unknown'
  importance?: 'low' | 'normal' | 'high'
  sensitivity?: 'normal' | 'private' | 'personal' | 'confidential'
  createdDateTime?: string
  lastModifiedDateTime?: string
  organizer?: { emailAddress: { name: string, address: string } }
  calendarName?: string
}

function convertCalendarEvent(raw: RawCalendarEvent): MicrosoftCalendarEvent {
  return {
    id: raw.id,
    subject: raw.subject ?? '',
    bodyPreview: raw.bodyPreview ?? '',
    body: raw.body ?? { contentType: 'text', content: '' },
    start: toInstant(raw.start.dateTime, raw.start.timeZone),
    end: toInstant(raw.end.dateTime, raw.end.timeZone),
    location: raw.location ?? { displayName: '', uniqueIdType: '' },
    isAllDay: raw.isAllDay ?? false,
    isCancelled: raw.isCancelled ?? false,
    showAs: raw.showAs ?? 'free',
    importance: raw.importance ?? 'normal',
    sensitivity: raw.sensitivity ?? 'normal',
    createdDateTime: raw.createdDateTime ? toInstant(raw.createdDateTime, '') : Temporal.Now.instant(),
    lastModifiedDateTime: raw.lastModifiedDateTime ? toInstant(raw.lastModifiedDateTime, '') : Temporal.Now.instant(),
    organizer: raw.organizer ?? { emailAddress: { name: '', address: '' } },
    calendarName: raw.calendarName,
  }
}
