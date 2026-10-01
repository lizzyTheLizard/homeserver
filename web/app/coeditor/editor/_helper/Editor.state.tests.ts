import { describe, expect, test } from 'vitest'
import { editorStateReducer, initialState } from './Editor.state'
import { Discussion } from '../../_data/Discussion'
import { Template } from '../../_data/Template'
import { Command } from '../../_data/Command'

const templates = [
  { id: '1', language: 'en', parameters: [] },
  { id: '2', language: 'de', parameters: [] },
  { id: '3', language: 'en', parameters: [{ name: 'param1', type: 'STRING', startPosition: 10, endPosition: 16 }] },
] as Template[]

const discussion = { id: '1', text: 'Some text', template_id: '3', parameters: { param1: 'value1' } } as unknown as Discussion

describe('Initialize Editor State', () => {
  test('initial without discussion', () => {
    const result = initialState(undefined, templates)
    expect(result).toEqual({
      text: '',
      lastText: '',
      undoStack: [],
      redoStack: [],
      template: templates[0],
      parameters: {},
      contextValid: true,
      messages: [],
    })
  })

  test('initial with discussion', () => {
    const result = initialState(discussion, templates.slice(2))
    expect(result).toEqual({
      text: discussion.text,
      lastText: 'Some text',
      undoStack: [],
      redoStack: [],
      template: templates[2],
      parameters: discussion.parameters,
      contextValid: true,
      messages: [],
    })
  })

  test('initial invalid', () => {
    const result = initialState(undefined, templates.slice(2))
    expect(result).toEqual({
      text: '',
      lastText: '',
      undoStack: [],
      redoStack: [],
      template: templates[2],
      parameters: {},
      contextValid: false,
      messages: [],
    })
  })

  test('initial with command history', () => {
    const commands = [
      { id: 'c1', discussion_id: '1', text: 'Some text', context: 'ctx', language: 'en', predefined_command: 'IMPROVE', result: { text: 'Improved text', title: 'Title', durationMs: 100 } },
      { id: 'c2', discussion_id: '1', text: 'Some text', context: 'ctx', language: 'en', custom_command: 'Make it shorter', result: { text: 'Shorter text', title: 'Title', durationMs: 100 } },
    ] as unknown as Command[]

    const result = initialState(undefined, templates, commands)

    expect(result.messages).toEqual([
      { id: 0, role: 'user', content: 'Improve' },
      { id: 1, role: 'assistant', content: 'Improved text' },
      { id: 2, role: 'user', content: 'Make it shorter' },
      { id: 3, role: 'assistant', content: 'Shorter text' },
    ])
  })
})

describe('Context Change', () => {
  const state = initialState(discussion, templates)

  test('Template change', () => {
    const result = editorStateReducer(state, { type: 'TEMPLATE_CHANGE', template: templates[1] })
    expect(result).toEqual({
      ...state,
      template: templates[1],
      parameters: {},
      contextValid: true,
    })
  })

  test('Template change to same', () => {
    const result = editorStateReducer(state, { type: 'TEMPLATE_CHANGE', template: templates[2] })
    expect(result).toBe(state)
  })

  test('Parameter change', () => {
    const result = editorStateReducer(state, { type: 'PARAMETERS_CHANGE', name: 'param1', value: 'newvalue' })
    expect(result).toEqual({
      ...state,
      parameters: { param1: 'newvalue' },
    })
  })

  test('Parameter to undef', () => {
    const result = editorStateReducer(state, { type: 'PARAMETERS_CHANGE', name: 'param1', value: undefined })
    expect(result).toEqual({
      ...state,
      parameters: { },
      contextValid: false,
    })
  })

  test('Parameter change to same', () => {
    const result = editorStateReducer(state, { type: 'PARAMETERS_CHANGE', name: 'param1', value: 'value1' })
    expect(result).toBe(state)
  })
})

