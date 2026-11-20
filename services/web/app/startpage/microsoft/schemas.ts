import { z } from 'zod'
import type { MicrosoftConnectionStatus, MicrosoftStatus, SerializedMessageFull, SerializedMessageListItem, SerializedCalendarEvent, SerializedTodoTask, MicrosoftUserInfo } from '@assistant/microsoft/types'

const recipient = z.object({ emailAddress: z.object({ address: z.string(), name: z.string().optional() }) })
const contentType = z.enum(['text', 'html'])
const importance = z.enum(['low', 'normal', 'high'])

const userInfoSchema = z.object({
  id: z.string(),
  userPrincipalName: z.string(),
  displayName: z.string(),
  mail: z.string(),
}) satisfies z.ZodType<MicrosoftUserInfo>

const messageListItemSchema = z.object({
  id: z.string(),
  subject: z.string(),
  from: recipient,
  toRecipients: z.array(recipient),
  receivedDateTime: z.string(),
  isRead: z.boolean(),
  bodyPreview: z.string(),
  inferenceClassification: z.enum(['focused', 'other']).optional(),
}) satisfies z.ZodType<SerializedMessageListItem>

const todoSchema = z.object({
  id: z.string(),
  title: z.string(),
  status: z.enum(['notStarted', 'inProgress', 'completed', 'waitingOnOthers', 'deferred']),
  body: z.object({ content: z.string(), contentType }).optional(),
  dueDate: z.string().optional(),
  reminderDateTime: z.string().optional(),
  createdDateTime: z.string(),
  lastModifiedDateTime: z.string(),
  importance,
  listName: z.string(),
}) satisfies z.ZodType<SerializedTodoTask>

const eventSchema = z.object({
  id: z.string(),
  subject: z.string(),
  bodyPreview: z.string(),
  body: z.object({ contentType, content: z.string() }),
  start: z.string(),
  end: z.string(),
  location: z.object({ displayName: z.string(), uniqueIdType: z.string() }),
  isAllDay: z.boolean(),
  isCancelled: z.boolean(),
  showAs: z.enum(['free', 'tentative', 'busy', 'oof', 'workingElsewhere', 'unknown']),
  importance,
  sensitivity: z.enum(['normal', 'private', 'personal', 'confidential']),
  createdDateTime: z.string(),
  lastModifiedDateTime: z.string(),
  organizer: z.object({ emailAddress: z.object({ name: z.string(), address: z.string() }) }),
  calendarName: z.string().optional(),
}) satisfies z.ZodType<SerializedCalendarEvent>

export const connectionStatusSchema = z.object({
  mailStatus: z.string(),
  todoStatus: z.string(),
  calendarStatus: z.string(),
}) satisfies z.ZodType<MicrosoftConnectionStatus>

export const statusSchema = connectionStatusSchema.extend({
  connected: z.boolean(),
  userInfo: userInfoSchema.optional(),
  messages: z.array(messageListItemSchema),
  todos: z.array(todoSchema),
  events: z.array(eventSchema),
}) satisfies z.ZodType<MicrosoftStatus>

export const messageFullSchema = messageListItemSchema.extend({
  body: z.object({ contentType: z.string(), content: z.string() }),
}) satisfies z.ZodType<SerializedMessageFull>

export const loginUrlSchema = z.object({ url: z.string() })
