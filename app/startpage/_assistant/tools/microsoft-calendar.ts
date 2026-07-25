import { tool, ToolSet } from 'ai'
import { z } from 'zod/v4'
import { UserSession } from '@/app/shared/auth/auth'
import { getMicrosoftCalendarWorker, type MicrosoftCalendarEvent } from '../../_external/microsoft-calendar'
import { toInstant } from '../../_external/microsoft'

export default function getTools(user: UserSession): ToolSet {
  const listCalendars = tool({
    description: 'List all Microsoft Outlook calendars.',
    inputSchema: z.object({}),
    outputSchema: z.array(calendarSchema),
    execute: async () => {
      const worker = await getMicrosoftCalendarWorker(user)
      return worker.getCalendars()
    },
  })

  const listCalendarEvents = tool({
    description: 'List calendar events within an optional date range. If no dates are provided, returns events from now to 7 days ahead.',
    inputSchema: z.object({
      startDateTime: z.string().describe('The start of the date range in ISO 8601 format (e.g. 2025-07-15T00:00:00Z). Defaults to now.').optional(),
      endDateTime: z.string().describe('The end of the date range in ISO 8601 format (e.g. 2025-07-22T00:00:00Z). Defaults to 7 days from start.').optional(),
    }),
    outputSchema: z.array(calendarEventSchema),
    execute: async ({ startDateTime, endDateTime }) => {
      const start = startDateTime ? toInstant(startDateTime, '') : undefined
      const end = endDateTime ? toInstant(endDateTime, '') : undefined
      const worker = await getMicrosoftCalendarWorker(user)
      const events = worker.getAllEvents(start, end)
      return events.map(convertEventForOutput)
    },
  })

  const createCalendarEvent = tool({
    description: 'Create a new calendar event on a specified calendar.',
    inputSchema: z.object({
      calendarId: z.string().describe('The ID of the calendar to add the event to'),
      subject: z.string().describe('The event subject/title'),
      startDateTime: z.string().describe('The event start date and time in ISO 8601 format (e.g. 2025-07-15T09:00:00Z)'),
      endDateTime: z.string().describe('The event end date and time in ISO 8601 format (e.g. 2025-07-15T10:00:00Z)'),
      body: z.string().describe('The event body/description (plain text)').optional(),
      location: z.string().describe('The event location display name').optional(),
    }),
    outputSchema: calendarEventSchema,
    execute: async ({ calendarId, subject, startDateTime, endDateTime, body, location }) => {
      const start = toInstant(startDateTime, '')
      const end = toInstant(endDateTime, '')
      const worker = await getMicrosoftCalendarWorker(user)
      const result = await worker.createEvent(user, calendarId, subject, start, end, body, location)
      return convertEventForOutput(result)
    },
  })

  return {
    list_calendars: listCalendars,
    list_calendar_events: listCalendarEvents,
    create_calendar_event: createCalendarEvent,
  }
}

const calendarSchema = z.object({
  id: z.string().describe('The calendar ID'),
  name: z.string().describe('The calendar display name'),
  color: z.string().describe('The calendar color'),
  hexColor: z.string().describe('The calendar hex color'),
  isDefaultCalendar: z.boolean().describe('Whether this is the default calendar'),
  canEdit: z.boolean().describe('Whether the user can edit this calendar'),
  canShare: z.boolean().describe('Whether the user can share this calendar'),
  canViewPrivateItems: z.boolean().describe('Whether the user can view private items'),
  owner: z.object({ name: z.string(), address: z.string() }).describe('The calendar owner'),
})

const calendarEventSchema = z.object({
  id: z.string().describe('The event ID'),
  subject: z.string().describe('The event subject/title'),
  bodyPreview: z.string().describe('A preview of the event body'),
  start: z.string().describe('The event start date and time in ISO 8601 format'),
  end: z.string().describe('The event end date and time in ISO 8601 format'),
  location: z.object({ displayName: z.string(), uniqueIdType: z.string() }).describe('The event location'),
  isAllDay: z.boolean().describe('Whether this is an all-day event'),
  isCancelled: z.boolean().describe('Whether this event is cancelled'),
  showAs: z.enum(['free', 'tentative', 'busy', 'oof', 'workingElsewhere', 'unknown']).describe('The event show-as status'),
  importance: z.enum(['low', 'normal', 'high']).describe('The event importance'),
  sensitivity: z.enum(['normal', 'private', 'personal', 'confidential']).describe('The event sensitivity'),
  organizer: z.object({ emailAddress: z.object({ name: z.string(), address: z.string() }) }).describe('The event organizer'),
})

function convertEventForOutput(event: MicrosoftCalendarEvent): z.infer<typeof calendarEventSchema> {
  return {
    id: event.id,
    subject: event.subject,
    bodyPreview: event.bodyPreview,
    start: event.start.toString(),
    end: event.end.toString(),
    location: event.location,
    isAllDay: event.isAllDay,
    isCancelled: event.isCancelled,
    showAs: event.showAs,
    importance: event.importance,
    sensitivity: event.sensitivity,
    organizer: event.organizer,
  }
}
