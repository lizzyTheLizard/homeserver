import { Message } from '../_external/assistant/Message'

export interface AiChatState {
  current: 'initializing' | 'failed' | 'ready' | 'typing'
  messages: Message[]
  latestActions: string[]
}

export type AiChatStateAction = { type: 'INITIALIZED', messages: Message[], actions: string[] }
  | { type: 'FAILED', error: unknown }
  | { type: 'SEND', message: Message }
  | { type: 'RECEIVED', messages: Message[], actions: string[] }

export const initialAiChatState: AiChatState = {
  current: 'initializing',
  messages: [],
  latestActions: [],
}

export function aiChatStateReducer(state: AiChatState, action: AiChatStateAction): AiChatState {
  switch (action.type) {
    case 'INITIALIZED':
      return { current: 'ready', messages: action.messages, latestActions: action.actions }
    case 'FAILED':
      console.log('AI chat failed:', action.error)
      return { current: 'failed', messages: [...state.messages, getErrorMessage(action.error)], latestActions: [] }
    case 'SEND':
      return { current: 'typing', messages: [...state.messages, action.message], latestActions: [] }
    case 'RECEIVED':
      return { current: 'ready', messages: [...state.messages, ...action.messages], latestActions: action.actions }
  }
}

function getErrorMessage(error: unknown): Message {
  return { id: -1, hidden: false, role: 'assistant', content: 'Sorry, an error occurred: ' + String(error) }
}
