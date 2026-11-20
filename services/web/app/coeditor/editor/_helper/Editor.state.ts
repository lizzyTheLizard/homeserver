import type { Discussion } from '../../_data/Discussion'
import type { Template } from '../../_data/Template'

export interface EditorState {
  text: string
  undoStack: string[]
  redoStack: string[]
  lastText: string
  template: Template
  parameters: Record<string, string>
  contextValid: boolean
}

export function initialState(discussion: Discussion | undefined, templates: Template[]): EditorState {
  const template = discussion
    ? templates.find(t => t.id === discussion.template_id) ?? templates[0]
    : templates[0],
   parameters = discussion?.parameters ?? {}
  return {
    contextValid: isValid(template, parameters),
    lastText: discussion?.text ?? '',
    parameters,
    redoStack: [],
    template,
    text: discussion?.text ?? '',
    undoStack: [],
  }
}

export type EditorStateAction
  = { type: 'COMMAND_EXECUTED', discussion: Discussion, restart: boolean }
    | { type: 'TEXT_BLUR' }
    | { type: 'TEXT_CHANGE', text: string }
    | { type: 'TEMPLATE_CHANGE', template: Template }
    | { type: 'PARAMETERS_CHANGE', name: string, value: string | undefined }
    | { type: 'UNDO' }
    | { type: 'REDO' }

export function editorStateReducer(state: EditorState, action: EditorStateAction): EditorState {
  switch (action.type) {
    case 'COMMAND_EXECUTED':{
      return {
        ...state,
        redoStack: [],
        text: action.discussion.text,
        undoStack: action.restart ? [] : [...state.undoStack, state.text],
      }
    }
    case 'TEMPLATE_CHANGE':{
      if (action.template === state.template) {return state}
      return {
        ...state,
        contextValid: isValid(action.template, {}),
        parameters: {},
        template: action.template,
      }
    }
    case 'PARAMETERS_CHANGE':{
      if (state.parameters[action.name] === action.value) {return state}
      const newParameters = updateParameter(state.parameters, action.name, action.value)
      return {
        ...state,
        contextValid: isValid(state.template, newParameters),
        parameters: newParameters,
      }
    }
    case 'TEXT_CHANGE':{
      if (action.text === state.text) {return state}
      return {
        ...state,
        redoStack: [],
        text: action.text,
      }
    }
    case 'TEXT_BLUR':{
      if (state.lastText === state.text) {return state}
      return {
        ...state,
        lastText: state.text,
        undoStack: [...state.undoStack, state.lastText],
      }
    }
    case 'UNDO':{
      const prevText = state.undoStack[state.undoStack.length - 1]
      return {
        ...state,
        lastText: prevText,
        redoStack: [...state.redoStack, state.text],
        text: prevText,
        undoStack: state.undoStack.slice(0, state.undoStack.length - 1),
      }
    }
    case 'REDO':{
      const nextText = state.redoStack[state.redoStack.length - 1]
      return {
        ...state,
        lastText: nextText,
        redoStack: state.redoStack.slice(0, state.redoStack.length - 1),
        text: nextText,
        undoStack: [...state.undoStack, state.text],
      }
    }
  }
}

function isValid(template: Template | undefined, parameters: Record<string, string>): boolean {
  if (!template) {return false}
  for (const param of template.parameters) {
    if (!(param.name in parameters)) {return false}
    if (parameters[param.name].trim() === '') {return false}
  }
  return true
}

function updateParameter(obj: Record<string, string>, key: string, value: string | undefined): Record<string, string> {
  if (value === undefined) {
    return removeKey(obj, key)
  }
  return { ...obj, [key]: value }
}

function removeKey<T>(obj: Record<string, T>, key: string): Record<string, T> {
  // oxlint-disable-next-line typescript/no-unused-vars
  const { [key]: _, ...rest } = obj
  return rest
}
