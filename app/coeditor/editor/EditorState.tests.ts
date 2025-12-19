import { describe, expect, test } from 'vitest'
import { editorStateReducer, initialState } from './EditorState'
import { Discussion } from '../Discussion'
import { Template } from '../Template'

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
    })
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
    const result = editorStateReducer(state, { type: 'COMMAND_EXECUTED', restart: false, discussion: { ...discussion, text: 'Updated text' } as unknown as Discussion })
    expect(result).toEqual({
      ...state,
      text: 'Updated text',
      undoStack: ['Some text'],
      redoStack: [],
    })
  })

  test('Restart command', () => {
    const result = editorStateReducer(state, { type: 'COMMAND_EXECUTED', restart: true, discussion: { id: '2', text: 'Restarted text', template_id: '1', parameters: {} } as unknown as Discussion })
    expect(result).toEqual({
      ...state,
      text: 'Restarted text',
      undoStack: [],
      redoStack: [],
    })
  })

  test('Initialize command', () => {
    const state = initialState(undefined, templates)
    const result = editorStateReducer(state, { type: 'COMMAND_EXECUTED', restart: false, discussion: { id: '1', text: 'Initialized text', template_id: '1', parameters: {} } as unknown as Discussion })
    expect(result).toEqual({
      ...state,
      text: 'Initialized text',
      undoStack: [''],
      redoStack: [],
    })
  })
})
