import { generateText, ModelMessage, streamText, ToolChoice, ToolSet } from 'ai'
import { getWeatherTools, shortWeatherOverview } from '../_assistant/tools/weather'
import { config } from '@/app/shared/config'
import { getGeolocationTools, getLocationDescription } from '../_assistant/tools/geolocation'
import { getSkillTools } from '../_assistant/tools/skills'
import { getWhatsappAppTools, getUnarchivedWhatsAppChats } from '../_assistant/tools/whatsapp'
import { getOutlookTools, getOutlookContext } from '../_assistant/tools/outlook'
import { UserSession } from '@/app/shared/auth/auth'
import { logger } from '@/app/shared/logger'
import { createLoggingFetch } from '../_assistant/llmLogger'
import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import fs from 'fs'
import { join } from 'path'

const ASSISTANT_DIR = join(process.cwd(), 'app', 'startpage', '_assistant')
const actionPrompt = fs.readFileSync(join(ASSISTANT_DIR, 'action.md'), 'utf-8')
const initialMessage = fs.readFileSync(join(ASSISTANT_DIR, 'initial.md'), 'utf-8')
const systemMessage = fs.readFileSync(join(ASSISTANT_DIR, 'system.md'), 'utf-8')
const opencode = createOpenAICompatible({ name: 'opencode', apiKey: config.AI.API_KEY, baseURL: config.AI.BASE_URL, fetch: createLoggingFetch(globalThis.fetch) })
const model = opencode('deepseek-v4-flash')
const agentSettings = { model, reasoning: 'none' as const, temperature: 0.2, providerOptions: { opencode: { thinking: { type: 'disabled' } } } }

export interface InitialContext { location: { lat: number, lon: number } }

export type AssistantEvent = { type: 'stream_response', chunk: string }
  | { type: 'tool_call' }
  | { type: 'finished_response' }
  | { type: 'got_actions', actions: string[] }

export interface Assistant {
  on(listener: (event: AssistantEvent) => void): void
  off(listener: (event: AssistantEvent) => void): void
  init(initialContext: InitialContext): Promise<void>
  send(message: string): Promise<void>
}

export function createAssistantInstance(user: UserSession): Assistant {
  const listeners: ((event: AssistantEvent) => void)[] = []
  const handler: AssistantHandler = { messages: [], instructions: '', tools: {}, emit: (e) => {
    listeners.forEach((l) => { l(e) })
  } }
  return {
    on: listener => listeners.push(listener),
    off: (listener) => {
      const index = listeners.indexOf(listener)
      if (index >= 0) listeners.splice(index, 1)
    },
    init: initialContext => initialize(user, handler, initialContext),
    send: (message) => { return send(handler, message, undefined, true) },
  }
}

interface AssistantHandler {
  messages: ModelMessage[]
  instructions: string
  tools: ToolSet
  emit: (event: AssistantEvent) => void
}

async function initialize(user: UserSession, handler: AssistantHandler, initialContext: InitialContext): Promise<void> {
  handler.tools = {
    ...getSkillTools(join(ASSISTANT_DIR, 'skills')),
    ...getWeatherTools(),
    ...getGeolocationTools(),
    ...getWhatsappAppTools(user),
    ...getOutlookTools(user),
  }
  const context = {
    time: new Date().toLocaleString(),
    location: initialContext.location,
    locationDescription: await getLocationDescription(initialContext.location),
    weather: await shortWeatherOverview(initialContext.location.lat, initialContext.location.lon),
    unarchivedWhatsAppChats: await getUnarchivedWhatsAppChats(user),
    outlook: await getOutlookContext(user),
  }
  handler.instructions = `${systemMessage}\n\nThe current context is ${JSON.stringify(context)}`
  const initialActions = []
  if (context.unarchivedWhatsAppChats.length > 0) initialActions.push('Get WhatsApp Overview')
  if (context.outlook.unreadCount > 0) initialActions.push('Get Outlook Overview')
  initialActions.push('Get Todays Weather Details', 'Get Tomorrow\'s Weather Details', 'Get a Weekly Weather Forecast')
  await send(handler, initialMessage, initialActions, false)
}

async function send(handler: AssistantHandler, prompt: string, fixedActions?: string[], useTools?: boolean): Promise<void> {
  handler.messages.push({ role: 'user', content: prompt })
  const options = { ...agentSettings,
    tools: (useTools ? handler.tools : undefined),
    toolChoice: (useTools ? 'auto' : 'none') as ToolChoice<Record<string, unknown>>,
    instructions: handler.instructions,
    messages: handler.messages,
  }
  for (let i = 0; i < 5; i++) {
    const result = streamText(options)
    for await (const chunk of result.textStream)
      handler.emit({ type: 'stream_response', chunk })
    const responseText = await result.responseMessages
    responseText.forEach(m => handler.messages.push(m))
    const toolCalls = await result.toolCalls
    if (toolCalls.length == 0) break
    if (i == 4) throw new Error('Assistant made too many tool calls, stopping after 5 iterations')
    logger.debug(`Assistant called tools ${toolCalls.map(t => t.toolName).join(', ')}`)
    handler.emit({ type: 'tool_call' })
  }
  handler.emit({ type: 'finished_response' })

  if (fixedActions) {
    handler.emit({ type: 'got_actions', actions: fixedActions })
    return
  }
  const messagesCpy = [...handler.messages, { role: 'user', content: actionPrompt }] satisfies ModelMessage[]
  const actionsResp = await generateText({ ...agentSettings, instructions: handler.instructions, toolChoice: 'none', messages: messagesCpy })
  const actions = JSON.parse(actionsResp.text) as string[]
  handler.emit({ type: 'got_actions', actions })
}
