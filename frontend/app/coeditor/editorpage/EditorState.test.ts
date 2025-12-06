import { describe, expect, test } from 'vitest'
import { editorStateReducer, initialState } from './EditorState'
import type { Template } from 'homeserver-backend/src/coeditor/template/Template'
import type { Discussion } from 'homeserver-backend/src/coeditor/discussion/Discussion'

const templates = [
  { id: '1', language: 'en', parameters: [] },
  { id: '2', language: 'de', parameters: [] },
  { id: '3', language: 'en', parameters: [{ name: 'param1', type: 'STRING', startPosition: 10, endPosition: 16 }] },
] as Template[]

const discussion = { id: '1', text: 'Some text', template_id: '3', parameters: { param1: 'value1' } } as unknown as Discussion

describe('Initialize Editor State', () => {
  test('initial without discussion', () => {
    const result = editorStateReducer(initialState(null), { type: 'INITIALIZE', templates, discussion: null })
    expect(result).toEqual({
      discussion_id: undefined,
      text: '',
      undoStack: [],
      redoStack: [],
      template: templates[0],
      parameters: {},
      initialized: true,
      contextValid: true,
    })
  })

  test('initial with discussion', () => {
    const result = editorStateReducer(initialState(discussion.id), { type: 'INITIALIZE', templates: templates.slice(2), discussion })
    expect(result).toEqual({
      discussion_id: discussion.id,
      text: discussion.text,
      undoStack: [],
      redoStack: [],
      template: templates[2],
      parameters: discussion.parameters,
      initialized: true,
      contextValid: true,
    })
  })

  test('initial invalid', () => {
    const result = editorStateReducer(initialState(null), { type: 'INITIALIZE', templates: templates.slice(2), discussion: null })
    expect(result).toEqual({
      discussion_id: undefined,
      text: '',
      undoStack: [],
      redoStack: [],
      template: templates[2],
      parameters: {},
      initialized: true,
      contextValid: false,
    })
  })
})

describe('Context Change', () => {
  const state = editorStateReducer(initialState(discussion.id), { type: 'INITIALIZE', templates, discussion })

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
  const state = editorStateReducer(editorStateReducer(initialState(null), { type: 'INITIALIZE', templates, discussion: null }), { type: 'TEXT_CHANGE', text: 'Initial text' })

  test('Change', () => {
    const result = editorStateReducer(state, { type: 'TEXT_CHANGE', text: 'New text' })
    expect(result).toEqual({
      ...state,
      text: 'New text',
      undoStack: ['', 'Initial text'],
      redoStack: [],
    })
  })

  test('Text Change to same', () => {
    const result = editorStateReducer(state, { type: 'TEXT_CHANGE', text: 'Initial text' })
    expect(result).toBe(state)
  })

  test('Undo', () => {
    const changedState = editorStateReducer(state, { type: 'TEXT_CHANGE', text: 'New text' })
    const result = editorStateReducer(changedState, { type: 'UNDO' })
    expect(result).toEqual({
      ...state,
      text: 'Initial text',
      undoStack: [''],
      redoStack: ['New text'],
    })
  })

  test('Redo', () => {
    const changedState = editorStateReducer(state, { type: 'TEXT_CHANGE', text: 'New text' })
    const undoneState = editorStateReducer(changedState, { type: 'UNDO' })
    const result = editorStateReducer(undoneState, { type: 'REDO' })
    expect(result).toEqual({
      ...state,
      text: 'New text',
      undoStack: ['', 'Initial text'],
      redoStack: [],
    })
  })
})

describe('Command Executed', () => {
  const state = editorStateReducer(initialState(discussion.id), { type: 'INITIALIZE', templates, discussion })

  test('Normal command', () => {
    const result = editorStateReducer(state, { type: 'COMMAND_EXECUTED', discussion: { ...discussion, text: 'Updated text' } as unknown as Discussion })
    expect(result).toEqual({
      ...state,
      text: 'Updated text',
      undoStack: ['Some text'],
      redoStack: [],
    })
  })

  test('Restart command', () => {
    const result = editorStateReducer(state, { type: 'COMMAND_EXECUTED', discussion: { id: '2', text: 'Restarted text', template_id: '1', parameters: {} } as unknown as Discussion })
    expect(result).toEqual({
      ...state,
      discussion_id: '2',
      text: 'Restarted text',
      undoStack: [],
      redoStack: [],
    })
  })

  test('Initialize command', () => {
    const state = editorStateReducer(initialState(null), { type: 'INITIALIZE', templates, discussion: null })
    const result = editorStateReducer(state, { type: 'COMMAND_EXECUTED', discussion: { id: '1', text: 'Initialized text', template_id: '1', parameters: {} } as unknown as Discussion })
    expect(result).toEqual({
      ...state,
      discussion_id: '1',
      text: 'Initialized text',
      undoStack: [''],
      redoStack: [],
    })
  })
})
