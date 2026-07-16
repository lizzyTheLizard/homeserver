import { beforeEach, describe, expect, test, vi } from 'vitest'

const { mockDeepseekSend, mockGetTools, mockGenerateInitialMessages } = vi.hoisted(() => ({
  mockDeepseekSend: vi.fn(),
  mockGetTools: vi.fn(),
  mockGenerateInitialMessages: vi.fn(),
}))

vi.mock('../_external/deepseek', () => ({ send: mockDeepseekSend }))
vi.mock('./tools', () => ({ getTools: mockGetTools }))
vi.mock('./initial', () => ({ generateInitialMessages: mockGenerateInitialMessages }))

import { createAssistantInstance, type AssistantEvent } from './assistant'
import { SendOptions } from '../_external/deepseek'

const user = { name: 'Test User', email: 'test@test.com', applications: ['startpage'] }

describe('createAssistantInstance', () => {
  test('returns an assistant with on, off, init, send', () => {
    const assistant = createAssistantInstance(user)
    expect(assistant).toHaveProperty('on')
    expect(assistant).toHaveProperty('off')
    expect(assistant).toHaveProperty('init')
    expect(assistant).toHaveProperty('send')
  })

  test('on registers and off unregisters listener', () => {
    const assistant = createAssistantInstance(user)
    const listener = vi.fn()
    assistant.on(listener)
    assistant.off(listener)
    assistant.off(listener)
    expect(listener).not.toHaveBeenCalled()
  })

  describe('init', () => {
    test('calls getTools and generateInitialMessages', async () => {
      mockGetTools.mockResolvedValue({})
      mockGenerateInitialMessages.mockResolvedValue([{ role: 'system', content: 'sys' }])

      const assistant = createAssistantInstance(user)
      await assistant.init({ location: { lat: 52, lon: 13 } })

      expect(mockGetTools).toHaveBeenCalledWith(user)
      expect(mockGenerateInitialMessages).toHaveBeenCalledWith(user, { location: { lat: 52, lon: 13 } }, expect.any(Function))
    })

    test('emits stream_response, finished_response and got_actions during init', async () => {
      mockGetTools.mockResolvedValue({})
      mockGenerateInitialMessages.mockImplementation((_user: unknown, _ctx: unknown, emit: (e: AssistantEvent) => void) => {
        emit({ type: 'stream_response', chunk: 'Good morning!' })
        emit({ type: 'finished_response' })
        emit({ type: 'got_actions', actions: ['Action 1', 'Action 2'] })
        return [{ role: 'system', content: 'instructions' }, { role: 'assistant', content: 'Good morning!' }]
      })

      const events: AssistantEvent[] = []
      const assistant = createAssistantInstance(user)
      assistant.on(e => events.push(e))
      await assistant.init({ location: { lat: 52, lon: 13 } })

      expect(events).toContainEqual({ type: 'stream_response', chunk: 'Good morning!' })
      expect(events).toContainEqual({ type: 'finished_response' })
      expect(events).toContainEqual({ type: 'got_actions', actions: ['Action 1', 'Action 2'] })
    })
  })

  describe('send', () => {
    beforeEach(() => {
      mockGetTools.mockResolvedValue({})
      mockGenerateInitialMessages.mockResolvedValue([{ role: 'system', content: 'sys' }])
      let callCount = 0
      mockDeepseekSend.mockImplementation((options: { messages: { role: string, content: string }[] }) => {
        callCount++
        if (callCount === 2) {
          options.messages.push({ role: 'assistant', content: '[]' })
          return '[]'
        }
      })
    })

    test('calls deepseekSend twice', async () => {
      const assistant = createAssistantInstance(user)
      await assistant.init({ location: { lat: 52, lon: 13 } })
      mockDeepseekSend.mockClear()
      await assistant.send('Hello')
      expect(mockDeepseekSend).toHaveBeenCalledTimes(2)
    })

    test('emits stream_response and tool_call via deepseekSend callbacks', async () => {
      mockGetTools.mockResolvedValue({})
      mockGenerateInitialMessages.mockResolvedValue([{ role: 'system', content: 'sys' }])

      const assistant = createAssistantInstance(user)
      await assistant.init({ location: { lat: 52, lon: 13 } })

      const events: AssistantEvent[] = []
      assistant.on(e => events.push(e))

      let callCount = 0
      mockDeepseekSend.mockImplementation((options: SendOptions) => {
        callCount++
        options.onChunk?.('Hello')
        options.onChunk?.(' World')
        options.onToolCall?.()
        if (callCount === 2) options.messages.push({ role: 'assistant', content: '[]' }); return '[]'
      })

      await assistant.send('test')

      expect(events).toContainEqual({ type: 'stream_response', chunk: 'Hello' })
      expect(events).toContainEqual({ type: 'stream_response', chunk: ' World' })
      expect(events).toContainEqual({ type: 'tool_call' })
    })

    test('emits finished_response after sending', async () => {
      const assistant = createAssistantInstance(user)
      await assistant.init({ location: { lat: 52, lon: 13 } })

      const events: AssistantEvent[] = []
      assistant.on(e => events.push(e))
      await assistant.send('test')

      expect(events).toContainEqual({ type: 'finished_response' })
    })

    test('emits got_actions from second deepseekSend result', async () => {
      const assistant = createAssistantInstance(user)
      await assistant.init({ location: { lat: 52, lon: 13 } })

      const events: AssistantEvent[] = []
      assistant.on(e => events.push(e))

      let callCount = 0
      mockDeepseekSend.mockImplementation(({ messages }: { messages: { role: string, content: string }[] }) => {
        callCount++
        if (callCount === 2) {
          messages.push({ role: 'assistant', content: '["Action A", "Action B"]' })
          return '["Action A", "Action B"]'
        }
      })

      await assistant.send('test')

      expect(events).toContainEqual({ type: 'got_actions', actions: ['Action A', 'Action B'] })
    })

    test('emits got_actions with empty array when no actions', async () => {
      const assistant = createAssistantInstance(user)
      await assistant.init({ location: { lat: 52, lon: 13 } })

      const events: AssistantEvent[] = []
      assistant.on(e => events.push(e))

      let callCount = 0
      mockDeepseekSend.mockImplementation(({ messages }: { messages: { role: string, content: string }[] }) => {
        callCount++
        if (callCount === 2) {
          messages.push({ role: 'assistant', content: '[]' })
          return '[]'
        }
      })

      await assistant.send('test')

      expect(events).toContainEqual({ type: 'got_actions', actions: [] })
    })
  })
})
