import type { ToolSet } from 'ai';
import { tool } from 'ai'
import { z } from 'zod/v4'
import type { UserSession } from '../session'
import { type MicrosoftCalendarEvent, getMicrosoftCalendarWorker } from '../microsoft/calendar'
import { toInstant } from '../microsoft/graph'

export default function getTools(user: UserSession): ToolSet {
  const listCalendars = tool({
    description: 'List all Microsoft Outlook calendars.',
    execute: async () => {
      const worker = await getMicrosoftCalendarWorker(user)
      if (worker.getStatus() !== 'connected') {throw new Error('Microsoft Calendar is not connected yet. Please try again in a moment.')}
      return worker.getCalendars()
    },
    inputSchema: z.object({}),
    outputSchema: z.array(calendarSchema),
  }),

   listCalendarEvents = tool({
    description: 'List calendar events within an optional date range. If no dates are provided, returns events from now to 7 days ahead.',
    execute: async ({ startDateTime, endDateTime }) => {
      const start = startDateTime ? toInstant(startDateTime, '') : undefined,
       end = endDateTime ? toInstant(endDateTime, '') : undefined,
       worker = await getMicrosoftCalendarWorker(user)
      if (worker.getStatus() !== 'connected') {throw new Error('Microsoft Calendar is not connected yet. Please try again in a moment.')}
      const events = worker.getAllEvents(start, end)
      return events.map(convertEventForOutput)
    },
    inputSchema: z.object({
      endDateTime: z.string().describe('The end of the date range in ISO 8601 format (e.g. 2025-07-22T00:00:00Z). Defaults to 7 days from start.').optional(),
      startDateTime: z.string().describe('The start of the date range in ISO 8601 format (e.g. 2025-07-15T00:00:00Z). Defaults to now.').optional(),
    }),
    outputSchema: z.array(calendarEventSchema),
  }),

   createCalendarEvent = tool({
    description: 'Create a new calendar event on a specified calendar.',
    execute: async ({ calendarId, subject, startDateTime, endDateTime, body, location }) => {
      const start = toInstant(startDateTime, ''),
       end = toInstant(endDateTime, ''),
       worker = await getMicrosoftCalendarWorker(user)
      if (worker.getStatus() !== 'connected') {throw new Error('Microsoft Calendar is not connected yet. Please try again in a moment.')}
      const result = await worker.createEvent(user, calendarId, subject, start, end, body, location)
      return convertEventForOutput(result)
    },
    inputSchema: z.object({
      body: z.string().describe('The event body/description (plain text)').optional(),
      calendarId: z.string().describe('The ID of the calendar to add the event to'),
      endDateTime: z.string().describe('The event end date and time in ISO 8601 format (e.g. 2025-07-15T10:00:00Z)'),
      location: z.string().describe('The event location display name').optional(),
      startDateTime: z.string().describe('The event start date and time in ISO 8601 format (e.g. 2025-07-15T09:00:00Z)'),
      subject: z.string().describe('The event subject/title'),
    }),
    outputSchema: calendarEventSchema,
  })

  return {
    create_calendar_event: createCalendarEvent,
    list_calendar_events: listCalendarEvents,
    list_calendars: listCalendars,
  }
}

const calendarSchema = z.object({
  canEdit: z.boolean().describe('Whether the user can edit this calendar'),
  canShare: z.boolean().describe('Whether the user can share this calendar'),
  canViewPrivateItems: z.boolean().describe('Whether the user can view private items'),
  color: z.string().describe('The calendar color'),
  hexColor: z.string().describe('The calendar hex color'),
  id: z.string().describe('The calendar ID'),
  isDefaultCalendar: z.boolean().describe('Whether this is the default calendar'),
  name: z.string().describe('The calendar display name'),
  owner: z.object({ address: z.string(), name: z.string() }).describe('The calendar owner'),
}),

 calendarEventSchema = z.object({
  bodyPreview: z.string().describe('A preview of the event body'),
  end: z.string().describe('The event end date and time in ISO 8601 format'),
  id: z.string().describe('The event ID'),
  importance: z.enum(['low', 'normal', 'high']).describe('The event importance'),
  isAllDay: z.boolean().describe('Whether this is an all-day event'),
  isCancelled: z.boolean().describe('Whether this event is cancelled'),
  location: z.object({ displayName: z.string(), uniqueIdType: z.string() }).describe('The event location'),
  organizer: z.object({ emailAddress: z.object({ address: z.string(), name: z.string() }) }).describe('The event organizer'),
  sensitivity: z.enum(['normal', 'private', 'personal', 'confidential']).describe('The event sensitivity'),
  showAs: z.enum(['free', 'tentative', 'busy', 'oof', 'workingElsewhere', 'unknown']).describe('The event show-as status'),
  start: z.string().describe('The event start date and time in ISO 8601 format'),
  subject: z.string().describe('The event subject/title'),
})

function convertEventForOutput(event: MicrosoftCalendarEvent): z.infer<typeof calendarEventSchema> {
  return {
    bodyPreview: event.bodyPreview,
    end: event.end.toString(),
    id: event.id,
    importance: event.importance,
    isAllDay: event.isAllDay,
    isCancelled: event.isCancelled,
    location: event.location,
    organizer: event.organizer,
    sensitivity: event.sensitivity,
    showAs: event.showAs,
    start: event.start.toString(),
    subject: event.subject,
  }
}
