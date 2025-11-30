import { describe, expect, test } from 'vitest'
import { aiPort } from './aiPort.js'
import { CommandResult, CommandWithoutResult } from './Command.js'
import { v4 as uuid } from 'uuid'

describe.concurrent('AI Integration Tests', () => {
  test('Smoke test', async () => {
    const command: CommandWithoutResult = {
      id: uuid(),
      discussion_id: uuid(),
      template_id: uuid(),
      text: 'This is a sample text',
      title: 'Story',
      context: '',
      language: 'en',
      custom_command: 'Transform everything to uppercase',
    }
    const result: CommandResult = await aiPort(command, [])
    console.log(result)
    expect(result).toEqual({
      durationMs: expect.any(Number) as number,
      newText: 'THIS IS A SAMPLE TEXT',
      newTitle: 'Story',
    })
  })

  test('Context', async () => {
    const command: CommandWithoutResult = {
      id: uuid(),
      discussion_id: uuid(),
      template_id: uuid(),
      text: 'This is a sample text',
      title: 'Story',
      context: 'Always make a fullstop at the end of each sentence.',
      language: 'en',
      custom_command: 'Transform everything to uppercase',
    }
    const result: CommandResult = await aiPort(command, [])
    console.log(result)
    expect(result).toEqual({
      durationMs: expect.any(Number) as number,
      newText: expect.stringContaining('THIS IS A SAMPLE TEXT') as string,
      newTitle: 'Story',
    })
  })
  test('Profile', async () => {
    const command: CommandWithoutResult = {
      id: uuid(),
      discussion_id: uuid(),
      template_id: uuid(),
      text: 'This is a sample text',
      title: 'Story',
      context: '',
      profile: 'Always make a fullstop at the end of each sentence.',
      language: 'en',
      custom_command: 'Transform everything to uppercase',
    }
    const result: CommandResult = await aiPort(command, [])
    console.log(result)
    expect(result).toEqual({
      durationMs: expect.any(Number) as number,
      newText: expect.stringContaining('THIS IS A SAMPLE TEXT') as string,
      newTitle: 'Story',
    })
  })
})
