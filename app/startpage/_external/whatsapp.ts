'use server'

import { Mutex } from 'async-mutex'
import { UserSession } from '@/app/shared/auth/auth'
import { config } from '@/app/shared/config'
import { logger } from '@/app/shared/logger'
import { ChildProcess, spawn } from 'child_process'
import path from 'path'
import { createInterface } from 'readline'

declare global {
  var waBridgeHandles: Map<string, WAFacade> | undefined
}
globalThis.waBridgeHandles ??= new Map<string, WAFacade>()

const facadeMutex = new Mutex()
const inactivityTimeoutMs = 5 * 60 * 1000

export type SyncStatus = { type: 'notstarted' } | { type: 'connecting' } | { type: 'needAuth', qr: string } | { type: 'ready' } | { type: 'closed', error?: Error }

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

export interface WAFacade {
  getChats(): Promise<Chat[]>
  getStatus(): SyncStatus
  getMessagesForChat(chatId: string): Promise<Message[]>
  sendMessage(chatId: string, message: string): Promise<void>
  setArchived(chatId: string, archived: boolean): Promise<void>
  touch(): void
}

export async function getWAFasade(user: UserSession): Promise<WAFacade> {
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

async function createWAHandle(userId: string): Promise<WAFacade> {
  return new Promise<WAFacade>((resolveStartup, rejectStartup) => {
    const mutex = new Mutex()
    let status: SyncStatus = { type: 'connecting' }
    let timeout: NodeJS.Timeout | undefined = setTimeout(stop, inactivityTimeoutMs)
    let process: ChildProcess | undefined = startProcess(userId, close, handleEvent)
    let startupResolved = false
    // TODO: This is somewhat ugly with these resolver/rejector variables, but it works for now. We can refactor this later if needed.
    let chatsResolver: ((value: Chat[]) => void) | null = null
    let chatsRejector: ((error: Error) => void) | null = null
    let messagesResolver: ((value: Message[]) => void) | null = null
    let messagesRejector: ((error: Error) => void) | null = null
    const getStatus = () => status
    const handler = { touch, getStatus, getChats, getMessagesForChat, sendMessage, setArchived }

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
        case 'chats':
          if (chatsResolver) {
            chatsResolver((event.chats ?? []).map(c => ({
              id: c.id,
              name: c.name,
              isArchived: c.isArchived,
              isGroup: c.isGroup,
              lastMessageTimestamp: c.lastMessageTimestamp ?? '',
            })))
            chatsResolver = null
            chatsRejector = null
          }
          break
        case 'messages':
          if (messagesResolver) {
            messagesResolver(event.messages ?? [])
            messagesResolver = null
            messagesRejector = null
          }
          break
        case 'connection_established':
          status = { type: 'ready' }
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
          if (chatsRejector) {
            chatsRejector(new Error(event.message ?? 'Unknown error'))
            chatsResolver = null
            chatsRejector = null
          }
          if (messagesRejector) {
            messagesRejector(new Error(event.message ?? 'Unknown error'))
            messagesResolver = null
            messagesRejector = null
          }
          logger.warn(`[WhatsAppBridge] Error for user ${userId}: ${event.message ?? 'unknown'}`)
          break
        default:
          logger.warn(`[WhatsAppBridge] Unknown event type '${event.type}' for user ${userId}`)
      }
    }

    function stop(): void {
      logger.info(`[WhatsAppBridge] Stopping bridge process for user ${userId} after ${(inactivityTimeoutMs / 60000).toString()} minutes of inactivity`)
      process?.kill()
    }

    function touch(): void {
      if (timeout) clearTimeout(timeout)
      timeout = setTimeout(stop, inactivityTimeoutMs)
    }

    function getChats(): Promise<Chat[]> {
      return mutex.runExclusive(() => new Promise<Chat[]>((resolve, reject) => {
        if (!process?.stdin) {
          reject(new Error('Bridge process not available'))
          return
        }
        touch()
        chatsResolver = resolve
        chatsRejector = reject
        process.stdin.write(JSON.stringify({ command: 'get_chats' }) + '\n', 'utf8', (error) => {
          if (error) {
            chatsResolver = null
            chatsRejector = null
            reject(error)
          }
        })
      }))
    }

    function getMessagesForChat(chatId: string): Promise<Message[]> {
      return mutex.runExclusive(() => new Promise<Message[]>((resolve, reject) => {
        if (!process?.stdin) {
          reject(new Error('Bridge process not available'))
          return
        }
        touch()
        messagesResolver = resolve
        messagesRejector = reject
        process.stdin.write(JSON.stringify({ command: 'get_messages', chatJID: chatId }) + '\n', 'utf8', (error) => {
          if (error) {
            messagesResolver = null
            messagesRejector = null
            reject(error)
          }
        })
      }))
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
    onClose(new Error(`Bridge process exited with code ${String(code)} and signal ${String(signal)}`))
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

interface BridgeChat {
  id: string
  name: string
  isArchived: boolean
  isGroup: boolean
  lastMessageTimestamp?: string
}

interface BridgeMessage {
  id: string
  fromMe: boolean
  fromName: string
  content: string
  messageTimestamp: string
}

interface BridgeEvent {
  type: string
  user_id?: string
  qr?: string
  message?: string
  chats?: BridgeChat[]
  messages?: BridgeMessage[]
}

function getBridgeBinaryPath(): string {
  if (config.NODE_ENV === 'development') {
    return path.join(process.cwd(), 'Whatsapp', process.platform === 'win32' ? 'whatsapp.exe' : 'whatsapp')
  }
  return path.join(process.cwd(), 'whatsapp')
}
