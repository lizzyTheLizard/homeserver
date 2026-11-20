import { describe, expect, test } from 'vitest'
import { editorStateReducer, initialState } from './Editor.state'
import type { Discussion } from '../../_data/Discussion'
import type { Template } from '../../_data/Template'

const templates = [
  { id: '1', language: 'en', parameters: [] },
  { id: '2', language: 'de', parameters: [] },
  { id: '3', language: 'en', parameters: [{ endPosition: 16, name: 'param1', startPosition: 10, type: 'STRING' }] },
] as Template[],

 discussion = { id: '1', parameters: { param1: 'value1' }, template_id: '3', text: 'Some text' } as unknown as Discussion

describe('Initialize Editor State', () => {
  test('initial without discussion', () => {
    const result = initialState(undefined, templates)
    expect(result).toEqual({
      contextValid: true,
      lastText: '',
      parameters: {},
      redoStack: [],
      template: templates[0],
      text: '',
      undoStack: [],
    })
  })

  test('initial with discussion', () => {
    const result = initialState(discussion, templates.slice(2))
    expect(result).toEqual({
      contextValid: true,
      lastText: 'Some text',
      parameters: discussion.parameters,
      redoStack: [],
      template: templates[2],
      text: discussion.text,
      undoStack: [],
    })
  })

  test('initial invalid', () => {
    const result = initialState(undefined, templates.slice(2))
    expect(result).toEqual({
      contextValid: false,
      lastText: '',
      parameters: {},
      redoStack: [],
      template: templates[2],
      text: '',
      undoStack: [],
    })
  })
})

describe('Context Change', () => {
  const state = initialState(discussion, templates)

  test('Template change', () => {
    const result = editorStateReducer(state, { template: templates[1], type: 'TEMPLATE_CHANGE' })
    expect(result).toEqual({
      ...state,
      contextValid: true,
      parameters: {},
      template: templates[1],
    })
  })

  test('Template change to same', () => {
    const result = editorStateReducer(state, { template: templates[2], type: 'TEMPLATE_CHANGE' })
    expect(result).toBe(state)
  })

  test('Parameter change', () => {
    const result = editorStateReducer(state, { name: 'param1', type: 'PARAMETERS_CHANGE', value: 'newvalue' })
    expect(result).toEqual({
      ...state,
      parameters: { param1: 'newvalue' },
    })
  })

  test('Parameter to undef', () => {
    const result = editorStateReducer(state, { name: 'param1', type: 'PARAMETERS_CHANGE', value: undefined })
    expect(result).toEqual({
      ...state,
      contextValid: false,
      parameters: { },
    })
  })

  test('Parameter change to same', () => {
    const result = editorStateReducer(state, { name: 'param1', type: 'PARAMETERS_CHANGE', value: 'value1' })
    expect(result).toBe(state)
  })
})

describe('Text Change', () => {
  const state = editorStateReducer(initialState(undefined, templates), { text: 'Initial text', type: 'TEXT_CHANGE' })

  test('Change', () => {
    const result = editorStateReducer(editorStateReducer(editorStateReducer(state, { type: 'TEXT_BLUR' }), { text: 'New text', type: 'TEXT_CHANGE' }), { type: 'TEXT_BLUR' })
    expect(result).toEqual({
      ...state,
      lastText: 'New text',
      redoStack: [],
      text: 'New text',
      undoStack: ['', 'Initial text'],
    })
  })

  test('Text Change to same', () => {
    const result = editorStateReducer(state, { text: 'Initial text', type: 'TEXT_CHANGE' })
    expect(result).toBe(state)
  })

  test('Undo', () => {
    const changedState = editorStateReducer(editorStateReducer(editorStateReducer(state, { type: 'TEXT_BLUR' }), { text: 'New text', type: 'TEXT_CHANGE' }), { type: 'TEXT_BLUR' }),
     result = editorStateReducer(changedState, { type: 'UNDO' })
    expect(result).toEqual({
      ...state,
      lastText: 'Initial text',
      redoStack: ['New text'],
      text: 'Initial text',
      undoStack: [''],
    })
  })

  test('Redo', () => {
    const changedState = editorStateReducer(editorStateReducer(editorStateReducer(state, { type: 'TEXT_BLUR' }), { text: 'New text', type: 'TEXT_CHANGE' }), { type: 'TEXT_BLUR' }),
     undoneState = editorStateReducer(changedState, { type: 'UNDO' }),
     result = editorStateReducer(undoneState, { type: 'REDO' })
    expect(result).toEqual({
      ...state,
      lastText: 'New text',
      redoStack: [],
      text: 'New text',
      undoStack: ['', 'Initial text'],
    })
  })
})

describe('Command Executed', () => {
  const state = initialState(discussion, templates)

  test('Normal command', () => {
    const result = editorStateReducer(state, { discussion: { ...discussion, text: 'Updated text' } as unknown as Discussion, restart: false, type: 'COMMAND_EXECUTED' })
    expect(result).toEqual({
      ...state,
      redoStack: [],
      text: 'Updated text',
      undoStack: ['Some text'],
    })
  })

  test('Restart command', () => {
    const result = editorStateReducer(state, { discussion: { id: '2', parameters: {}, template_id: '1', text: 'Restarted text' } as unknown as Discussion, restart: true, type: 'COMMAND_EXECUTED' })
    expect(result).toEqual({
      ...state,
      redoStack: [],
      text: 'Restarted text',
      undoStack: [],
    })
  })

  test('Initialize command', () => {
    const state = initialState(undefined, templates),
     result = editorStateReducer(state, { discussion: { id: '1', parameters: {}, template_id: '1', text: 'Initialized text' } as unknown as Discussion, restart: false, type: 'COMMAND_EXECUTED' })
    expect(result).toEqual({
      ...state,
      redoStack: [],
      text: 'Initialized text',
      undoStack: [''],
    })
  })
})
