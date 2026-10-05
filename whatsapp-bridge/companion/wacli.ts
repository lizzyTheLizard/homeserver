import { spawn, type ChildProcess } from 'node:child_process'
import { config } from './config'
import { logger } from './logger'
import { Readable } from 'node:stream'

export type WacliEvent = { event: 'qr_code', data: { code: string } }
  | { event: 'error', data: { message: string } }
  | { event: 'warning', data: { code?: string, message: string, name?: string } }
  | { event: 'closed' }
  | { event: 'auth_starting' }
  | { event: 'connected' }
  | { event: 'disconnected' }
  | { event: 'logged_out' }

// Spawns a long-running `wacli` process. If a short-lived command is running
// for the store, this waits for it to finish before spawning.
export async function spawnWacli(storeDir: string, args: string[], handleEvent: (event: WacliEvent) => void): Promise<ChildProcess> {
  await waitForShortCommand(storeDir)
  const fullArgs = ['--store', storeDir, ...args]
  logger.debug(`Run ${config.WACLI_BIN} ${fullArgs.join(' ')}`)
  const child = spawn(config.WACLI_BIN, fullArgs, {
    env: wacliEnv(),
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  // stdout is drained so it can never backpressure the child.
  child.stdout.resume()
  child.on('error', (err) => { handleEvent({ event: 'error', data: { message: err.message } }) })
  child.on('close', () => { handleEvent({ event: 'closed' }) })
  attachEventParser(child.stderr, (e) => { handleEvent(e) })
  return child
}

// Per-store command coordination. Commands against one store are serialised: a
// short-lived command claims the store, a second short command for the same
// store is rejected instead of racing it, and a long-running process waits for
// the running short command to finish. Different stores stay independent.
interface StoreCommands {
  shortRunning: boolean
  shortFinished: (() => void)[]
}

const commandsByStore = new Map<string, StoreCommands>()

// Runs a short-lived wacli command and resolves with the parsed JSON envelope
// (or a plain success envelope for commands that do not produce JSON). Rejects
// with WacliError when the process exits non-zero.
export function runWacli(storeDir: string, args: string[], hasResult: boolean, timeoutMs?: number): Promise<unknown> {
  const commands = getStoreCommands(storeDir)
  if (commands.shortRunning) {
    return Promise.reject(new Error(`A wacli command is already running for this store: ${args.join(' ')}`))
  }
  commands.shortRunning = true
  let stdout = ''
  let firstResult = false
  timeoutMs = timeoutMs ?? config.WHATSAPP_CMD_TIMEOUT_MS
  const fullArgs = ['--store', storeDir, ...args]
  if (hasResult) fullArgs.push('--json')
  logger.debug(`Run ${config.WACLI_BIN} ${fullArgs.join(' ')}`)
  return new Promise((resolve, reject) => {
    const child = spawn(config.WACLI_BIN, fullArgs, {
      env: wacliEnv(),
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    const timer = setTimeout(() => {
      child.kill('SIGKILL')
      finish(new Error(`wacli command timed out after ${String(timeoutMs)}ms: ${args.join(' ')}`))
    }, timeoutMs)

    function finish(result: unknown): void {
      if (firstResult) return
      firstResult = true
      clearTimeout(timer)
      if (result instanceof Error) reject(result)
      else resolve(result)
    }

    child.stdout.on('data', (chunk: Buffer) => { stdout += chunk.toString() })
    child.stderr.on('data', (chunk: Buffer) => { logger.debug('StdError of wacli: ' + chunk.toString().trim()) })
    child.on('error', (err: unknown) => { finish(err instanceof Error ? err : Error(String(err))) })
    child.on('close', (code) => {
      const trimmed = stdout.trim()
      if (code !== 0) {
        finish(new Error(`wacli exited with code ${String(code)}`))
        return
      }
      if (!hasResult || trimmed === '') {
        finish(null)
        return
      }
      try {
        const parsed = JSON.parse(trimmed) as { data: unknown }
        finish(parsed.data)
      }
      catch (err: unknown) {
        finish(err instanceof Error ? err : Error(String(err)))
      }
    })
  }).finally(() => {
    commands.shortRunning = false
    for (const resolve of commands.shortFinished.splice(0)) resolve()
  })
}

// Parses the event stream wacli writes to stderr when --events is set.
// Each line is `{"event":"...","data":{...},"ts":<millis>}`.
export function attachEventParser(stream: Readable | null, onEvent: (event: WacliEvent) => void, label?: string): void {
  if (!stream) return
  const prefix = label ? `[${label}] ` : ''
  let buffer = ''
  stream.setEncoding('utf8')
  stream.on('data', (chunk: string) => {
    buffer += chunk
    let newlineIndex: number
    while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
      const line = buffer.slice(0, newlineIndex).trim()
      buffer = buffer.slice(newlineIndex + 1)
      if (!line) continue
      try {
        const event = JSON.parse(line) as WacliEvent
        if (event.event === 'warning') {
          logger.warn(`${prefix}wacli warning [${event.data.code ?? 'unknown'}]: ${event.data.message}`)
        }
        else {
          logger.debug(`${prefix}wacli event: ${line}`)
        }
        onEvent(event)
      }
      catch {
        // With --events wacli writes NDJSON to stderr; anything else is an
        // error or warning worth surfacing.
        logger.warn(`${prefix}wacli stderr: ${line}`)
      }
    }
  })
}

// Environment shared by every wacli process. Device identity (the platform and
// label WhatsApp shows for the linked device) and the storage caps are
// forwarded so both `auth` and `sync` honour them.
function wacliEnv(): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { ...process.env }
  env.WACLI_DEVICE_PLATFORM = config.WACLI_DEVICE_PLATFORM
  env.WACLI_DEVICE_LABEL = config.WACLI_DEVICE_LABEL
  if (config.WACLI_SYNC_MAX_MESSAGES) env.WACLI_SYNC_MAX_MESSAGES = config.WACLI_SYNC_MAX_MESSAGES
  if (config.WACLI_SYNC_MAX_DB_SIZE) env.WACLI_SYNC_MAX_DB_SIZE = config.WACLI_SYNC_MAX_DB_SIZE
  return env
}

// Resolves once no short-lived command is running for the store, so a
// long-running process never starts while one is still holding the store.
function waitForShortCommand(storeDir: string): Promise<void> {
  const commands = getStoreCommands(storeDir)
  if (!commands.shortRunning) return Promise.resolve()
  return new Promise((resolve) => { commands.shortFinished.push(resolve) })
}

function getStoreCommands(storeDir: string): StoreCommands {
  let commands = commandsByStore.get(storeDir)
  if (!commands) {
    commands = { shortRunning: false, shortFinished: [] }
    commandsByStore.set(storeDir, commands)
  }
  return commands
}
