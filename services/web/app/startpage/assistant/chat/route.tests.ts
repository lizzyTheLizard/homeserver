import { beforeEach, describe, expect, test, vi } from 'vitest'
import type { AssistantEvent } from './types'

const { mockGetUserSession, mockInit, mockSend } = vi.hoisted(() => ({ mockGetUserSession: vi.fn(), mockInit: vi.fn(), mockSend: vi.fn() }))

vi.mock('@/app/shared/auth/auth', () => ({ getUserSession: mockGetUserSession }))
vi.mock('@/app/shared/logger', () => ({ logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() } }))
vi.mock('./assistant', () => ({
  createAssistantInstance: () => {
    const listeners: ((event: AssistantEvent) => void)[] = []
    const emit = (event: AssistantEvent) => listeners.forEach(l => l(event))
    return {
      on: (l: (event: AssistantEvent) => void) => listeners.push(l),
      off: (l: (event: AssistantEvent) => void) => listeners.splice(listeners.indexOf(l), 1),
      init: (ctx: unknown) => mockInit(ctx, emit) as Promise<void>,
      send: (message: string, signal?: AbortSignal) => mockSend(message, signal, emit) as Promise<void>,
    }
  },
}))

import { POST as handler } from './route'

const user = { name: 'A', email: 'a@test.com', applications: ['startpage'] }
const location = { lat: 1, lon: 2 }

beforeEach(() => {
  globalThis.assistantConversations = undefined
  vi.clearAllMocks()
  mockGetUserSession.mockResolvedValue(user)
  mockInit.mockImplementation((_ctx: unknown, emit: (e: AssistantEvent) => void) => {
    emit({ type: 'stream_response', chunk: 'Hello' })
    emit({ type: 'finished_response' })
    emit({ type: 'got_actions', actions: ['a'] })
    return Promise.resolve()
  })
})

function post(body: unknown): Promise<Response> {
  return handler(new Request('http://localhost/startpage/assistant/chat', { method: 'POST', body: JSON.stringify(body) }))
}

async function events(response: Response): Promise<Record<string, unknown>[]> {
  const text = await response.text()
  return text
    .split('\n')
    .filter(Boolean)
    .map(l => JSON.parse(l) as Record<string, unknown>)
}

async function start(): Promise<string> {
  const [initialized] = await events(await post({ type: 'start', initialContext: { location } }))
  return initialized.uuid as string
}

describe('POST /startpage/assistant/chat', () => {
  test('start streams the identifier followed by the opening message', async () => {
    const response = await post({ type: 'start', initialContext: { location } })
    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toContain('application/x-ndjson')
    const list = await events(response)
    expect(list.map(e => e.type)).toEqual(['initialized', 'stream_response', 'finished_response', 'got_actions'])
    expect(mockInit).toHaveBeenCalledWith({ location }, expect.any(Function))
  })

  test('a message streams tool call, answer and actions in order', async () => {
    const uuid = await start()
    mockSend.mockImplementation((_m: string, _s: unknown, emit: (e: AssistantEvent) => void) => {
      emit({ type: 'tool_call' })
      emit({ type: 'stream_response', chunk: 'Hi' })
      emit({ type: 'finished_response' })
      emit({ type: 'got_actions', actions: [] })
      return Promise.resolve()
    })
    const list = await events(await post({ type: 'message', uuid, message: 'hello' }))
    expect(list.map(e => e.type)).toEqual(['tool_call', 'stream_response', 'finished_response', 'got_actions'])
    expect(mockSend).toHaveBeenCalledWith('hello', expect.any(AbortSignal), expect.any(Function))
  })

  test('a failing answer ends with an error event', async () => {
    const uuid = await start()
    mockSend.mockRejectedValue(new Error('model down'))
    const list = await events(await post({ type: 'message', uuid, message: 'hello' }))
    expect(list.at(-1)).toMatchObject({ type: 'error' })
  })

  test('a failing start ends with an error event and discards the conversation', async () => {
    mockInit.mockRejectedValue(new Error('no context'))
    const list = await events(await post({ type: 'start', initialContext: { location } }))
    expect(list.map(e => e.type)).toEqual(['initialized', 'error'])
    const response = await post({ type: 'message', uuid: list[0].uuid, message: 'x' })
    expect(response.status).toBe(410)
  })

  test('answers 401 without a session', async () => {
    mockGetUserSession.mockResolvedValue(undefined)
    expect((await post({ type: 'start', initialContext: { location } })).status).toBe(401)
  })

  test('answers 403 without the start page application', async () => {
    mockGetUserSession.mockResolvedValue({ ...user, applications: [] })
    expect((await post({ type: 'start', initialContext: { location } })).status).toBe(403)
    expect(mockInit).not.toHaveBeenCalled()
  })

  test('answers 400 for an invalid body', async () => {
    expect((await post({ type: 'nonsense' })).status).toBe(400)
    expect((await handler(new Request('http://localhost/x', { method: 'POST', body: 'not json' }))).status).toBe(400)
  })

  test('answers 410 for an unknown conversation and for another user', async () => {
    expect((await post({ type: 'message', uuid: 'nope', message: 'x' })).status).toBe(410)
    const uuid = await start()
    mockGetUserSession.mockResolvedValue({ ...user, email: 'other@test.com' })
    expect((await post({ type: 'message', uuid, message: 'x' })).status).toBe(410)
  })

  test('answers 409 while the previous answer is still running', async () => {
    const uuid = await start()
    let finish: () => void = () => undefined
    mockSend.mockImplementation(() => new Promise<void>(resolve => (finish = resolve)))
    const first = await post({ type: 'message', uuid, message: 'one' })
    expect((await post({ type: 'message', uuid, message: 'two' })).status).toBe(409)
    finish()
    await events(first)
    mockSend.mockResolvedValue(undefined)
    expect((await post({ type: 'message', uuid, message: 'three' })).status).toBe(200)
  })
})
