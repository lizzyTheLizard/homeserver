import { describe, expect, test } from 'vitest'
import { createAssistantInstance, type AssistantEvent } from './assistant'

describe('createAssistantInstance', () => {
  test('should initialize and return a greeting with actions', async () => {
    const events: AssistantEvent[] = []
    const assistant = createAssistantInstance()
    assistant.on((event) => { events.push(event) })

    await new Promise<void>((resolve, reject) => {
      assistant.on((event) => {
        if (event.type === 'finished_response') resolve()
        if (event.type === 'error') reject(event.error)
      })
      assistant.init({ location: { lat: 52.52, lon: 13.405 } })
    })

    const streamChunks = events.filter(e => e.type === 'stream_response')
    const finishedEvent = events.filter(e => e.type === 'finished_response')
    const actionsEvent = events.filter(e => e.type === 'got_actions')

    const fullText = streamChunks.map(e => e.chunk).join('')
    expect(fullText.length).toBeGreaterThan(0)

    expect(finishedEvent).toHaveLength(1)
    expect(actionsEvent).toHaveLength(1)
    expect(Array.isArray(actionsEvent[0].actions)).toBe(true)
    expect(actionsEvent[0].actions.length).toBeGreaterThan(0)
  }, 120_000)
})
