import { describe, expect, test } from 'vitest'
import { Command } from '../_data/Command'
import { AiPortInput, getFullNewText, mapToChatMessages, parseOutput } from './AiPort'

describe('mapToChatMessages', () => {
  test('predefined command maps to a user message', () => {
    const input: AiPortInput = { text: 'Some text', language: 'en', context: 'ctx', predefined_command: 'IMPROVE' }
    const result = mapToChatMessages(input)
    expect(result).toHaveLength(1)
    expect(result[0].role).toBe('user')
    const message = JSON.parse(result[0].content) as { command: string, selection: undefined }
    expect(message.command).toContain('improve the text')
    expect(message.selection).toBeUndefined()
  })

  test('custom command maps to a user message', () => {
    const input: AiPortInput = { text: 'Some text', language: 'en', context: 'ctx', custom_command: 'Make it shorter' }
    const result = mapToChatMessages(input)
    expect(JSON.parse(result[0].content) as { command: string }).toEqual(expect.objectContaining({ command: 'Make it shorter' }))
  })

  test('command history result maps to a user/assistant pair', () => {
    const command = { id: 'c1', discussion_id: '1', text: 'Some text', context: 'ctx', language: 'en', predefined_command: 'IMPROVE', result: { text: 'Improved text', title: 'Title' } } as unknown as Command
    const result = mapToChatMessages(command)
    expect(result).toHaveLength(2)
    expect(result[0].role).toBe('user')
    expect(result[1].role).toBe('assistant')
    expect(JSON.parse(result[1].content)).toEqual({ text: 'Improved text', title: 'Title' })
  })

  test('missing command throws', () => {
    const input = { text: 'Some text', language: 'en', context: 'ctx' } as AiPortInput
    expect(() => mapToChatMessages(input)).toThrow()
  })
})

describe('getFullNewText', () => {
  test('no selection returns the new text as-is', () => {
    const input = { text: 'abc', language: 'en', context: 'ctx' } as AiPortInput
    expect(getFullNewText(input, 'xyz')).toBe('xyz')
  })

  test('selection replaces the selected part', () => {
    const input = { text: 'Hello World', selection_start: 0, selection_end: 5, language: 'en', context: 'ctx' } as AiPortInput
    expect(getFullNewText(input, 'Hi')).toBe('Hi World')
  })
})

describe('parseOutput', () => {
  test('parses a valid response', () => {
    expect(parseOutput('{"text":"New text","title":"Title"}')).toEqual({ text: 'New text', title: 'Title' })
  })

  test('throws on non-JSON', () => {
    expect(() => parseOutput('not json')).toThrow()
  })

  test('throws on missing fields', () => {
    expect(() => parseOutput('{"text":"Only text"}')).toThrow()
  })
})
