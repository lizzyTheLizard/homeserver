'use server'

import { Mutex } from 'async-mutex'
import { UserSession } from '@/app/shared/auth/auth'
import { config } from '@/app/shared/config'
import { nontransactional, Queryable } from '@/app/shared/_external/db/access'
import { logger } from '@/app/shared/logger'
import { getUserJID, getChats as getChatsFromDB, getMessagesForChat as getMessagesFromDB, getChatName, formatSenderName, deleteUserData } from '@/app/startpage/_data/Whatsapp'
import { ChildProcess, spawn } from 'child_process'
import path from 'path'
import { createInterface } from 'readline'
import { logEvent } from '@/app/shared/_data/Event'

declare global {
  var waBridgeHandles: Map<string, WAWorker> | undefined
}
globalThis.waBridgeHandles ??= new Map<string, WAWorker>()

const facadeMutex = new Mutex()
const inactivityTimeoutMs = 5 * 60 * 1000

export type SyncStatus = { type: 'connecting' } | { type: 'needAuth', qr: string } | { type: 'connected' } | { type: 'fullsync' } | { type: 'closed', error?: Error }

export interface Message {
  id: string
  fromMe: boolean
  fromName: string
  content: string
  messageTimestamp: string
}

export interface Chat {
  id: string
  name: string
  isArchived: boolean
  isGroup: boolean
  lastMessageTimestamp: string
}

export interface WAWorker {
  getChats(): Promise<Chat[]>
  getStatus(): SyncStatus
  getMessagesForChat(chatId: string): Promise<Message[]>
  sendMessage(chatId: string, message: string): Promise<void>
  setArchived(chatId: string, archived: boolean): Promise<void>
  fullSync(): void
  touch(): void
}

export async function getWAWorker(user: UserSession): Promise<WAWorker> {
  return facadeMutex.runExclusive(async () => {
    const existing = globalThis.waBridgeHandles?.get(user.email)
    if (existing && existing.getStatus().type !== 'closed') {
      existing.touch()
      return existing
    }
    const handle = await createWAHandle(user.email)
    globalThis.waBridgeHandles?.set(user.email, handle)
    return handle
  })
}

