export interface MicrosoftUserInfo {
  id: string
  userPrincipalName: string
  displayName: string
  mail: string
}

export interface SerializedCalendarEvent {
  id: string
  subject: string
  bodyPreview: string
  body: { contentType: 'text' | 'html', content: string }
  start: string
  end: string
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

export interface SerializedTodoTask {
  id: string
  title: string
  status: 'notStarted' | 'inProgress' | 'completed' | 'waitingOnOthers' | 'deferred'
  body?: { content: string, contentType: 'text' | 'html' }
  dueDate?: string
  reminderDateTime?: string
  createdDateTime: string
  lastModifiedDateTime: string
  importance: 'low' | 'normal' | 'high'
  listName: string
}

export interface SerializedMessageListItem {
  id: string
  subject: string
  from: { emailAddress: { address: string, name?: string } }
  toRecipients: { emailAddress: { address: string, name?: string } }[]
  receivedDateTime: string
  isRead: boolean
  bodyPreview: string
  inferenceClassification?: 'focused' | 'other'
}

export type SerializedMessageFull = SerializedMessageListItem & {
  body: { contentType: string, content: string }
}

export interface MicrosoftConnectionStatus {
  mailStatus: string
  todoStatus: string
  calendarStatus: string
}

export interface MicrosoftStatus extends MicrosoftConnectionStatus {
  connected: boolean
  userInfo?: MicrosoftUserInfo
  messages: SerializedMessageListItem[]
  todos: SerializedTodoTask[]
  events: SerializedCalendarEvent[]
}
