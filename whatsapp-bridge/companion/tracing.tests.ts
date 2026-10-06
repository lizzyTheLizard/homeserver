import { EventEmitter } from 'node:events'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import type { Request, Response } from 'express'
import { requestTracing, traceIdOf } from './tracing'

const { mockInfo } = vi.hoisted(() => ({ mockInfo: vi.fn<(message: string) => void>() }))

vi.mock('./logger', () => ({ logger: { info: mockInfo, warn: vi.fn(), debug: vi.fn(), error: vi.fn() } }))

describe('requestTracing', () => {
  beforeEach(() => {
    mockInfo.mockClear()
  })

  test('logs the incoming request and the generated result with the session label', () => {
    const trace = makeTrace('GET', '/sessions/user%40example.com/chats')
    trace.json([{ id: '1' }])
    trace.finish()

    expect(mockInfo).toHaveBeenCalledTimes(2)
    expect(mockInfo.mock.calls[0][0]).toMatch(/^\[user@example\.com\] #[0-9a-z]+ -> GET \/sessions\/user%40example\.com\/chats$/)
    expect(mockInfo.mock.calls[1][0]).toContain('<- GET /sessions/user%40example.com/chats 200 (')
    expect(mockInfo.mock.calls[1][0]).toContain('result=[{"id":"1"}]')
  })

  test('logs the parsed request body together with the result', () => {
    const trace = makeTrace('POST', '/sessions/user%40example.com/archive-chat')
    trace.req.body = { id: '123@s.whatsapp.net', archived: true }
    trace.setStatus(204)
    trace.finish()

    expect(mockInfo.mock.calls[1][0]).toContain('204 (')
    expect(mockInfo.mock.calls[1][0]).toContain('request={"id":"123@s.whatsapp.net","archived":true}')
  })

  test('logs a raw webhook body as JSON text', () => {
    const trace = makeTrace('POST', '/sessions/user%40example.com/webhook')
    trace.req.body = Buffer.from('{"event":"message"}')
    trace.setStatus(204)
    trace.finish()

    expect(mockInfo.mock.calls[1][0]).toContain('request={"event":"message"}')
  })

  test('truncates a result that is too large to log', () => {
    const trace = makeTrace('GET', '/sessions/user%40example.com/messages?chatId=1')
    trace.json({ content: 'x'.repeat(3000) })
    trace.finish()

    const resultLine = mockInfo.mock.calls[1][0]
    expect(resultLine).toContain('… (')
    expect(resultLine).toContain('chars)')
    expect(resultLine.length).toBeLessThan(2200)
  })

  test('marks a request that was aborted before it finished', () => {
    const trace = makeTrace('GET', '/sessions/user%40example.com/status')
    trace.abort()
    trace.finish()

    expect(mockInfo).toHaveBeenCalledTimes(2)
    expect(mockInfo.mock.calls[1][0]).toContain('aborted')
  })

  test('exposes the trace id to the error handler', () => {
    expect(traceIdOf({} as Response)).toBe('')

    const trace = makeTrace('GET', '/health')
    expect(traceIdOf(trace.res)).toMatch(/^#[0-9a-z]+ $/)
  })
})

interface Trace {
  req: Request & { body: unknown }
  res: Response
  json(body?: unknown): unknown
  setStatus(code: number): void
  finish(): void
  abort(): void
}

// Minimal express Request/Response stand-in: requestTracing only reads
// `method`, `originalUrl` and `body` and registers `finish`/`close` listeners
// before replacing `res.json`, so a plain object plus an EventEmitter suffices.
function makeTrace(method: string, url: string): Trace {
  const emitter = new EventEmitter()
  const req = { method, originalUrl: url, body: undefined as unknown }
  const res = {
    statusCode: 200,
    writableFinished: false,
    json: vi.fn((body?: unknown) => body),
    on: emitter.on.bind(emitter),
  }
  requestTracing(req as unknown as Request, res as unknown as Response, () => undefined)
  return {
    req: req as Request & { body: unknown },
    res: res as unknown as Response,
    json: (body?: unknown) => res.json(body),
    setStatus: (code: number) => { res.statusCode = code },
    finish: () => { res.writableFinished = true; emitter.emit('finish') },
    abort: () => { emitter.emit('close') },
  }
}
