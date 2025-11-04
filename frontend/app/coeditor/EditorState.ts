export interface EditorState {
  discussionId: string | undefined
  currentText: string
  currentContext: string
  undoStack: string[]
  redoStack: string[]
}

export type EditorStateAction = { type: 'START', id: string, text?: string }
  | { type: 'TEXT_CHANGE', text: string }
  | { type: 'CONTEXT_CHANGE', context: string }
  | { type: 'UNDO' }
  | { type: 'REDO' }

export function editorStateReducer(state: EditorState, action: EditorStateAction): EditorState {
  switch (action.type) {
    case 'START':
      return { ...state, discussionId: action.id, currentText: action.text ?? state.currentText }
    case 'TEXT_CHANGE':
      state.undoStack.push(state.currentText)
      return { ...state, currentText: action.text, redoStack: [] }
    case 'CONTEXT_CHANGE':
      return { ...state, currentContext: action.context }
    case 'UNDO': {
      const prevText = state.undoStack.pop()
      if (prevText) {
        state.redoStack.push(state.currentText)
        return { ...state, currentText: prevText }
      }
      return state
    }
    case 'REDO': {
      const nextText = state.redoStack.pop()
      if (nextText) {
        state.undoStack.push(state.currentText)
        return { ...state, currentText: nextText }
      }
      return state
    }
  }
}

export const initialEditorState: EditorState = {
  discussionId: undefined,
  currentText: '',
  currentContext: '',
  undoStack: [],
  redoStack: [],
}
