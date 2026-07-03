import { ToolLoopAgent, ToolSet } from 'ai'
import { createDeepInfra } from '@ai-sdk/deepinfra'
import { detailedWeatherTool, shortWeatherOverview, weatherForcastTool } from './weather'
import { config } from '@/app/shared/config'
import { getLocationDescription, locationByNameTool } from './geolocation'
import { getSkillTools, getSystemMessage, getInitialMessage, getActionPrompt } from '../_assistant/prompts'
import { Mutex } from '@electric-sql/pglite'
import { logger } from '@/app/shared/logger'
import { createLoggingFetch } from './llmLogger'

export interface InitialContext { location: { lat: number, lon: number } }

export type AssistantEvent = { type: 'stream_response', chunk: string }
  | { type: 'finished_response' }
  | { type: 'got_actions', actions: string[] }

export interface Assistant {
  on(listener: (event: AssistantEvent) => void): void
  init(initialContext: InitialContext): Promise<void>
  send(message: string): Promise<void>
}

export function createAssistantInstance(): Assistant {
  const handler: AssistantHandler = { isRunning: false, agent: undefined, emit }
  const listeners: ((event: AssistantEvent) => void)[] = []

  function emit(event: AssistantEvent) {
    listeners.forEach((l) => { l(event) })
  }

  return {
    on: listener => listeners.push(listener),
    init: initialContext => initialize(handler, initialContext),
    send: (message) => { return send(handler, message) },
  }
}

interface AssistantHandler {
  isRunning: boolean
  agent: ToolLoopAgent<never, ToolSet> | undefined
  emit: (event: AssistantEvent) => void
}

async function initialize(handler: AssistantHandler, initialContext: InitialContext): Promise<void> {
  const loggingFetch = createLoggingFetch(globalThis.fetch)
  const deepinfra = createDeepInfra({ apiKey: config.AI.API_KEY, fetch: loggingFetch })
  // const model = deepinfra('meta-llama/Llama-3.3-70B-Instruct-Turbo')
  const model = deepinfra('google/gemma-4-31B-it-turbo')
  const instructions = await getInstructions(initialContext)
  const tools = await getTools()
  handler.agent = new ToolLoopAgent({ model, tools, instructions, temperature: 0.4, providerOptions: { deepinfra: { service_tier: 'priority' } } })
  // TODO: Imrpove this when other connectors are available
  const initialActions = ['Get Todays Weather', 'Get Weekly Forecast', 'Get Tomorrow\'s Weather']
  await send(handler, await getInitialMessage(), initialActions)
}

async function getInstructions(initialContext: InitialContext): Promise<string> {
  const context = {
    time: new Date().toLocaleString(),
    location: initialContext.location,
    locationDescription: await getLocationDescription(initialContext.location),
    weather: await shortWeatherOverview(initialContext.location.lat, initialContext.location.lon),
  }
  const systemMessage = await getSystemMessage()
  const instructions = `${systemMessage}\n\nThe current context is ${JSON.stringify(context)}  `
  return instructions
}

async function getTools(): Promise<ToolSet> {
  const skillTools = await getSkillTools()
  const baseTools = { get_detailed_weather: detailedWeatherTool, get_weather_forecast: weatherForcastTool, get_location_by_name: locationByNameTool } satisfies ToolSet
  const tools = { ...baseTools, ...skillTools } as ToolSet
  return tools
}

const mutex = new Mutex()

async function send(handler: AssistantHandler, message: string, fixedActions?: string[]): Promise<void> {
  if (!handler.agent) throw new Error('Assistant is not initialized')
  await mutex.runExclusive(() => {
    if (handler.isRunning) throw new Error('Assistant is already processing a message')
    handler.isRunning = true
  })
  try {
    // TODO Streaming is not working here for tools calls and gemma. Maybe a bug in deepinfra?
    /*
    const result = await handler.agent.stream({ prompt: message })
    for await (const chunk of result.textStream) {
      handler.emit({ type: 'stream_response', chunk })
    }
      */
    const result = await handler.agent.generate({ prompt: message })
    handler.emit({ type: 'stream_response', chunk: result.text })
    handler.emit({ type: 'finished_response' })
    if (fixedActions) {
      handler.emit({ type: 'got_actions', actions: fixedActions })
    }
    else {
      const actionsResp = await handler.agent.generate({ prompt: await getActionPrompt() })
      const actions = JSON.parse(actionsResp.text) as string[]
      handler.emit({ type: 'got_actions', actions })
    }
  }
  catch (error: unknown) {
    logger.debug(`Assistant failed to process message: ${error instanceof Error ? error.message : String(error)}`)
  }

  finally {
    handler.isRunning = false
  }
}
