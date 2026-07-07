import { generateText, ModelMessage, streamText, ToolChoice, ToolSet } from 'ai'
import { detailedWeatherTool, shortWeatherOverview, weatherForcastTool } from './weather'
import { config } from '@/app/shared/config'
import { getLocationDescription, locationByNameTool } from './geolocation'
import { getSkillTools } from './skills'
import { listWhatsappChatsTool, listAllWhatsappChatsTool, getWhatsappMessagesTool, sendWhatsappMessageTool, archiveWhatsappChatTool, setWhatsappChatReadStatusTool } from './whatsapp-tools'
import { logger } from '@/app/shared/logger'
import { createLoggingFetch } from './llmLogger'
import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import fs from 'fs'
import { join } from 'path'

const ASSISTANT_DIR = join(process.cwd(), 'app', 'startpage', '_assistant')
const actionPrompt = fs.readFileSync(join(ASSISTANT_DIR, 'action.md'), 'utf-8')
const initialMessage = fs.readFileSync(join(ASSISTANT_DIR, 'initial.md'), 'utf-8')
const systemMessage = fs.readFileSync(join(ASSISTANT_DIR, 'system.md'), 'utf-8')
const initialActions = ['Get Todays Weather', 'Get Weekly Forecast', 'Get Tomorrow\'s Weather', 'Return an editable field']
const tools = {
  ...getSkillTools(join(ASSISTANT_DIR, 'skills')),
  get_detailed_weather: detailedWeatherTool,
  get_weather_forecast: weatherForcastTool,
  get_location_by_name: locationByNameTool,
  list_whatsapp_chats: listWhatsappChatsTool,
  list_all_whatsapp_chats: listAllWhatsappChatsTool,
  get_whatsapp_messages: getWhatsappMessagesTool,
  send_whatsapp_message: sendWhatsappMessageTool,
  archive_whatsapp_chat: archiveWhatsappChatTool,
  set_whatsapp_chat_read_status: setWhatsappChatReadStatusTool } satisfies ToolSet
const opencode = createOpenAICompatible({ name: 'opencode', apiKey: config.AI.API_KEY, baseURL: config.AI.BASE_URL, fetch: createLoggingFetch(globalThis.fetch) })
const model = opencode('deepseek-v4-flash')
const agentSettings = { model, reasoning: 'none' as const, providerOptions: { opencode: { thinking: { type: 'disabled' } } } }

export interface InitialContext { location: { lat: number, lon: number } }

export type AssistantEvent = { type: 'stream_response', chunk: string }
  | { type: 'tool_call' }
  | { type: 'finished_response' }
  | { type: 'got_actions', actions: string[] }

export interface Assistant {
  on(listener: (event: AssistantEvent) => void): void
  init(initialContext: InitialContext): Promise<void>
  send(message: string): Promise<void>
}

export function createAssistantInstance(): Assistant {
  const listeners: ((event: AssistantEvent) => void)[] = []
  const handler: AssistantHandler = { messages: [], instructions: '', emit: (e) => {
    listeners.forEach((l) => { l(e) })
  } }
  return {
    on: listener => listeners.push(listener),
    init: initialContext => initialize(handler, initialContext),
    send: (message) => { return send(handler, message, undefined, true) },
  }
}

interface AssistantHandler {
  messages: ModelMessage[]
  instructions: string
  emit: (event: AssistantEvent) => void
}

async function initialize(handler: AssistantHandler, initialContext: InitialContext): Promise<void> {
  handler.instructions = await getSystemMessage(initialContext)
  await send(handler, initialMessage, initialActions, false)
}

async function getSystemMessage(initialContext: InitialContext): Promise<string> {
  const context = {
    time: new Date().toLocaleString(),
    location: initialContext.location,
    locationDescription: await getLocationDescription(initialContext.location),
    weather: await shortWeatherOverview(initialContext.location.lat, initialContext.location.lon),
  }
  const instructions = `${systemMessage}\n\nThe current context is ${JSON.stringify(context)}  `
  return instructions
}

async function send(handler: AssistantHandler, prompt: string, fixedActions?: string[], useTools?: boolean): Promise<void> {
  handler.messages.push({ role: 'user', content: prompt })
  const options = { ...agentSettings,
    tools: (useTools ? tools : undefined) as ToolSet,
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
    logger.debug(`Assistant made ${toolCalls.length.toString()} tool calls, continuing to next iteration`)
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
