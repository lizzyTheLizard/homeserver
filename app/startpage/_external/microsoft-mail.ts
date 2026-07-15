import { Temporal } from '@js-temporal/polyfill'
import { UserSession } from '@/app/shared/auth/auth'
import { graphApiRequest, toInstant } from './microsoft'
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
  return await graphApiRequest(user, '/me/mailFolders/inbox/messages', async (request) => {
    const response = await request.top(1000)
      .select('id,subject,from,toRecipients,receivedDateTime,isRead,bodyPreview,inferenceClassification')
      .orderby('receivedDateTime desc')
      .get() as { value: RawMessageListItem[] }
    if (response.value.length >= 1000) {
      logger.warn('getInboxMessages returned maximum of 1000 results; some inbox messages may be missing')
    }
    return response.value.map(convertMessageListItem)
  })
}

export async function searchArchiveMessages(user: UserSession, query: string): Promise<MicrosoftMessageListItem[]> {
  const archiveFolder = await getArchiveFolder(user)
  if (!archiveFolder) return []
  logger.debug(`Fetch data from GraphAPI /me/mailFolders/${archiveFolder}/messages`)
  return await graphApiRequest(user, `/me/mailFolders/${archiveFolder}/messages`, async (request) => {
    const response = await request.search(query)
      .top(20)
      .select('id,subject,from,toRecipients,receivedDateTime,isRead,bodyPreview')
      .get() as { value: RawMessageListItem[] }
    return response.value.map(convertMessageListItem)
  })
}

export interface MicrosoftMessageFull extends MicrosoftMessageListItem {
  body: { contentType: string, content: string }
}

export async function getMessage(user: UserSession, messageId: string): Promise<MicrosoftMessageFull | undefined> {
  return await graphApiRequest(user, `/me/messages/${messageId}`, async (request) => {
    const response = await request
      .select('id,subject,from,toRecipients,receivedDateTime,isRead,bodyPreview,body')
      .get() as RawMessageFull
    return convertMessageFull(response)
  })
}

export async function sendMail(user: UserSession, to: string[], subject: string, body: string): Promise<void> {
  const toRecipients = to.map(address => ({ emailAddress: { address } }))
  logger.debug(`Send mail to ${to.join(', ')}`)
  await graphApiRequest(user, `/me/sendMail`, async (request) => {
    await request.post({
      message: { subject, body: { contentType: 'Text', content: body }, toRecipients },
      saveToSentItems: 'true',
    })
  })
}

export async function archiveMessage(user: UserSession, messageId: string): Promise<void> {
  const archiveFolder = await getArchiveFolder(user)
  if (!archiveFolder) throw new Error('Archive folder not found. Please check your Outlook setup.')
  logger.debug(`Archive mail`)
  await graphApiRequest(user, `/me/messages/${messageId}/move`, async (request) => {
    await request.post({ destinationId: archiveFolder })
  })
}

export interface InboxCount {
  focused: number
  focusedUnread: number
  other: number
  otherUnread: number
}

export async function getInboxCount(user: UserSession): Promise<InboxCount> {
  return await graphApiRequest(user, `/me/mailFolders/inbox/messages`, async (request) => {
    const response = await request.top(1000)
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
  })
}

async function getArchiveFolder(user: UserSession): Promise<string | undefined> {
  return await graphApiRequest(user, '/me/mailFolders', async (request) => {
    const response = await request
      .filter('displayName eq \'Archive\'')
      .select('id')
      .get() as { value: { id: string }[] }
    return response.value[0]?.id
  })
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
