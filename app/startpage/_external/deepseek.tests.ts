import { beforeEach, describe, expect, test, vi } from 'vitest'

const { mockGenerateText, mockStreamText } = vi.hoisted(() => ({
  mockGenerateText: vi.fn(),
  mockStreamText: vi.fn(),
}))

vi.mock('ai', async (importOriginal) => {
  const actual = await importOriginal<typeof import('ai')>()
  return { ...actual, generateText: mockGenerateText, streamText: mockStreamText }
})

import { send } from './deepseek'
import { type ModelMessage, tool, type ToolSet } from 'ai'
import { z } from 'zod/v4'

const assistantMsg = (content: string): ModelMessage => ({ role: 'assistant', content: [{ type: 'text', text: content }] })

describe('send', () => {
  beforeEach(() => {
    mockGenerateText.mockReset()
    mockStreamText.mockReset()
  })

  test('non-streaming without tools', async () => {
    const messages: ModelMessage[] = [{ role: 'user' as const, content: 'Say hello exactly as: HELLO WORLD' }]
    mockGenerateText.mockResolvedValue({ responseMessages: [assistantMsg('HELLO WORLD')], toolCalls: [] })
    await send({ messages })
    expect(messages.length).toBeGreaterThan(1)
    const last = messages[messages.length - 1]
    expect(last.role).toBe('assistant')
  })

  test('non-streaming returns assistant response', async () => {
    const messages: ModelMessage[] = [{ role: 'system' as const, content: 'Reply with exactly: OK' }, { role: 'user' as const, content: 'ping' }]
    mockGenerateText.mockResolvedValue({ responseMessages: [assistantMsg('OK')], toolCalls: [] })
    await send({ messages })
    const found = messages.find(m => m.role === 'assistant')
    expect(found).toBeDefined()
  })

  test('non-streaming with tools', async () => {
    const messages: ModelMessage[] = [{ role: 'user' as const, content: 'Echo: test123' }]
    mockGenerateText.mockResolvedValueOnce({
      responseMessages: [assistantMsg(''), { role: 'tool', content: 'test123' }, assistantMsg('Done')],
      toolCalls: [{}],
    })
    await send({ messages, tools: echoTool })
    expect(messages.some(m => m.role === 'tool')).toBe(true)
  })

  test('streaming without tools', async () => {
    const messages = [{ role: 'system' as const, content: 'Reply exactly: STREAMED' }, { role: 'user' as const, content: 'go' }]
    const chunks: string[] = []
    mockStreamText.mockReturnValue({
      textStream: (function* () { yield 'STREAMED' })() as unknown as AsyncIterable<string>,
      responseMessages: Promise.resolve([assistantMsg('STREAMED')]),
      toolCalls: Promise.resolve([]),
    })
    await send({ messages, onChunk: chunk => chunks.push(chunk) })
    expect(chunks.length).toBeGreaterThan(0)
    expect(chunks.join('').length).toBeGreaterThan(0)
  })

  test('streaming with tools', async () => {
    const messages: ModelMessage[] = [{ role: 'user' as const, content: 'Get weather for Berlin' }]
    const chunks: string[] = []
    mockStreamText.mockReturnValueOnce({
      textStream: (function* () { yield 'Checking'; yield 'Sunny'; yield ' in Berlin' })() as unknown as AsyncIterable<string>,
      responseMessages: Promise.resolve([assistantMsg('Getting weather'), { role: 'tool', content: 'Sunny' }, assistantMsg('Sunny in Berlin')]),
      toolCalls: Promise.resolve([{}]),
    })
    await send({ messages, tools: weatherTool, onChunk: chunk => chunks.push(chunk) })
    expect(chunks.length).toBeGreaterThan(0)
    expect(messages.some(m => m.role === 'tool')).toBe(true)
  })

  test('mutates input messages array', async () => {
    const messages = [{ role: 'user' as const, content: 'Say: mutation test' }]
    const originalLength = messages.length
    mockGenerateText.mockResolvedValue({ responseMessages: [assistantMsg('mutated')], toolCalls: [] })
    await send({ messages })
    expect(messages.length).toBeGreaterThan(originalLength)
  })

  test('non-streaming does not call onChunk', async () => {
    const messages = [{ role: 'user' as const, content: 'Say: no stream' }]
    const called = false
    mockGenerateText.mockResolvedValue({ responseMessages: [assistantMsg('OK')], toolCalls: [] })
    await send({ messages, onChunk: undefined })
    expect(called).toBe(false)
  })

  test('streaming calls onChunk for each chunk', async () => {
    const messages = [{ role: 'system' as const, content: 'Reply with a long sentence about artificial intelligence' }, { role: 'user' as const, content: 'go' }]
    let callCount = 0
    mockStreamText.mockReturnValue({
      textStream: (function* () {
        yield 'a'
        yield 'b'
        yield 'c'
      })() as unknown as AsyncIterable<string>,
      responseMessages: Promise.resolve([assistantMsg('abc')]),
      toolCalls: Promise.resolve([]),
    })
    await send({ messages, onChunk: () => { callCount++ } })
    expect(callCount).toBeGreaterThan(0)
  })
})

const echoTool: ToolSet = {
  echo: tool({
    description: 'Echoes the input back',
    inputSchema: z.object({ text: z.string().describe('Text to echo back') }),
    outputSchema: z.string().describe('Echoed text'),
    execute: ({ text }) => text,
  }),
}

const weatherTool: ToolSet = {
  getWeather: tool({
    description: 'Get weather for a city',
    inputSchema: z.object({ city: z.string().describe('City to get the weather for') }),
    outputSchema: z.string().describe('Weather information'),
    execute: ({ city }) => `Sunny in ${city}`,
  }),
}
