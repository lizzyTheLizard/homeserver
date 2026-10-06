import { Mutex } from 'async-mutex'
import { promises as fs } from 'node:fs'
import type { ChildProcess } from 'node:child_process'
import { logger } from './logger'
import { mapAuthenticated, mapChatArchived, mapChats, mapMessages, type Chat, type Message } from './mapping'
import { runWacli, spawnWacli, WacliEvent } from './wacli'
import { config } from './config'
import { createHash, randomBytes } from 'node:crypto'
import { join } from 'node:path'

// A Supervisor owns the lifecycle of one user's wacli store and processes.
export type Status = { type: 'needAuth', qr: string } | { type: 'connected' }
  | { type: 'fullsync' } | { type: 'closed' }

export class Supervisor {
  private readonly storeDir: string
  private readonly webhookSecret: string
  private readonly mutex: Mutex = new Mutex()
  private status: Status = { type: 'closed' }
  private child: ChildProcess | null = null
  private isStopping = false
  constructor(public readonly userId: string) {
    const storeId = createHash('sha256').update(userId).digest('hex').slice(0, 32)
    this.storeDir = join(config.WHATSAPP_DATA_DIR, storeId)
    this.webhookSecret = randomBytes(32).toString('hex')
    logger.info(`[${this.userId}] Create a new session in folder ${this.storeDir}`)
  }

  public async start(): Promise<Status> {
    return this.mutex.runExclusive(async () => {
      if (this.status.type !== 'closed') {
        logger.debug(`[${this.userId}] wacli is already in state ${this.status.type}, so no start needed`)
        return this.status
      }
      if (this.child) throw new Error(`A child process already exists but state is ${this.status.type}`)
      logger.debug(`[${this.userId}] Check if authenticated`)
      const result = await runWacli(this.storeDir, ['auth', 'status'], true)
      const isAuthenticated = mapAuthenticated(result)
      return isAuthenticated ? this.startSync() : this.startAuthentication()
    })
  }

  private startSync(): Promise<Status> {
    logger.debug(`[${this.userId}] Is already authenticated, start sync`)
    const args = [
      'sync', '--follow', '--events',
      '--webhook', `http://127.0.0.1:${String(config.PORT)}/sessions/${this.userId}/webhook`,
      '--webhook-allow-private', '--webhook-secret', this.webhookSecret,
    ]
    logger.debug(`[${this.userId}] starting wacli sync`)
    return new Promise((res, rej) => {
      try {
        this.child = spawnWacli(this.storeDir, args, (event) => { this.handleEvent(event, res, rej) })
      }
      catch (err: unknown) {
        void this.stop().catch(() => undefined)
        rej(err instanceof Error ? err : Error(String(err)))
      }
    })
  }

  private startAuthentication(): Promise<Status> {
    logger.debug(`[${this.userId}] Not authenticated, start login`)
    const args = ['auth', '--events']
    logger.debug(`[${this.userId}] starting wacli sync`)
    return new Promise((res, rej) => {
      try {
        this.child = spawnWacli(this.storeDir, args, (event) => { this.handleEvent(event, res, rej) })
      }
      catch (err: unknown) {
        void this.stop().catch(() => undefined)
        rej(err instanceof Error ? err : Error(String(err)))
      }
    })
  }

  private handleEvent(event: WacliEvent, res: (status: Status) => void, rej: (error: Error) => void): void {
    switch (event.event) {
      case 'closed':
        logger.info(`[${this.userId}] wacli session was closed`)
        this.status = { type: 'closed' }
        this.child = null
        rej(new Error('Could not start wacli'))
        break
      case 'error':
        if (this.isStopping) break
        logger.warn(`[${this.userId}] wacli session had an error: ` + event.data.message)
        rej(new Error('Could not start wacli'))
        break
      case 'warning':
        if (this.isStopping) break
        logger.warn(`[${this.userId}] wacli warning: ` + event.data.message)
        if (event.data.message.includes('hit an LTHash mismatch')) rej(new Error('Could not start wacli'))
        break
      case 'qr_code':
        this.status = { type: 'needAuth', qr: event.data.code }
        logger.info(`[${this.userId}] started wacli sync, but needs auth`)
        res(this.status)
        break
      case 'connected':
        this.status = { type: 'connected' }
        logger.info(`[${this.userId}] started wacli sync, now connected`)
        res(this.status)
        break
      case 'disconnected':
        logger.warn(`[${this.userId}] wacli session got disconnected, not sure why...`)
        void this.stop().catch(() => undefined)
        rej(new Error('Could not start wacli'))
        break
      case 'logged_out':
        logger.warn(`[${this.userId}] wacli session was logged out (revoked)`)
        void this.stop().catch(() => undefined)
        rej(new Error('Could not start wacli'))
        break
      default:
        logger.debug(`[${this.userId}] got an unexpected event: ${JSON.stringify(event)}`)
    }
  }

  public async stop(): Promise<void> {
    return this.mutex.runExclusive(() => this._stop())
  }

