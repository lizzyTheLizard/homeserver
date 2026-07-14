import { Client } from '@microsoft/microsoft-graph-client'
import { Temporal } from '@js-temporal/polyfill'
import { UserSession } from '@/app/shared/auth/auth'
import { createGraphApiClient, toInstant } from './microsoft'
import { logger } from '@/app/shared/logger'

export type InferenceClassification = 'focused' | 'other'

export interface MicrosoftMessageListItem {
  id: string
  subject: string
  from: { emailAddress: { address: string, name?: string } }
  toRecipients: { emailAddress: { address: string, name?: string } }[]
  receivedDateTime: Temporal.Instant
  isRead: boolean
  bodyPreview: string
  inferenceClassification?: InferenceClassification
}

export async function getInboxMessages(user: UserSession): Promise<MicrosoftMessageListItem[]> {
  const client = await createGraphApiClient(user)
  if (!client) return []
  const response = await client.api('/me/mailFolders/inbox/messages')
    .top(1000)
    .select('id,subject,from,toRecipients,receivedDateTime,isRead,bodyPreview,inferenceClassification')
    .orderby('receivedDateTime desc')
    .get() as { value: RawMessageListItem[] }
  if (response.value.length >= 1000) {
    logger.warn('getInboxMessages returned maximum of 1000 results; some inbox messages may be missing')
  }
  return response.value.map(convertMessageListItem)
}

export async function searchArchiveMessages(user: UserSession, query: string): Promise<MicrosoftMessageListItem[]> {
  const client = await createGraphApiClient(user)
  if (!client) return []
  const archiveFolder = await getArchiveFolder(client)
  if (!archiveFolder) return []
  const response = await client.api(`/me/mailFolders/${archiveFolder}/messages`)
    .search(query)
    .top(20)
    .select('id,subject,from,toRecipients,receivedDateTime,isRead,bodyPreview')
    .get() as { value: RawMessageListItem[] }
  return response.value.map(convertMessageListItem)
}

export interface MicrosoftMessageFull extends MicrosoftMessageListItem {
  body: { contentType: string, content: string }
}

export async function getMessage(user: UserSession, messageId: string): Promise<MicrosoftMessageFull | undefined> {
  const client = await createGraphApiClient(user)
  if (!client) return undefined
  const raw = await client.api(`/me/messages/${messageId}`)
    .select('id,subject,from,toRecipients,receivedDateTime,isRead,bodyPreview,body')
    .get() as RawMessageFull
  return convertMessageFull(raw)
}

export async function sendMail(user: UserSession, to: string[], subject: string, body: string): Promise<void> {
  const client = await createGraphApiClient(user)
  if (!client) throw new Error('No Microsoft Graph client available. Please connect your Microsoft account.')
  const toRecipients = to.map(address => ({ emailAddress: { address } }))
  await client.api('/me/sendMail').post({
    message: { subject, body: { contentType: 'Text', content: body }, toRecipients },
    saveToSentItems: 'true',
  })
}

export async function archiveMessage(user: UserSession, messageId: string): Promise<void> {
  const client = await createGraphApiClient(user)
  if (!client) throw new Error('No Microsoft Graph client available. Please connect your Microsoft account.')
  const archiveFolder = await getArchiveFolder(client)
  if (!archiveFolder) throw new Error('Archive folder not found. Please check your Outlook setup.')
  await client.api(`/me/messages/${messageId}/move`).post({ destinationId: archiveFolder })
}

export interface InboxCount {
  focused: number
  focusedUnread: number
  other: number
  otherUnread: number
}

export async function getInboxCount(user: UserSession): Promise<InboxCount> {
  const client = await createGraphApiClient(user)
  if (!client) return { focused: 0, focusedUnread: 0, other: 0, otherUnread: 0 }
  const response = await client.api('/me/mailFolders/inbox/messages')
    .top(1000)
    .select('inferenceClassification,isRead')
    .get() as { value: { inferenceClassification: InferenceClassification, isRead: boolean }[] }
  if (response.value.length >= 1000) {
    logger.warn('getInboxCount returned maximum of 1000 results; counts may be incomplete')
  }
  let focused = 0, focusedUnread = 0, other = 0, otherUnread = 0
  for (const m of response.value) {
    if (m.inferenceClassification === 'focused') {
      focused++
      if (!m.isRead) focusedUnread++
    }
    else {
      other++
      if (!m.isRead) otherUnread++
    }
  }
  return { focused, focusedUnread, other, otherUnread }
}

async function getArchiveFolder(client: Client): Promise<string | undefined> {
  const response = await client.api('/me/mailFolders')
    .filter('displayName eq \'Archive\'')
    .select('id')
    .get() as { value: { id: string }[] }
  return response.value[0]?.id
}

interface RawMessageListItem {
  id: string
  subject: string
  from: { emailAddress: { address: string, name?: string } }
  toRecipients: { emailAddress: { address: string, name?: string } }[]
  receivedDateTime: string
  isRead: boolean
  bodyPreview: string
  inferenceClassification?: InferenceClassification
}

interface RawMessageFull extends RawMessageListItem {
  body: { contentType: string, content: string }
}

function convertMessageListItem(raw: RawMessageListItem): MicrosoftMessageListItem {
  return {
    id: raw.id,
    subject: raw.subject,
    from: raw.from,
    toRecipients: raw.toRecipients,
    receivedDateTime: toInstant(raw.receivedDateTime, ''),
    isRead: raw.isRead,
    bodyPreview: raw.bodyPreview,
    inferenceClassification: raw.inferenceClassification,
  }
}

function convertMessageFull(raw: RawMessageFull): MicrosoftMessageFull {
  return {
    ...convertMessageListItem(raw),
    body: raw.body,
  }
}
