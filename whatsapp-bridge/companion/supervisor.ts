import { Mutex } from 'async-mutex'
import { promises as fs } from 'node:fs'
import type { ChildProcess } from 'node:child_process'
import { logger } from './logger'
import { mapAuthenticated, mapChats, mapMessages, type Chat, type Message } from './mapping'
import { runWacli, spawnWacli, WacliEvent } from './wacli'
import { config } from './config'
import { createHash } from 'node:crypto'
import { join } from 'node:path'

// A Supervisor owns the lifecycle of one user's wacli store and processes.
export type Status = { type: 'connecting' }
  | { type: 'needAuth', qr: string } | { type: 'connected' }
  | { type: 'fullsync' } | { type: 'closed', error?: string }

export class Supervisor {
  private readonly storeDir: string
  private readonly mutex: Mutex = new Mutex()
  private status: Status = { type: 'connecting' }
  private child: ChildProcess | null = null
  private isStopping = false

  constructor(private readonly userId: string) {
    const storeId = createHash('sha256').update(userId).digest('hex').slice(0, 32)
    this.storeDir = join(config.WHATSAPP_DATA_DIR, storeId)
    logger.info(`[${this.userId}] Create a new session in folder ${this.storeDir}`)
  }

  public async start(): Promise<Status> {
    return this.mutex.runExclusive(async () => {
      if (this.status.type === 'needAuth' || this.status.type === 'connected' || this.status.type === 'fullsync') {
        logger.debug(`[${this.userId}] wacli is already in state ${this.status.type}, so no start needed`)
        return this.status
      }
      if (this.child) throw new Error(`A child process already exists but state is ${this.status.type}`)
      logger.debug(`[${this.userId}] Current status is ${this.status.type}, check if authenticated`)
      const result = await runWacli(this.storeDir, ['auth', 'status'], true)
      const isAuthenticated = mapAuthenticated(result)
      if (isAuthenticated) logger.debug('[${this.userId}] Is already authenticated, start sync')
      else logger.debug('[${this.userId}] Not authenticated, start login')
      const args = isAuthenticated ? ['sync', '--follow', '--events'] : ['auth', '--events']
      let gotResult = false
      return new Promise((res, rej) => {
        this.child = spawnWacli(this.storeDir, args, (event) => {
          const isResult = this.handleEvent(event)
          if (!isResult || gotResult) return
          gotResult = true
          if (this.status.type === 'connected') res(this.status)
          else if (this.status.type === 'needAuth') res (this.status)
          else rej(new Error('Could not start wacli status is now ' + this.status.type))
        })
      })
    })
  }

  private handleEvent(event: WacliEvent): boolean {
    switch (event.event) {
      case 'closed':
        logger.debug(`[${this.userId}] wacli session was closed`)
        this.status = { type: 'closed' }
        this.child = null
        return true
      case 'error':
        if (this.isStopping) return false
        logger.warn(`[${this.userId}] wacli session was closed with an error: ` + event.data.message)
        this.status = { type: 'closed', error: event.data.message }
        return true
      case 'qr_code':
        logger.debug(`[${this.userId}] wacli session got qr code`)
        this.status = { type: 'needAuth', qr: event.data.code }
        return true
      case 'connected':
        logger.debug(`[${this.userId}] wacli session is connected`)
        this.status = { type: 'connected' }
        return true
      case 'disconnected':
        logger.warn(`[${this.userId}] wacli session got disconnected, not sure why...`)
        this.status = { type: 'connecting' }
        return true
      case 'logged_out':
        logger.warn(`[${this.userId}] wacli session was logged out (revoked)`)
        this.status = { type: 'connecting' }
        return true
      default:
        return false
    }
  }

  public async stop(): Promise<void> {
    return this.mutex.runExclusive(async () => {
      if ((this.status.type === 'connecting' || this.status.type === 'closed') && this.child === null) {
        logger.debug(`[${this.userId}] wacli is already in state ${this.status.type}, so no start needed`)
        return
      }
      const child = this.child
      this.child = null
      if (!child) throw new Error('Cannot stop a process that has not been started')
      // Check if process is already stopped
      if (child.exitCode !== null || child.signalCode !== null) return
      this.isStopping = true
      logger.info(`[${this.userId}] stop wacli session using sigterm`)
      return new Promise<void>((res) => {
        // Send a kill after 5s if child does not close, independant of the event loop
        const killTimer = setTimeout(() => {
          logger.warn(`[${this.userId}] wacl dit not terminate normally, kill it`)
          child.kill('SIGKILL')
          this.isStopping = false
          res()
        }, 5000)
        killTimer.unref()

        // Wait for the process to close
        child.once('close', () => {
          clearTimeout(killTimer)
          this.status = { type: 'closed' }
          this.isStopping = false
          logger.info(`[${this.userId}] stopped normally`)
          res()
        })

        // Send a terminate signal
        child.kill('SIGTERM')
      })
    })
  }

  public async disconnect(): Promise<void> {
    await this.stop()
    return this.mutex.runExclusive(async () => {
      logger.info(`[${this.userId}] disconnect wacli session`)
      // ignore errors if already logged out
      await runWacli(this.storeDir, ['auth', 'logout'], false)
        .catch ((err: unknown) => {
          const error = err instanceof Error ? err : Error(String(err))
          logger.warn(`[${this.userId}] Could not log out`, error)
        })
      await fs.rm(this.storeDir, { recursive: true, force: true })
      this.status = { type: 'connecting' }
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

  public async sendMessage(to: string, text: string): Promise<void> {
    await this.ensureStarted()
    logger.info(`[${this.userId}] send messages`)
    await runWacli(this.storeDir, ['send', 'text', '--to', to, '--message', text, '--post-send-wait', '0'], false)
  }

  public async archiveChat(chatId: string, archived: boolean): Promise<void> {
    await this.stop()
    logger.info(`[${this.userId}] archive chat`)
    await runWacli(this.storeDir, ['chats', archived ? 'archive' : 'unarchive', '--chat', chatId], false)
  }

  public async fullSync(): Promise<void> {
    if (this.status.type === 'fullsync') {
      logger.debug(`[${this.userId}] fullsync alredy running`)
      return
    }
    await this.stop()
    return this.mutex.runExclusive(async () => {
      logger.info(`[${this.userId}] run full sync`)
      this.status = { type: 'fullsync' }
      runWacli(this.storeDir, ['sync', '--once', '--refresh-contacts', '--refresh-groups', '--refresh-channels', '--idle-exit', '10s'], false, 5 * 60 * 1000)
        .then(() => logger.info('Fullsync finished'))
        .catch ((err: unknown) => {
          const error = err instanceof Error ? err : Error(String(err))
          logger.warn(`[${this.userId}] Full sync failed`, error)
        })
        .finally(() => { this.status = { type: 'connecting' } })
    })
  }

  private async ensureStarted() {
    await this.start()
    if (this.status.type === 'fullsync') throw new Error('Sync is running')
    if (this.status.type !== 'connected') throw new Error('Not connected')
  }
}
