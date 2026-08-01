import { ModelMessage, ToolSet } from 'ai'
import { send as groqSend } from '../_external/groq'
import { UserSession } from '@/app/shared/auth/auth'
import { generateInitialMessages } from './initial'
import { logger } from '@/app/shared/logger'
import { getTools } from './tools'

export interface InitialContext { location: { lat: number, lon: number } }

export type AssistantEvent = { type: 'stream_response', chunk: string }
  | { type: 'tool_call' }
  | { type: 'finished_response' }
  | { type: 'got_actions', actions: string[] }

export type AssistantEventListener = (event: AssistantEvent) => void

export interface Assistant {
  on(listener: AssistantEventListener): void
  off(listener: AssistantEventListener): void
  init(initialContext: InitialContext): Promise<void>
  send(message: string): Promise<void>
}

export function createAssistantInstance(user: UserSession): Assistant {
  const listeners: AssistantEventListener[] = []
  const messages: ModelMessage[] = []
  let tools: ToolSet = {}
  const onChunk = (chunk: string) => { emit({ type: 'stream_response', chunk }) }
  const onToolCall = () => { emit({ type: 'tool_call' }) }
  const onFinishedResponse = () => { emit({ type: 'finished_response' }) }
  const onGotActions = (actions: string[]) => { emit({ type: 'got_actions', actions }) }

  function emit(event: AssistantEvent) {
    listeners.forEach((listener) => { listener(event) })
  }

  function on(listener: AssistantEventListener) {
    listeners.push(listener)
  }

  function off(listener: AssistantEventListener) {
    const index = listeners.indexOf(listener)
    if (index >= 0) listeners.splice(index, 1)
  }

  async function init(initialContext: InitialContext) {
    logger.debug('Initialize assistant')
    tools = await getTools(user)
    const initialMessages = await generateInitialMessages(user, initialContext, emit)
    messages.push(...initialMessages)
    logger.debug(`Assistant initialized`)
  }

  async function send(message: string) {
    logger.debug(`Sending message to assistant: ${message}`)
    messages.push({ role: 'user', content: message })
    await groqSend({ messages, tools, onChunk, onToolCall })
    onFinishedResponse()
    logger.debug(`Assistant response finished`)
    const messagesCopy = [...messages, { role: 'user', content: actionPrompt }] satisfies ModelMessage[]
    const actionString = await groqSend({ messages: messagesCopy })
    try {
      const actions = JSON.parse(actionString) as string[]
      onGotActions(actions)
    }
    catch (error) {
      logger.warn(`Failed to parse actions from assistant response: ${JSON.stringify(actionString)}`, error)
      onGotActions([])
    }
  }

  return { on, off, init, send }
}

const actionPrompt = 'Give me a JSON array of next actions only.'
