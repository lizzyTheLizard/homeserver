import { describe, expect, test } from 'vitest'
import { send } from './deepseek'
import { ModelMessage, tool, type ToolSet } from 'ai'
import { z } from 'zod/v4'

describe.skipIf(!process.env.AI_API_KEY)('send', () => {
  test('non-streaming without tools', async () => {
    const messages: ModelMessage[] = [{ role: 'user' as const, content: 'Say hello exactly as: HELLO WORLD' }]
    await send({ messages })
    expect(messages.length).toBeGreaterThan(1)
    const last = messages[messages.length - 1]
    expect(last.role).toBe('assistant')
  })

  test('non-streaming returns assistant response', async () => {
    const messages: ModelMessage[] = [{ role: 'system' as const, content: 'Reply with exactly: OK' }, { role: 'user' as const, content: 'ping' }]
    await send({ messages })
    const assistantMsg = messages.find(m => m.role === 'assistant')
    expect(assistantMsg).toBeDefined()
  })

  test('non-streaming with tools', async () => {
    const messages: ModelMessage[] = [{ role: 'user' as const, content: 'Echo: test123' }]
    const toolCalls: string[] = []
    await send({ messages, tools: echoTool, onToolCall: () => toolCalls.push('echo') })
    expect(messages.some(m => m.role === 'tool')).toBe(true)
    expect(toolCalls.length).toBeGreaterThan(0)
  })

  test('streaming without tools', async () => {
    const messages = [{ role: 'system' as const, content: 'Reply exactly: STREAMED' }, { role: 'user' as const, content: 'go' }]
    const chunks: string[] = []
    await send({ messages, onChunk: chunk => chunks.push(chunk) })
    expect(chunks.length).toBeGreaterThan(0)
    expect(chunks.join('').length).toBeGreaterThan(0)
  })

  test('streaming with tools', async () => {
    const messages: ModelMessage[] = [{ role: 'user' as const, content: 'Get weather for Berlin' }]
    const chunks: string[] = []
    const toolCalls: string[] = []
    await send({ messages, tools: weatherTool, onChunk: chunk => chunks.push(chunk), onToolCall: () => toolCalls.push('weather') })
    expect(toolCalls.length).toBeGreaterThan(0)
    expect(messages.some(m => m.role === 'tool')).toBe(true)
  })

  test('mutates input messages array', async () => {
    const messages = [{ role: 'user' as const, content: 'Say: mutation test' }]
    const originalLength = messages.length
    await send({ messages })
    expect(messages.length).toBeGreaterThan(originalLength)
  })

  test('non-streaming does not call onChunk', async () => {
    const messages = [{ role: 'user' as const, content: 'Say: no stream' }]
    const called = false
    await send({ messages, onChunk: undefined })
    expect(called).toBe(false)
  })

  test('streaming calls onChunk for each chunk', async () => {
    const messages = [{ role: 'system' as const, content: 'Reply with a long sentence about artificial intelligence' }, { role: 'user' as const, content: 'go' }]
    let callCount = 0
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
