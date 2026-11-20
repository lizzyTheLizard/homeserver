import type { Assistant, AssistantEvent, AssistantEventListener, InitialContext } from './types'
import type { ModelMessage, ToolSet } from 'ai'
import type { UserSession } from './session'
import { generateInitialMessages } from './initial'
import { getTools } from './tools'
import { send as groqSend } from './groq'
import { logger } from './logger'

export function createAssistantInstance(user: UserSession): Assistant {
  const listeners: AssistantEventListener[] = [],
   messages: ModelMessage[] = []
  let tools: ToolSet = {}
  const onChunk = (chunk: string) => { emit({ chunk, type: 'stream_response' }) },
   onToolCall = () => { emit({ type: 'tool_call' }) },
   onFinishedResponse = () => { emit({ type: 'finished_response' }) },
   onGotActions = (actions: string[]) => { emit({ actions, type: 'got_actions' }) }

  function emit(event: AssistantEvent) {
    listeners.forEach((listener) => { listener(event) })
  }

  function on(listener: AssistantEventListener) {
    listeners.push(listener)
  }

  function off(listener: AssistantEventListener) {
    const index = listeners.indexOf(listener)
    if (index >= 0) {listeners.splice(index, 1)}
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
    messages.push({ content: message, role: 'user' })
    await groqSend({ messages, onChunk, onToolCall, tools })
    onFinishedResponse()
    logger.debug(`Assistant response finished`)
    const messagesCopy = [...messages, { content: actionPrompt, role: 'user' }] satisfies ModelMessage[],
     actionString = await groqSend({ messages: messagesCopy })
    try {
      const actions = JSON.parse(actionString) as string[]
      onGotActions(actions)
    }
    catch (error) {
      logger.warn(`Failed to parse actions from assistant response: ${JSON.stringify(actionString)}`, error)
      onGotActions([])
    }
  }

  return { init, off, on, send }
}

const actionPrompt = 'Give me a JSON array of next actions only.'
