import { afterEach, describe, expect, test, vi } from 'vitest'
import { AiChatConnection } from './AiChatConnection'
import type { ChatState } from './AiChatConnection'

const originalFetch = globalThis.fetch
afterEach(() => {
  globalThis.fetch = originalFetch
  vi.restoreAllMocks()
})

function streamOf(lines: string[], chunkSize = 7): Response {
  const bytes = new TextEncoder().encode(lines.map(l => `${l}\n`).join(''))
  return new Response(
    new ReadableStream({
      start(controller) {
        for (let i = 0; i < bytes.length; i += chunkSize) controller.enqueue(bytes.slice(i, i + chunkSize))
        controller.close()
      },
    }),
  )
}

function setup(...responses: Response[]) {
  const fetchMock = vi.fn()
  for (const r of responses) fetchMock.mockResolvedValueOnce(r)
  globalThis.fetch = fetchMock as typeof fetch
  const connection = new AiChatConnection({ location: { lat: 1, lon: 2 } })
  const messages: string[] = []
  const states: ChatState[] = []
  const actions: string[][] = []
  connection.onNewMessage = m => messages.push(m)
  connection.onStateChange = s => states.push(s)
  connection.onNewActions = a => actions.push(a)
  return { connection, messages, states, actions, fetchMock }
}

const opening = [
  JSON.stringify({ type: 'initialized', uuid: 'u1' }),
  JSON.stringify({ type: 'stream_response', chunk: 'Good ' }),
  JSON.stringify({ type: 'stream_response', chunk: 'morning' }),
  JSON.stringify({ type: 'finished_response' }),
  JSON.stringify({ type: 'got_actions', actions: ['Go'] }),
]

describe('AiChatConnection', () => {
  test('start streams the opening message and becomes ready', async () => {
    const { connection, messages, states, actions } = setup(streamOf(opening))
    connection.start()
    await vi.waitFor(() => expect(states.at(-1)).toEqual({ type: 'ready' }))
    expect(messages).toEqual(['Good morning'])
    expect(actions).toEqual([['Go']])
  })

  test('a message is posted with the conversation identifier', async () => {
    const answer = [
      JSON.stringify({ type: 'stream_response', chunk: 'Hi' }),
      JSON.stringify({ type: 'finished_response' }),
      JSON.stringify({ type: 'got_actions', actions: [] }),
    ]
    const { connection, messages, fetchMock, states } = setup(streamOf(opening), streamOf(answer))
    connection.start()
    await vi.waitFor(() => expect(states.at(-1)).toEqual({ type: 'ready' }))
    connection.sendMessage('hello')
    await vi.waitFor(() => expect(messages).toEqual(['Good morning', 'Hi']))
    expect(JSON.parse(fetchMock.mock.calls[1][1].body as string)).toEqual({ type: 'message', uuid: 'u1', message: 'hello' })
  })

  test('an interrupted answer is reported and the chat is usable again', async () => {
    const { connection, messages, states } = setup(streamOf(opening), streamOf([JSON.stringify({ type: 'stream_response', chunk: 'Par' })]))
    connection.start()
    await vi.waitFor(() => expect(states.at(-1)).toEqual({ type: 'ready' }))
    connection.sendMessage('hello')
    await vi.waitFor(() => expect(messages).toHaveLength(2))
    expect(messages[1]).toMatch(/Something went wrong/)
    expect(states.at(-1)).toEqual({ type: 'ready' })
  })

  test('a gone conversation cannot be resumed', async () => {
    const { connection, states } = setup(streamOf(opening), new Response('{}', { status: 410 }))
    connection.start()
    await vi.waitFor(() => expect(states.at(-1)).toEqual({ type: 'ready' }))
    connection.sendMessage('hello')
    await vi.waitFor(() => expect(states.at(-1)).toEqual({ type: 'reconnect-impossible' }))
  })

  test('terminate aborts the request without reporting an error', async () => {
    globalThis.fetch = vi.fn(
      (_url: unknown, init?: RequestInit) =>
        new Promise((_resolve, reject) => init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')))),
    ) as typeof fetch
    const connection = new AiChatConnection({ location: { lat: 1, lon: 2 } })
    const messages: string[] = []
    connection.onNewMessage = m => messages.push(m)
    connection.start()
    connection.terminate()
    await new Promise(resolve => setTimeout(resolve, 10))
    expect(messages).toEqual([])
  })
})
