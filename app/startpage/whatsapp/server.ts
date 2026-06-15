/* eslint-disable @typescript-eslint/no-unsafe-assignment */
'use server'
import { getAuthenticatedUserSession } from '@/app/common/auth/auth'
import { nontransactional, transactional } from '@/app/shared/_external/db/access'
import { ActionResponse, toResponse } from '@/app/shared/_helper/ActionResponse'
import { logger } from '@/app/shared/logger'
import { Chat, Contact, findChatsByOwner, findContactsByOwner, findLidMappingsByOwner, findMessagesByChatId, LidMapping, Message } from '@/app/startpage/_data/Chat'
import { startSync, SyncHandler } from '../_external/whatsapp/sync'
import { logEvent } from '@/app/shared/_data/Event'

export async function loadChats(): Promise<[Chat[], Contact[], LidMapping[]]> {
  const user = await getAuthenticatedUserSession('startpage')
  return nontransactional(async (c) => {
    return [
      (await findChatsByOwner(c, user.email)).filter(chat => chat.unread_count !== undefined && chat.archived !== undefined),
      await findContactsByOwner(c, user.email),
      await findLidMappingsByOwner(c, user.email)]
  })
}

export async function loadMessages(chatId: string): Promise<Message[]> {
  const user = await getAuthenticatedUserSession('startpage')
  return nontransactional(async (c) => {
    return findMessagesByChatId(c, user.email, chatId)
  })
}

const runningSyncs = new Map<string, { data: string | undefined, timeout: NodeJS.Timeout, handler: SyncHandler }>()

export async function getUpdates(): ActionResponse<string | undefined> {
  return toResponse(nontransactional(async () => {
    const user = await getAuthenticatedUserSession('startpage')
    const runningSync = runningSyncs.get(user.email)
    if (!runningSync) {
      await startNewSync(user.email)
      return undefined
    }
    clearTimeout(runningSync.timeout)
    runningSync.timeout = setTimeout(() => { closeSync(user.email) }, 5 * 1000)
    return runningSync.data
  }))
}

function closeSync(userEmail: string): void {
  logger.info('WhatsApp sync timeout reached, closing sync handler')
  const runningSync = runningSyncs.get(userEmail)
  if (!runningSync) {
    logger.warn(`No WhatsApp sync handler found for user ${userEmail} when trying to close after timeout`)
    return
  }
  runningSyncs.delete(userEmail)
  runningSync.handler.close()
    .then(() => logger.debug('WhatsApp sync handler closed successfully after timeout'))
    .catch((error: unknown) => {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      logger.error(`Error closing WhatsApp sync handler after timeout: ${errorMessage}`)
    })
}

async function startNewSync(userEmail: string) {
  // Short hack to set up handler correctely
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const runningSync: { data: string | undefined, timeout: NodeJS.Timeout, handler: SyncHandler } = { data: undefined } as any

  function qrCallback(qr: string): void {
    const message = `WhatsApp authentication requires QR code for user ${userEmail}`
    logger.info(message)
    void transactional(async (c) => { await logEvent(c, 'INFO', message) })
    runningSync.data = JSON.stringify({ event: 'qr', data: qr })
  }

  function authCallback() {
    const message = `WhatsApp authentication successful for user ${userEmail}`
    logger.info(message)
    void transactional(async (c) => { await logEvent(c, 'INFO', message) })
    runningSync.data = JSON.stringify({ event: 'authenticated' })
  }

  function readyCallback() {
    runningSync.data = JSON.stringify({ event: 'ready' })
  }

  function errorCallback(error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const message = `WhatsApp sync failed for user ${userEmail}: ${errorMessage}`
    logger.error(message)
    void transactional(async (c) => { await logEvent(c, 'ERROR', message) })
    runningSync.data = JSON.stringify({ event: 'failed', data: message })
  }

  logger.info(`Start whatsapp sync for ${userEmail}`)
  const callbacks = { qrCallback, authCallback, readyCallback, errorCallback }
  // TODO: Use real sync
  // runningSync.handler = await startSync(userEmail, callbacks)
  runningSync.handler = await startSync(userEmail, callbacks)
  runningSync.timeout = setTimeout(() => { closeSync(userEmail) }, 5 * 1000)
  runningSyncs.set(userEmail, runningSync)
}
