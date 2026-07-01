'use server'
import { UserSession } from '@/app/shared/auth/auth'
import { nontransactional, transactional } from '@/app/shared/_external/db/access'
import { logEvent } from '@/app/shared/_data/Event'
import { createStore, createHandler, DataStore, WhatsAppHandler, WhatsAppStore } from '@lizzythelizard/whatsapp-mcp'
import { getWhatsappState, setWhatsappState } from '../_data/Whatsapp'
import { ILogger } from '@lizzythelizard/whatsapp-mcp/dist/logger'
import { logger } from '@/app/shared/logger'
import { Mutex } from '@electric-sql/pglite'

const inactivityTimeoutMs = 10 * 1000

const mutex = new Mutex()

declare global {
  var runningSyncs: Map<string, RunningSync> | undefined
}
globalThis.runningSyncs ??= new Map<string, RunningSync>()

export async function registerCallback(user: UserSession, callback: () => Promise<void>): Promise<() => void> {
  const runningSync = await getRunningSync(user)
  runningSync.callbacks.push(callback)
  return () => {
    runningSync.callbacks = runningSync.callbacks.filter(cb => cb !== callback)
  }
}

export async function getHandler(user: UserSession): Promise<Omit<WhatsAppHandler, 'close'>> {
  const runningSync = await getRunningSync(user)
  return runningSync.handler
}

export async function getStore(user: UserSession): Promise<Omit<WhatsAppStore, 'reset' | 'bind'>> {
  const runningSync = await getRunningSync(user)
  return runningSync.store
}

async function getRunningSync(user: UserSession): Promise<RunningSync> {
  const runningSyncNew = await mutex.runExclusive(async () => {
    const runningSync = globalThis.runningSyncs?.get(user.email)
    if (runningSync) {
      clearTimeout(runningSync.timeout)
      runningSync.timeout = setTimeout(() => { closeSync(user) }, inactivityTimeoutMs)
      return runningSync
    }
    const inputData = await readDataFromDb(user)
    const store = createStore(inputData, { writeData: data => updateData(user, data), logger: walogger })
    const handler = createHandler(store, { logger: walogger, name: 'Gutschi.site' })
    const runningSyncNew = {
      timeout: setTimeout(() => { closeSync(user) }, inactivityTimeoutMs),
      handler: handler,
      store: store,
      callbacks: [],
    }
    globalThis.runningSyncs?.set(user.email, runningSyncNew)
    void runningSyncNew.handler.start()
    return runningSyncNew
  })
  return runningSyncNew
}

function readDataFromDb(user: UserSession): Promise<DataStore | undefined> {
  return nontransactional(c => getWhatsappState(c, user.email))
}

async function updateData(user: UserSession, data: DataStore): Promise<void> {
  await transactional(async (c) => {
    await logEvent(c, 'INFO', `Writing WhatsApp data to database for user ${user.email}`)
    await setWhatsappState(c, user.email, data)
  })
  const runningSync = globalThis.runningSyncs?.get(user.email)
  if (!runningSync) return
  await Promise.all(runningSync.callbacks.map(cb => cb()))
}

function closeSync(user: UserSession): void {
  logger.debug(`Closing WhatsApp sync for user ${user.email} due to inactivity`)
  const runningSync = globalThis.runningSyncs?.get(user.email)
  if (!runningSync) return
  clearTimeout(runningSync.timeout)
  runningSync.handler.close()
  globalThis.runningSyncs?.delete(user.email)
}

interface RunningSync {
  handler: WhatsAppHandler
  store: WhatsAppStore
  timeout: NodeJS.Timeout
  callbacks: (() => Promise<void>)[]
}

const walogger: ILogger = {
  error: (message: string, error: unknown) => { logger.error(`[WhatsAppSync] ${message}`, error instanceof Error ? error : new Error(String(error))) },
  warn: (message: string) => { logger.warn(`[WhatsAppSync] ${message}`) },
  info: (message: string) => { logger.info(`[WhatsAppSync] ${message}`) },
  debug: (message: string) => { logger.debug(`[WhatsAppSync] ${message}`) },
  trace: () => { /** no-op for trace level logging **/ },
}
