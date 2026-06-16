'use server'
import { UserSession } from '@/app/common/auth/auth'
import { logger } from '@/app/shared/logger'
import { transactional } from '@/app/shared/_external/db/access'
import { logEvent } from '@/app/shared/_data/Event'
import { startSync, SyncHandler } from './sync'
import { Mutex } from 'async-mutex'

export type RunningSyncStatus = { state: 'connecting' }
  | { state: 'qr', data: string }
  | { state: 'initialsync' }
  | { state: 'ready' }
  | { state: 'failed', data: string }

interface RunningSync {
  status: RunningSyncStatus
  timeout: NodeJS.Timeout
  handler: SyncHandler
}

declare global {
  var runningSyncs: Map<string, RunningSync> | undefined
  var mutex: Mutex | undefined
}

export function getRunningSyncData(user: UserSession): RunningSyncStatus {
  return getSync(user).status
}

export async function triggerWhatsappSync(user: UserSession): Promise<void> {
  globalThis.mutex ??= new Mutex()
  await globalThis.mutex.runExclusive(async () => {
    globalThis.runningSyncs ??= new Map()
    const existing = globalThis.runningSyncs.get(user.email)
    if (existing) {
      clearTimeout(existing.timeout)
      existing.timeout = setTimeout(() => { existing.handler.close() }, 5 * 1000)
      return
    }
    logger.debug(`Start whatsapp sync for ${user.email}`)
    const handler = await startSync(user.email)
    handler.onQrCode((qr) => { qrCallback(user, qr) })
    handler.onAuth(() => { authCallback(user) })
    handler.onReady(() => { readyCallback(user) })
    handler.onFinished((error) => { finishedCallback(user, error) })
    handler.start()
    const runningSync: RunningSync = {
      status: { state: 'connecting' },
      timeout: setTimeout(() => { closeSync(user) }, 5 * 1000),
      handler,
    }
    globalThis.runningSyncs.set(user.email, runningSync)
  })
}

function qrCallback(user: UserSession, qr: string): void {
  const message = `WhatsApp authentication requires QR code for user ${user.email}`
  logger.info(message)
  void transactional(async (c) => { await logEvent(c, 'INFO', message) })
  const runningSync = getSync(user)
  runningSync.status = { state: 'qr', data: qr }
}

function authCallback(user: UserSession) {
  const message = `WhatsApp authentication successful for user ${user.email}`
  logger.info(message)
  void transactional(async (c) => { await logEvent(c, 'INFO', message) })
  const runningSync = getSync(user)
  runningSync.status = { state: 'initialsync' }
}

function readyCallback(user: UserSession) {
  logger.debug(`WhatsApp is ready for user ${user.email}`)
  const runningSync = getSync(user)
  runningSync.status = { state: 'ready' }
}

function finishedCallback(user: UserSession, error?: unknown) {
  if (!error) {
    logger.debug('Closing WhatsApp sync handler after successful completion')
    globalThis.runningSyncs?.delete(user.email)
    return
  }
  const errorMessage = error instanceof Error ? error.message : 'Unknown error'
  const message = `WhatsApp sync failed for user ${user.email}: ${errorMessage}`
  logger.error(message, error)
  void transactional(async (c) => { await logEvent(c, 'ERROR', message) })
  const runningSync = getSync(user)
  runningSync.status = { state: 'failed', data: message }
}

function closeSync(user: UserSession): void {
  logger.info('WhatsApp sync timeout reached, closing sync handler')
  const runningSync = getSync(user)
  globalThis.runningSyncs?.delete(user.email)
  runningSync.handler.close()
}

function getSync(user: UserSession): RunningSync {
  const runningSync = globalThis.runningSyncs?.get(user.email)
  if (!runningSync) throw new Error(`No running WhatsApp sync found for user ${user.email}`)
  return runningSync
}
