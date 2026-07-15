'use server'
import { UserSession } from '@/app/shared/auth/auth'
import { nontransactional, transactional } from '@/app/shared/_external/db/access'
import type { DataStore, WhatsAppStore, SyncStatus } from '@lizzythelizard/whatsapp-mcp'
import { getWhatsappState, setWhatsappState } from '../_data/Whatsapp'
import type { ILogger } from '@lizzythelizard/whatsapp-mcp/dist/logger'
import { logger } from '@/app/shared/logger'
import { Mutex } from '@electric-sql/pglite'

declare global {
  var runningSyncs: Map<string, RunningSync> | undefined
}
globalThis.runningSyncs ??= new Map<string, RunningSync>()

const mutex = new Mutex()
const inactivityTimeoutMs = 10 * 1000
const name = process.env.NODE_ENV === 'production' ? 'Gutschi.site' : 'Gutschi.Site (Dev)'

export interface WaFasade extends Omit<WhatsAppStore, 'bind' | 'reset'> {
  getStatus(): SyncStatus
  sendMessage(jid: string, text: string): Promise<void>
  setRead(jid: string, read: boolean): Promise<void>
  setArchived(jid: string, archived: boolean): Promise<void>
}

export async function getWAFasade(user: UserSession): Promise<WaFasade> {
  return await mutex.runExclusive(async () => {
    let runningSync = globalThis.runningSyncs?.get(user.email)
    if (!runningSync) {
      runningSync = await createNewRunningSync(user)
      globalThis.runningSyncs?.set(user.email, runningSync)
    }
    else {
      clearTimeout(runningSync.timeout)
      runningSync.timeout = createTimeout(runningSync.close, user)
    }
    return runningSync.facade
  })
}

async function createNewRunningSync(user: UserSession): Promise<RunningSync> {
  // Loading the library dynamically to avoid issues with ESM modules and reduces startup work
  const { createStore, createHandler } = await import('@lizzythelizard/whatsapp-mcp')
  const inputData = await readDataFromDb(user)
  const store = createStore(inputData, { writeData: data => updateData(user, data), logger: walogger })
  const handler = createHandler(store, { logger: walogger, name })
  await handler.start()
  return {
    facade: { ...store, ...handler },
    timeout: createTimeout(() => { handler.close() }, user),
    close: () => { handler.close() },
  }
}

function readDataFromDb(user: UserSession): Promise<DataStore | undefined> {
  return nontransactional(c => getWhatsappState(c, user.email))
}

async function updateData(user: UserSession, data: DataStore): Promise<void> {
  await transactional(async (c) => {
    await setWhatsappState(c, user.email, data)
  })
}

const walogger: ILogger = {
  error: (message: string, error: unknown) => { logger.error(`[WhatsAppSync] ${message}`, error instanceof Error ? error : new Error(String(error))) },
  warn: (message: string) => { logger.warn(`[WhatsAppSync] ${message}`) },
  info: (message: string) => { logger.info(`[WhatsAppSync] ${message}`) },
  debug: (message: string) => { logger.debug(`[WhatsAppSync] ${message}`) },
  trace: () => { /** no-op for trace level logging **/ },
}

function createTimeout(close: () => void, user: UserSession): NodeJS.Timeout {
  return setTimeout(() => {
    close()
    globalThis.runningSyncs?.delete(user.email)
  }, inactivityTimeoutMs)
}

interface RunningSync {
  facade: WaFasade
  timeout: NodeJS.Timeout
  close: () => void
}
