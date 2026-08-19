import { Temporal } from '@js-temporal/polyfill'
import { Mutex } from 'async-mutex'
import { UserSession } from '@/app/shared/auth/session'
import { DeltaResponse, graphApiRequest, toInstant } from './graph'
import { logger } from '@/app/shared/logger'
import { logEvent } from '@/app/shared/_data/Event'

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

export interface MicrosoftMessageFull extends MicrosoftMessageListItem {
  body: { contentType: string, content: string }
}

export interface InboxCount {
  focused: number
  focusedUnread: number
  other: number
  otherUnread: number
}

export interface MicrosoftMailWorker {
  getInboxMessages(): MicrosoftMessageListItem[]
  getMessage(messageId: string): Promise<MicrosoftMessageFull | undefined>
  getInboxCount(): InboxCount
  getStatus(): string
  sendMail(user: UserSession, to: string[], subject: string, body: string): Promise<void>
  archiveMessage(user: UserSession, messageId: string): Promise<void>
  archiveMessagesFromSender(user: UserSession, senderEmail: string): Promise<number>
  touch(): void
}

export async function getMicrosoftMailWorker(user: UserSession): Promise<MicrosoftMailWorker> {
  return await facadeMutex.runExclusive(() => {
    const existing = globalThis.microsoftMailWorkers?.get(user.email)
    if (existing) {
      existing.touch()
      return existing
    }
    const worker = createMicrosoftMailWorker(user)
    globalThis.microsoftMailWorkers?.set(user.email, worker)
    return worker
  })
}

declare global {
  var microsoftMailWorkers: Map<string, MicrosoftMailWorker> | undefined
}
globalThis.microsoftMailWorkers ??= new Map<string, MicrosoftMailWorker>()

const facadeMutex = new Mutex()
const inactivityTimeoutMs = 5 * 60 * 1000
const deltaPollIntervalMs = 15 * 1000

