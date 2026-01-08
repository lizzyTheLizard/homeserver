import { describe, expect, test } from 'vitest'
import { CommandResult } from './Command'
import { aiPort, AiPortInput } from './AiPort'

describe.concurrent('AI Integration Tests', () => {
  test('Smoke test', async () => {
    const command: AiPortInput = {
      text: 'This is a sample text',
      title: 'Story',
      context: '',
      language: 'en',
      custom_command: 'Transform everything to uppercase',
    }
    const result: CommandResult = await aiPort(command, [], { dangerouslyAllowBrowser: true })
    expect(result).toEqual({
      durationMs: expect.any(Number) as number,
      text: 'THIS IS A SAMPLE TEXT',
      title: 'Story',
    })
  }, 10000)

  test('Context', async () => {
    const command: AiPortInput = {
      text: 'This is a sample text',
      title: 'Story',
      context: 'Always make a fullstop at the end of each sentence.',
      language: 'en',
      custom_command: 'Transform everything to uppercase',
    }
    const result: CommandResult = await aiPort(command, [], { dangerouslyAllowBrowser: true })
    expect(result).toEqual({
      durationMs: expect.any(Number) as number,
      text: expect.stringContaining('THIS IS A SAMPLE TEXT') as string,
      title: 'Story',
    })
  }, 10000)

  test('Profile', async () => {
    const command: AiPortInput = {
      text: 'This is a sample text',
      title: 'Story',
      context: '',
      profile: 'Always make a fullstop at the end of each sentence.',
      language: 'en',
      custom_command: 'Transform everything to uppercase',
    }
    const result: CommandResult = await aiPort(command, [], { dangerouslyAllowBrowser: true })
    expect(result).toEqual({
      durationMs: expect.any(Number) as number,
      text: expect.stringContaining('THIS IS A SAMPLE TEXT') as string,
      title: 'Story',
    })
  }, 10000)

  test('Selection', async () => {
    const command: AiPortInput = {
      text: 'This is a sample text',
      title: 'Story',
      context: '',
      language: 'en',
      custom_command: 'Transform everything to uppercase',
      selection_end: 21,
      selection_start: 10,
    }
    const result: CommandResult = await aiPort(command, [], { dangerouslyAllowBrowser: true })
    expect(result).toEqual({
      durationMs: expect.any(Number) as number,
      text: expect.stringContaining('This is a SAMPLE TEXT') as string,
      title: 'Story',
    })
  }, 10000)
})
