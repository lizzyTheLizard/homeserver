import { ModelMessage, ToolSet } from 'ai'
import { send as deepseekSend } from '../_external/deepseek'
import getTools from './tools'
import { UserSession } from '@/app/shared/auth/auth'
import { generateInitialMessages } from './initial'

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
    tools = await getTools(user)
    const initial = await generateInitialMessages(user, initialContext)
    messages.push(...initial.messages)
    emit({ type: 'finished_response' })
    emit({ type: 'got_actions', actions: initial.actions })
  }

  async function send(message: string) {
    messages.push({ role: 'user', content: message })
    await deepseekSend({ messages, tools, onChunk, onToolCall })
    onFinishedResponse()
    const messagesCpy = [...messages, { role: 'user', content: actionPrompt }] satisfies ModelMessage[]
    await deepseekSend({ messages: messagesCpy })
    const actions = JSON.parse(messagesCpy[messagesCpy.length - 1].content as string) as string[]
    onGotActions(actions)
  }

  return { on, off, init, send }
}

const actionPrompt = `
Based on the conversation so far, list the next actions the assistant should take to help the user. 
Only list actions that are directly relevant to the users needs and can be executed with the available tools. 
Do not list more than 5 actions.
An action must be a short command, for example "Get Todays Weather", "Get Weekly Forecast", "What about tomorrow?". It should not include any explanations or additional text, only the action itself.
Do not include actions already executed. Do not include actions that are not relevant to the users needs. Do not include actions that cannot be executed with the available tools.
Return an array of strings in JSON format, for example ["Get Todays Weather", "Get Weekly Forecast"]. Do NOT fence the JSON in markdown. 
Do not return any explanations, only the array of strings. Try to come up with at least one action. If there are no relevant actions, return an empty array.
`