function createMicrosoftMailWorker(user: UserSession): MicrosoftMailWorker {
  const userId = user.email
  const messages = new Map<string, MicrosoftMessageListItem>()
  const mutex = new Mutex()
  let deltaLink: string | undefined
  let interval: ReturnType<typeof setInterval> | undefined
  let timeout: ReturnType<typeof setTimeout> | undefined
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
    globalThis.microsoftMailWorkers?.delete(userId)
  }

  function touch(): void {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(close, inactivityTimeoutMs)
  }

  function getInboxMessages(): MicrosoftMessageListItem[] {
    return Array.from(messages.values())
      .sort((a, b) => Temporal.Instant.compare(b.receivedDateTime, a.receivedDateTime))
  }

  function getStatus(): string { return status }

  async function getMessage(messageId: string): Promise<MicrosoftMessageFull | undefined> {
    return await graphApiRequest(user, `/me/messages/${messageId}`, async (request) => {
      const response = await request
        .select('id,subject,from,toRecipients,receivedDateTime,isRead,bodyPreview,body')
        .get() as RawMessageFull
      return convertMessageFull(response)
    })
  }

  function getInboxCount(): InboxCount {
    let focused = 0, focusedUnread = 0, other = 0, otherUnread = 0
    for (const m of messages.values()) {
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

  async function sendMail(user: UserSession, to: string[], subject: string, body: string): Promise<void> {
    try {
      const toRecipients = to.map(address => ({ emailAddress: { address } }))
      logger.debug(`Send mail to ${to.join(', ')}`)
      await graphApiRequest(user, `/me/sendMail`, async (request) => {
        await request.post({
          message: { subject, body: { contentType: 'Text', content: body }, toRecipients },
          saveToSentItems: 'true',
        })
      })
      await logEvent(undefined, 'INFO', `Sent Outlook email to ${to.join(', ')}`)
    }
    catch (error: unknown) {
      logger.warn(`Failed to send Outlook email to ${to.join(', ')}`, error)
      await logEvent(undefined, 'ERROR', `Failed to send Outlook email to ${to.join(', ')}`)
      throw error
    }
  }

  async function archiveMessage(user: UserSession, messageId: string): Promise<void> {
    try {
      const message = messages.get(messageId)
      if (!message) throw new Error(`Message with ID ${messageId} not found in cache`)
      messages.delete(messageId)
      const archiveFolder = await getArchiveFolder(user)
      if (!archiveFolder) throw new Error('Archive folder not found. Please check your Outlook setup.')
      logger.debug(`Archive mail ${messageId}`)
      await graphApiRequest(user, `/me/messages/${messageId}/move`, async (request) => {
        await request.post({ destinationId: archiveFolder })
      })
      await logEvent(undefined, 'INFO', `Archived Outlook email from ${message.from.emailAddress.address} with subject "${message.subject}"`)
    }
    catch (error: unknown) {
      const message = messages.get(messageId)
      logger.warn(`Failed to archive Outlook email from ${message?.from.emailAddress.address ?? 'unknown'} with subject "${message?.subject ?? 'unknown'}"`, error)
      await logEvent(undefined, 'ERROR', `Failed to archive Outlook email from ${message?.from.emailAddress.address ?? 'unknown'} with subject "${message?.subject ?? 'unknown'}"`)
      throw error
    }
  }

  async function archiveMessagesFromSender(user: UserSession, senderEmail: string): Promise<number> {
    return mutex.runExclusive(async () => {
      const matching = Array.from(messages.values())
        .filter(m => m.from.emailAddress.address === senderEmail)
      if (matching.length === 0) return 0
      const archiveFolder = await getArchiveFolder(user)
      if (!archiveFolder) throw new Error('Archive folder not found. Please check your Outlook setup.')
      for (const msg of matching) {
        messages.delete(msg.id)
        logger.debug(`Archive mail ${msg.id}`)
        await graphApiRequest(user, `/me/messages/${msg.id}/move`, async (request) => {
          await request.post({ destinationId: archiveFolder })
        })
      }
      await logEvent(undefined, 'INFO', `Archived ${matching.length.toString()} Outlook emails from ${senderEmail}`)
      return matching.length
    }).catch(async (error: unknown) => {
      logger.warn(`Failed to archive Outlook emails from ${senderEmail}`, error)
      await logEvent(undefined, 'ERROR', `Failed to archive Outlook emails from ${senderEmail}`)
      throw error
    })
  }

  async function doInitialFetch(): Promise<void> {
    messages.clear()
    await syncMessages('/me/mailFolders/inbox/messages/delta')
    logger.debug(`[MicrosoftMailWorker] Initial fetch complete for user ${userId}: ${String(messages.size)} messages`)
  }

  async function doDeltaPoll(): Promise<void> {
    if (!deltaLink) throw new Error('Delta link is not set. Initial fetch must be completed before delta polling can occur.')
    await syncMessages(deltaLink)
    logger.debug(`[MicrosoftMailWorker] Delta poll complete for user ${userId}: ${String(messages.size)} messages`)
  }

  async function syncMessages(url: string): Promise<void> {
    let currentUrl: string | undefined = url
    while (currentUrl) {
      const deltaResult: DeltaResponse<RawMessageListItem> = await graphApiRequest(user, currentUrl, async (request) => {
        return await request.get() as DeltaResponse<RawMessageListItem>
      })
      for (const item of deltaResult.value) {
        if (item['@removed']) messages.delete(item.id)
        else messages.set(item.id, convertMessageListItem(item))
      }
      if (deltaResult['@odata.nextLink']) {
        currentUrl = deltaResult['@odata.nextLink']
      }
      else {
        if (deltaResult['@odata.deltaLink']) deltaLink = deltaResult['@odata.deltaLink']
        currentUrl = undefined
      }
    }
  }

  status = 'connecting'
  doInitialFetch()
    .then(() => { status = 'connected' })
    .catch((error: unknown) => {
      status = 'error'
      logger.warn(`[MicrosoftMailWorker] Initial fetch failed for user ${userId}`, error)
    })
  interval = setInterval(() => {
    doDeltaPoll()
      .catch((error: unknown) => {
        logger.warn(`[MicrosoftMailWorker] Poll crash for user ${userId}`, error)
        status = 'connecting'
        doInitialFetch()
          .then(() => { status = 'connected' })
          .catch((error: unknown) => {
            status = 'error'
            logger.warn(`[MicrosoftMailWorker] Re-fetch after poll crash failed for user ${userId}`, error)
          })
      })
  }, deltaPollIntervalMs)
  timeout = setTimeout(close, inactivityTimeoutMs)

  return { getInboxMessages, getMessage, getInboxCount, getStatus, sendMail, archiveMessage, archiveMessagesFromSender, touch }
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
  'id': string
  'subject': string
  'from': { emailAddress: { address: string, name?: string } }
  'toRecipients': { emailAddress: { address: string, name?: string } }[]
  'receivedDateTime': string
  'isRead': boolean
  'bodyPreview': string
  'inferenceClassification'?: InferenceClassification
  '@removed'?: { reason: string }
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
