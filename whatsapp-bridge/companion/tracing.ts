import type { NextFunction, Request, Response } from 'express'
import { logger } from './logger'

// Every inbound request and its generated result is traced at info level with a
// per-request id, so overlapping requests (and the wacli store conflicts they
// cause) can be told apart in the bridge logs.
const MAX_LOGGED_CHARS = 2000

const traceIds = new WeakMap<Response, string>()
let lastTraceId = 0

export function requestTracing(req: Request, res: Response, next: NextFunction): void {
  const startedAt = Date.now()
  const id = (++lastTraceId).toString(36)
  const label = sessionLabel(req)
  const request = `${req.method} ${req.originalUrl}`
  traceIds.set(res, id)
  logger.info(`${label}#${id} -> ${request}`)

  // The body parser runs after this middleware, so the request body is only
  // available once the handler finishes and is therefore logged with the result.
  let result: unknown
  let hasResult = false
  const sendJson = res.json.bind(res)
  res.json = ((body?: unknown) => {
    result = body
    hasResult = true
    return sendJson(body)
  }) as typeof res.json

  let logged = false
  const logResult = (aborted: boolean): void => {
    if (logged) return
    logged = true
    const duration = Date.now() - startedAt
    const requestBody = formatRequestBody(req)
    const responseBody = hasResult ? ` result=${formatValue(result)}` : ''
    logger.info(`${label}#${id} <- ${request} ${res.statusCode.toString()} (${duration.toString()}ms)${aborted ? ' aborted' : ''}${requestBody}${responseBody}`)
  }
  res.on('finish', () => { logResult(false) })
  res.on('close', () => { if (!res.writableFinished) logResult(true) })
  next()
}

// Lets the error handler log under the id of the request that failed.
export function traceIdOf(res: Response): string {
  const id = traceIds.get(res)
  return id === undefined ? '' : `#${id} `
}

// Renders the user id of `/sessions/{userId}/...` requests as `[userId]`, so
// traces of different users stay distinguishable.
function sessionLabel(req: Request): string {
  const match = /^\/sessions\/([^/?]+)/.exec(req.originalUrl)
  if (!match) return ''
  const userId = match[1]
  try {
    return `[${decodeURIComponent(userId)}] `
  }
  catch {
    return `[${userId}] `
  }
}

function formatRequestBody(req: Request): string {
  const body = req.body as unknown
  if (body === undefined || body === null) return ''
  if (Buffer.isBuffer(body)) {
    const text = body.toString('utf8').trim()
    return text.length === 0 ? '' : ` request=${formatValue(parseJsonOrText(text))}`
  }
  if (isEmptyObject(body)) return ''
  return ` request=${formatValue(body)}`
}

function isEmptyObject(body: unknown): boolean {
  return typeof body === 'object' && body !== null && !Array.isArray(body) && Object.keys(body).length === 0
}

function parseJsonOrText(text: string): unknown {
  try {
    return JSON.parse(text) as unknown
  }
  catch {
    return text
  }
}

function formatValue(value: unknown): string {
  const text = stringify(value)
  if (text.length <= MAX_LOGGED_CHARS) return text
  return `${text.slice(0, MAX_LOGGED_CHARS)}… (${text.length.toString()} chars)`
}

function stringify(value: unknown): string {
  if (typeof value === 'string') return value
  if (value instanceof Error) return value.message
  const text: unknown = JSON.stringify(value)
  return typeof text === 'string' ? text : String(value)
}