describe('Text Change', () => {
  const state = editorStateReducer(initialState(undefined, templates), { type: 'TEXT_CHANGE', text: 'Initial text' })

  test('Change', () => {
    const result = editorStateReducer(editorStateReducer(editorStateReducer(state, { type: 'TEXT_BLUR' }), { type: 'TEXT_CHANGE', text: 'New text' }), { type: 'TEXT_BLUR' })
    expect(result).toEqual({
      ...state,
      text: 'New text',
      lastText: 'New text',
      undoStack: ['', 'Initial text'],
      redoStack: [],
    })
  })

  test('Text Change to same', () => {
    const result = editorStateReducer(state, { type: 'TEXT_CHANGE', text: 'Initial text' })
    expect(result).toBe(state)
  })

  test('Undo', () => {
    const changedState = editorStateReducer(editorStateReducer(editorStateReducer(state, { type: 'TEXT_BLUR' }), { type: 'TEXT_CHANGE', text: 'New text' }), { type: 'TEXT_BLUR' })
    const result = editorStateReducer(changedState, { type: 'UNDO' })
    expect(result).toEqual({
      ...state,
      lastText: 'Initial text',
      text: 'Initial text',
      undoStack: [''],
      redoStack: ['New text'],
    })
  })

  test('Redo', () => {
    const changedState = editorStateReducer(editorStateReducer(editorStateReducer(state, { type: 'TEXT_BLUR' }), { type: 'TEXT_CHANGE', text: 'New text' }), { type: 'TEXT_BLUR' })
    const undoneState = editorStateReducer(changedState, { type: 'UNDO' })
    const result = editorStateReducer(undoneState, { type: 'REDO' })
    expect(result).toEqual({
      ...state,
      text: 'New text',
      lastText: 'New text',
      undoStack: ['', 'Initial text'],
      redoStack: [],
    })
  })
})

describe('Command Executed', () => {
  const state = initialState(discussion, templates)

  test('Normal command', () => {
    const result = editorStateReducer(state, { type: 'COMMAND_EXECUTED', restart: false, discussion: { ...discussion, text: 'Updated text' } as unknown as Discussion, userMessage: 'Improve', assistantMessage: 'Updated text' })
    expect(result).toEqual({
      ...state,
      text: 'Updated text',
      undoStack: ['Some text'],
      redoStack: [],
      messages: [
        { id: 0, role: 'user', content: 'Improve' },
        { id: 1, role: 'assistant', content: 'Updated text' },
      ],
    })
  })

  test('Restart command resets the chat', () => {
    const result = editorStateReducer(state, { type: 'COMMAND_EXECUTED', restart: true, discussion: { id: '2', text: 'Restarted text', template_id: '1', parameters: {} } as unknown as Discussion, userMessage: 'Initialize', assistantMessage: 'Restarted text' })
    expect(result).toEqual({
      ...state,
      text: 'Restarted text',
      undoStack: [],
      redoStack: [],
      messages: [
        { id: 0, role: 'user', content: 'Initialize' },
        { id: 1, role: 'assistant', content: 'Restarted text' },
      ],
    })
  })

  test('Initialize command appends to the chat', () => {
    const state = initialState(undefined, templates)
    const result = editorStateReducer(state, { type: 'COMMAND_EXECUTED', restart: false, discussion: { id: '1', text: 'Initialized text', template_id: '1', parameters: {} } as unknown as Discussion, userMessage: 'Initialize', assistantMessage: 'Initialized text' })
    expect(result).toEqual({
      ...state,
      text: 'Initialized text',
      undoStack: [''],
      redoStack: [],
      messages: [
        { id: 0, role: 'user', content: 'Initialize' },
        { id: 1, role: 'assistant', content: 'Initialized text' },
      ],
    })
  })

  test('Normal command appends to existing chat', () => {
    const commands = [{ id: 'c1', discussion_id: '1', text: 'Some text', context: 'ctx', language: 'en', predefined_command: 'IMPROVE', result: { text: 'Improved text', title: 'Title', durationMs: 100 } }] as unknown as Command[]
    const state = initialState(discussion, templates, commands)
    const result = editorStateReducer(state, { type: 'COMMAND_EXECUTED', restart: false, discussion: { ...discussion, text: 'Updated text' } as unknown as Discussion, userMessage: 'Make it shorter', assistantMessage: 'Updated text' })
    expect(result).toEqual({
      ...state,
      text: 'Updated text',
      undoStack: ['Some text'],
      redoStack: [],
      messages: [
        { id: 0, role: 'user', content: 'Improve' },
        { id: 1, role: 'assistant', content: 'Improved text' },
        { id: 2, role: 'user', content: 'Make it shorter' },
        { id: 3, role: 'assistant', content: 'Updated text' },
      ],
    })
  })
})