async function createWAHandle(userId: string): Promise<WAWorker> {
  return new Promise<WAWorker>((resolveStartup, rejectStartup) => {
    const mutex = new Mutex()
    let status: SyncStatus = { type: 'connecting' }
    let timeout: NodeJS.Timeout | undefined = setTimeout(stop, inactivityTimeoutMs)
    let process: ChildProcess | undefined = startProcess(userId, close, handleEvent)
    let startupResolved = false
    const getStatus = () => status
    const handler = { touch, getStatus, getChats, getMessagesForChat, sendMessage, setArchived, fullSync }

    function close(error?: Error): void {
      if (timeout) {
        clearTimeout(timeout)
        timeout = undefined
      }
      if (process) {
        process.removeAllListeners()
        process = undefined
      }
      if (!startupResolved) {
        startupResolved = true
        rejectStartup(new Error(`Bridge process for user ${userId} stopped before startup completed${error ? `: ${error.message}` : ''}`))
      }
      status = { type: 'closed', error }
      globalThis.waBridgeHandles?.delete(userId)
      if (error) logger.warn(`[WhatsAppBridge] Bridge process for user ${userId} stopped with error: ${error.message}`)
      else logger.info(`[WhatsAppBridge] Bridge process for user ${userId} stopped`)
    }

    function handleEvent(event: BridgeEvent): void {
      switch (event.type) {
        case 'connection_established':
          status = { type: 'connected' }
          if (!startupResolved) {
            startupResolved = true
            resolveStartup(handler)
          }
          logger.info(`[WhatsAppBridge] Connection established for user ${userId} (WhatsApp user ${event.user_id ?? 'unknown'})`)
          break
        case 'qr_code':
          status = { type: 'needAuth', qr: event.qr ?? '' }
          if (!startupResolved) {
            startupResolved = true
            resolveStartup(handler)
          }
          logger.info(`[WhatsAppBridge] QR code challenge received for user ${userId}`)
          break
        case 'error':
          logger.warn(`[WhatsAppBridge] Error for user ${userId}: ${event.message ?? 'unknown'}`)
          break
        case 'logged_out':
          logger.warn(`[WhatsAppBridge] User ${userId} logged out (reason ${event.message ?? 'unknown'}), resetting session`)
          nontransactional(async (client) => {
            await deleteUserData(client, userId)
            await logEvent(client, 'info', `Deleted whatsapp user data for ${userId} after logout`)
          }).catch((err: unknown) => { logger.error(`[WhatsAppBridge] Failed to delete user data for ${userId}: ${String(err)}`) })
          process?.kill()
          break
        case 'log':
          {
            const msg = `[WhatsAppBridge] ${event.message ?? ''}`
            switch (event.level) {
              case 'error': logger.error(msg); break
              case 'warn': logger.warn(msg); break
              case 'info': logger.info(msg); break
              case 'debug': logger.debug(msg); break
              default: logger.info(msg)
            }
          }
          break
        case 'full_sync_finished':
          if (event.error) {
            logger.warn(`[WhatsAppBridge] Full sync for user ${userId} completed with error: ${event.error}`)
            logEvent(undefined, 'ERROR', `Full sync for user ${userId} completed with error: ${event.error}`)
              .catch((err: unknown) => { logger.error(`[WhatsAppBridge] Failed to log full sync error for user ${userId}: ${String(err)}`) })
          }
          else {
            logger.info(`[WhatsAppBridge] Full sync finished for user ${userId}`)
            logEvent(undefined, 'INFO', `Full sync for user ${userId} completed successfully`)
              .catch((err: unknown) => { logger.error(`[WhatsAppBridge] Failed to log full sync completion for user ${userId}: ${String(err)}`) })
          }
          status = { type: 'connected' }
          break
        default:
          logger.warn(`[WhatsAppBridge] Unknown event type '${event.type}' for user ${userId}`)
      }
    }

    function stop(): void {
      if (status.type === 'fullsync') {
        touch()
        return
      }
      logger.info(`[WhatsAppBridge] Stopping bridge process for user ${userId} after ${(inactivityTimeoutMs / 60000).toString()} minutes of inactivity`)
      process?.kill()
    }

    function touch(): void {
      if (timeout) clearTimeout(timeout)
      timeout = setTimeout(stop, inactivityTimeoutMs)
    }

    let ourJIDCache: string | undefined

    async function resolveOurJID(client: Queryable): Promise<string | undefined> {
      ourJIDCache ??= await getUserJID(client, userId)
      return ourJIDCache
    }

    function getChats(): Promise<Chat[]> {
      return nontransactional(async (client) => {
        const ourJID = await resolveOurJID(client)
        if (!ourJID) return []
        const rows = await getChatsFromDB(client, ourJID)
        return rows.map(r => ({
          id: r.chat_jid,
          name: getChatName(r),
          isArchived: r.archived,
          isGroup: r.chat_jid.endsWith('@g.us'),
          lastMessageTimestamp: r.last_msg_ts,
        }))
      })
    }

    function getMessagesForChat(chatId: string): Promise<Message[]> {
      return nontransactional(async (client) => {
        const ourJID = await resolveOurJID(client)
        if (!ourJID) return []
        const rows = await getMessagesFromDB(client, ourJID, chatId)
        return rows.map(r => ({
          id: r.id,
          fromMe: r.from_me,
          fromName: formatSenderName(r.sender_jid, r.from_me, r.contact_name),
          content: r.text ?? '',
          messageTimestamp: r.message_timestamp,
        }))
      })
    }

    function sendMessage(chatId: string, message: string): Promise<void> {
      return mutex.runExclusive(() => new Promise<void>((resolve, reject) => {
        if (!process?.stdin) {
          reject(new Error('Bridge process not available'))
          return
        }
        touch()
        const command = JSON.stringify({ command: 'send_message', to: chatId, text: message })
        process.stdin.write(command + '\n', 'utf8', (error) => {
          if (error) reject(error)
          else resolve()
        })
      }))
    }

    function setArchived(chatId: string, archived: boolean): Promise<void> {
      return mutex.runExclusive(() => new Promise<void>((resolve, reject) => {
        if (!process?.stdin) {
          reject(new Error('Bridge process not available'))
          return
        }
        touch()
        const command = JSON.stringify({ command: 'archive_chat', id: chatId, archived })
        process.stdin.write(command + '\n', 'utf8', (error) => {
          if (error) reject(error)
          else resolve()
        })
      }))
    }

    function fullSync(): void {
      if (!process?.stdin) {
        throw new Error('Bridge process not available')
      }
      const stdin = process.stdin
      mutex.runExclusive(() => {
        touch()
        status = { type: 'fullsync' }
        const command = JSON.stringify({ command: 'full_sync' })
        stdin.write(command + '\n', 'utf8', (error) => {
          if (error) {
            status = { type: 'connected' }
            logger.warn(`[WhatsAppBridge] Failed to write full_sync command for user ${userId}: ${error.message}`)
          }
        })
      }).catch((error: unknown) => {
        logger.warn(`[WhatsAppBridge] Failed to run full_sync command for user ${userId}: ${String(error)}`)
      })
    }
  })
}

function startProcess(userId: string, onClose: (error?: Error) => void, onEvent: (event: BridgeEvent) => void): ChildProcess {
  function handleEvent(line: string): void {
    let event: BridgeEvent
    try {
      event = JSON.parse(line) as BridgeEvent
    }
    catch {
      logger.warn(`[WhatsAppBridge] Received invalid event line: ${line}`)
      return
    }
    onEvent(event)
  }

  function onExit(code: number | null, signal: NodeJS.Signals | null): void {
    if (!code || code === 0) onClose()
    else onClose(new Error(`Bridge process exited with code ${String(code)} and signal ${String(signal)}`))
  }

  const dev = config.NODE_ENV === 'development' ? 'true' : 'false'
  logger.info(`[WhatsAppBridge] Starting bridge process for user ${userId}`)
  const proc = spawn(getBridgeBinaryPath(), [userId, config.DB_CONNECTION_STRING, dev], { stdio: ['pipe', 'pipe', 'pipe'] })
  createInterface({ input: proc.stdout }).on('line', handleEvent)
  proc.stderr.on('data', (chunk: Buffer) => { logger.warn(`[WhatsAppBridge] stderr: ${chunk.toString('utf8').trim()}`) })
  proc.on('error', (error) => { onClose(error) })
  proc.on('exit', onExit)
  return proc
}

interface BridgeEvent {
  type: string
  user_id?: string
  qr?: string
  message?: string
  level?: string
  error?: string
}

function getBridgeBinaryPath(): string {
  if (config.NODE_ENV === 'development') {
    return path.join(process.cwd(), 'Whatsapp', process.platform === 'win32' ? 'whatsapp.exe' : 'whatsapp')
  }
  return path.join(process.cwd(), 'whatsapp')
}