  private async _stop(): Promise<void> {
    if (this.status.type === 'closed') {
      if (this.child === null) {
        logger.debug(`[${this.userId}] wacli is already closed, nothing to stop`)
        return
      }
      logger.warn(`[${this.userId}] wacli session is closed but a process is still running, stopping it`)
    }
    const child = this.child
    if (!child) throw new Error('Cannot stop a process that has not been started')
    if (child.exitCode !== null || child.signalCode !== null) throw new Error('The wacli process has already exited')
    this.child = null
    this.isStopping = true
    logger.debug(`[${this.userId}] stop wacli sync`)
    return new Promise<void>((res) => {
      // Send a kill after 5s if child does not close, independant of the event loop
      const killTimer = setTimeout(() => {
        logger.warn(`[${this.userId}] wacli sync dit not terminate normally, kill it`)
        child.kill('SIGKILL')
        this.isStopping = false
        this.status = { type: 'closed' }
        res()
      }, 5000)
      killTimer.unref()

      // Wait for the process to close
      child.once('close', () => {
        clearTimeout(killTimer)
        this.status = { type: 'closed' }
        this.isStopping = false
        logger.info(`[${this.userId}] wacli sync has been stopped normally using sigterm`)
        res()
      })

      // Send a terminate signal
      child.kill('SIGTERM')
    })
  }

  public async disconnect(): Promise<void> {
    return this.mutex.runExclusive(async () => {
      await this._stop()
      logger.info(`[${this.userId}] disconnect wacli session`)
      // ignore errors if already logged out
      await runWacli(this.storeDir, ['auth', 'logout'], false)
        .catch ((err: unknown) => {
          const error = err instanceof Error ? err : Error(String(err))
          logger.warn(`[${this.userId}] Could not log out`, error)
        })
      await fs.rm(this.storeDir, { recursive: true, force: true })
      this.status = { type: 'closed' }
    })
  }

  public async getChats(): Promise<Chat[]> {
    await this.ensureStarted()
    logger.debug(`[${this.userId}] get chats`)
    const result1 = await runWacli(this.storeDir, ['chats', 'list', '--limit', String(config.WHATSAPP_CHATS_LIMIT)], true)
    const chats = mapChats(result1)
    const result2 = await runWacli(this.storeDir, ['messages', 'list', '--asc', '--limit', String(config.WHATSAPP_MESSAGES_LIMIT)], true)
    const messages = mapMessages(result2)
    return chats.filter(c => messages.some(m => m.chatId === c.id))
  }

  public async getMessages(chatId: string): Promise<Message[]> {
    await this.ensureStarted()
    logger.debug(`[${this.userId}] get messages`)
    const result = await runWacli(this.storeDir, ['messages', 'list', '--chat', chatId, '--asc', '--limit', String(config.WHATSAPP_MESSAGES_LIMIT)], true)
    return mapMessages(result)
  }

  public getStatus(): Status {
    logger.debug(`[${this.userId}] get status ${this.status.type}`)
    return this.status
  }

  public getWebhookSecret(): string {
    return this.webhookSecret
  }

  public async sendMessage(to: string, text: string): Promise<void> {
    await this.ensureStarted()
    logger.info(`[${this.userId}] send messages`)
    await runWacli(this.storeDir, ['send', 'text', '--to', to, '--message', text, '--post-send-wait', '0'], false)
  }

  public async archiveChat(chatId: string, archived: boolean): Promise<void> {
    return this.mutex.runExclusive(async () => {
      await this._stop()
      logger.info(`[${this.userId}] archive chat`)
      await runWacli(this.storeDir, ['chats', archived ? 'archive' : 'unarchive', '--chat', chatId], false)
    })
  }

  public async isArchived(chatId: string): Promise<boolean> {
    logger.debug(`[${this.userId}] check archive state of ${chatId}`)
    const result = await runWacli(this.storeDir, ['chats', 'show', '--jid', chatId], true)
    return mapChatArchived(result)
  }

  public async fullSync(): Promise<void> {
    return this.mutex.runExclusive(async () => {
      if (this.status.type === 'fullsync') {
        logger.debug(`[${this.userId}] fullsync alredy running`)
        return
      }
      await this._stop()
      logger.info(`[${this.userId}] run full sync`)
      this.status = { type: 'fullsync' }
      runWacli(this.storeDir, ['sync', '--once', '--refresh-contacts', '--refresh-groups', '--refresh-channels', '--idle-exit', '10s'], false, 5 * 60 * 1000)
        .then(() => logger.info('Fullsync finished'))
        .catch ((err: unknown) => {
          const error = err instanceof Error ? err : Error(String(err))
          logger.warn(`[${this.userId}] Full sync failed`, error)
        })
        .finally(() => { this.status = { type: 'closed' } })
    })
  }

  private async ensureStarted() {
    await this.start()
    if (this.status.type === 'fullsync') throw new Error('Sync is running')
    if (this.status.type !== 'connected') throw new Error('Not connected')
  }
}
