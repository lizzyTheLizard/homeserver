import { beforeEach, describe, expect, test, vi } from 'vitest'

const { mockGenerateText, mockStreamText } = vi.hoisted(() => ({
  mockGenerateText: vi.fn(),
  mockStreamText: vi.fn(),
}))

vi.mock('ai', async (importOriginal) => {
  const actual = await importOriginal<typeof import('ai')>()
  return { ...actual, generateText: mockGenerateText, streamText: mockStreamText }
})

import { type ModelMessage, type ToolSet, tool } from 'ai'
import { send } from './groq'
import { z } from 'zod/v4'

const assistantMsg = (content: string): ModelMessage => ({ content: [{ text: content, type: 'text' }], role: 'assistant' })

describe('send', () => {
  beforeEach(() => {
    mockGenerateText.mockReset()
    mockStreamText.mockReset()
  })

  test('non-streaming without tools', async () => {
    const messages: ModelMessage[] = [{ content: 'Say hello exactly as: HELLO WORLD', role: 'user' as const }]
    mockGenerateText.mockResolvedValue({ responseMessages: [assistantMsg('HELLO WORLD')], toolCalls: [] })
    await send({ messages })
    expect(messages.length).toBeGreaterThan(1)
    const last = messages[messages.length - 1]
    expect(last.role).toBe('assistant')
  })

  test('non-streaming returns assistant response', async () => {
    const messages: ModelMessage[] = [{ content: 'Reply with exactly: OK', role: 'system' as const }, { content: 'ping', role: 'user' as const }]
    mockGenerateText.mockResolvedValue({ responseMessages: [assistantMsg('OK')], toolCalls: [] })
    await send({ messages })
    const found = messages.find(m => m.role === 'assistant')
    expect(found).toBeDefined()
  })

  test('non-streaming with tools', async () => {
    const messages: ModelMessage[] = [{ content: 'Echo: test123', role: 'user' as const }]
    mockGenerateText.mockResolvedValueOnce({
      responseMessages: [assistantMsg(''), { content: 'test123', role: 'tool' }, assistantMsg('Done')],
      toolCalls: [{}],
    })
    await send({ messages, tools: echoTool })
    expect(messages.some(m => m.role === 'tool')).toBe(true)
  })

  test('streaming without tools', async () => {
    const messages = [{ content: 'Reply exactly: STREAMED', role: 'system' as const }, { content: 'go', role: 'user' as const }],
     chunks: string[] = []
    mockStreamText.mockReturnValue({
      responseMessages: Promise.resolve([assistantMsg('STREAMED')]),
      textStream: (function*  textStream() { yield 'STREAMED' })() as unknown as AsyncIterable<string>,
      toolCalls: Promise.resolve([]),
    })
    await send({ messages, onChunk: chunk => chunks.push(chunk) })
    expect(chunks.length).toBeGreaterThan(0)
    expect(chunks.join('').length).toBeGreaterThan(0)
  })

  test('streaming with tools', async () => {
    const messages: ModelMessage[] = [{ content: 'Get weather for Berlin', role: 'user' as const }],
     chunks: string[] = []
    mockStreamText.mockReturnValueOnce({
      responseMessages: Promise.resolve([assistantMsg('Getting weather'), { content: 'Sunny', role: 'tool' }, assistantMsg('Sunny in Berlin')]),
      textStream: (function*  textStream() {
        yield 'Checking'
        yield 'Sunny'
        yield ' in Berlin'
      })() as unknown as AsyncIterable<string>,
      toolCalls: Promise.resolve([{}]),
    })
    await send({ messages, onChunk: chunk => chunks.push(chunk), tools: weatherTool })
    expect(chunks.length).toBeGreaterThan(0)
    expect(messages.some(m => m.role === 'tool')).toBe(true)
  })

  test('mutates input messages array', async () => {
    const messages = [{ content: 'Say: mutation test', role: 'user' as const }],
     originalLength = messages.length
    mockGenerateText.mockResolvedValue({ responseMessages: [assistantMsg('mutated')], toolCalls: [] })
    await send({ messages })
    expect(messages.length).toBeGreaterThan(originalLength)
  })

  test('non-streaming does not call onChunk', async () => {
    const messages = [{ content: 'Say: no stream', role: 'user' as const }],
     called = false
    mockGenerateText.mockResolvedValue({ responseMessages: [assistantMsg('OK')], toolCalls: [] })
    await send({ messages, onChunk: undefined })
    expect(called).toBe(false)
  })

  test('streaming calls onChunk for each chunk', async () => {
    const messages = [{ content: 'Reply with a long sentence about artificial intelligence', role: 'system' as const }, { content: 'go', role: 'user' as const }]
    let callCount = 0
    mockStreamText.mockReturnValue({
      responseMessages: Promise.resolve([assistantMsg('abc')]),
      textStream: (function*  textStream() {
        yield 'a'
        yield 'b'
        yield 'c'
      })() as unknown as AsyncIterable<string>,
      toolCalls: Promise.resolve([]),
    })
    await send({ messages, onChunk: () => { callCount++ } })
    expect(callCount).toBeGreaterThan(0)
  })
})

const echoTool: ToolSet = {
  echo: tool({
    description: 'Echoes the input back',
    execute: ({ text }) => text,
    inputSchema: z.object({ text: z.string().describe('Text to echo back') }),
    outputSchema: z.string().describe('Echoed text'),
  }),
},

 weatherTool: ToolSet = {
  getWeather: tool({
    description: 'Get weather for a city',
    execute: ({ city }) => `Sunny in ${city}`,
    inputSchema: z.object({ city: z.string().describe('City to get the weather for') }),
    outputSchema: z.string().describe('Weather information'),
  }),
}
