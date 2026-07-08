export interface Message {
  id: number
  role: 'assistant' | 'user'
  content: string
}
export interface AiChatState {
  current: 'initializing' | 'failed' | 'ready' | 'working'
  actions: string[]
  messages: Message[]
  currentMessage: string
}

export const initialAiChatState: AiChatState = {
  current: 'initializing',
  actions: [],
  messages: [],
  currentMessage: '',
}

export type AiChatStateAction = { type: 'RECEIVED', chunk: string | undefined }
  | { type: 'ACTIONS', actions: string[] | undefined }
  | { type: 'FINISH' }
  | { type: 'TOOL_CALL' }
  | { type: 'SEND', message: string }
  | { type: 'ERROR', error: unknown }
  | { type: 'RESET' }

export function aiChatStateReducer(state: AiChatState, action: AiChatStateAction): AiChatState {
  switch (action.type) {
    case 'ACTIONS':
      return { ...state, actions: action.actions ?? [] }
    case 'SEND':
      return { current: 'working', actions: [], messages: addSendMessage(state, action.message), currentMessage: '' }
    case 'FINISH':
      return { ...state, current: 'ready', messages: addFinishMessage(state), currentMessage: '' }
    case 'RECEIVED':
      return { ...state, currentMessage: state.currentMessage + (action.chunk ?? '') }
    case 'TOOL_CALL':
      return { ...state, currentMessage: '' }
    case 'ERROR':
      return { current: 'failed', actions: [], messages: addErrorMessage(state, action.error), currentMessage: '' }
    case 'RESET':
      return { ...initialAiChatState }
  }
}

function addSendMessage(state: AiChatState, message: string): Message[] {
  return [...state.messages, { role: 'user', content: message, id: state.messages.length }]
}

function addFinishMessage(state: AiChatState): Message[] {
  if (!state.currentMessage) return state.messages
  return [...state.messages, { role: 'assistant', content: state.currentMessage, id: state.messages.length }]
}

function addErrorMessage(state: AiChatState, error: unknown): Message[] {
  console.warn('Error occurred in assistant:', error)
  return [...state.messages, { role: 'assistant', content: 'Sorry, an error occurred: ' + String(error), id: state.messages.length }]
}
