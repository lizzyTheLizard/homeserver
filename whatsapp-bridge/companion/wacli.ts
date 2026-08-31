import { spawn, type ChildProcess } from 'node:child_process'
import { config } from './config'
import { logger } from './logger'
import { finished, Readable } from 'node:stream'

export type WacliEvent = { event: 'qr_code', data: { code: string } }
  | { event: 'error', data: { message: string } }
  | { event: 'closed' }
  | { event: 'auth_starting' }
  | { event: 'connected' }
  | { event: 'disconnected' }
  | { event: 'logged_out' }

// Spawns a long-running `wacli` process
export function spawnWacli(storeDir: string, args: string[], handleEvent: (event: WacliEvent) => void): ChildProcess {
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

// Runs a short-lived wacli command and resolves with the parsed JSON envelope
// (or a plain success envelope for commands that do not produce JSON). Rejects
// with WacliError when the process exits non-zero.
export function runWacli(storeDir: string, args: string[], hasResult: boolean, timeoutMs?: number): Promise<unknown> {
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
  })
}

// Parses the event stream wacli writes to stderr when --events is set.
// Each line is `{"event":"...","data":{...},"ts":<millis>}`.
function attachEventParser(stream: Readable | null, onEvent: (event: WacliEvent) => void, label?: string): void {
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
        logger.debug(`${prefix}wacli event: ${line}`)
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
