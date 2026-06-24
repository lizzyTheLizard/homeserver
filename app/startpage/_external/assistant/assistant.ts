import { ToolLoopAgent, ToolSet } from 'ai'
import { createDeepInfra } from '@ai-sdk/deepinfra'
import { detailedWeatherTool, shortWeatherOverview, weatherForcastTool } from './weather'
import { config } from '@/app/shared/config'
import { logger } from '@/app/shared/logger'

export interface InitialContext { location: { lat: number, lon: number } }

export type AssistantEvent = { type: 'stream_response', chunk: string }
  | { type: 'finished_response' }
  | { type: 'got_actions', actions: string[] }
  | { type: 'error', error: Error }

export interface Assistant {
  on(listener: (event: AssistantEvent) => void): void
  init(initialContext: InitialContext): void
  send(message: string): void
}

const deepinfra = createDeepInfra({ baseURL: config.AI.BASE_URL, apiKey: config.AI.API_KEY })
const model = deepinfra('Qwen/Qwen3.6-35B-A3B')
const tools = { get_detailed_weather: detailedWeatherTool, get_weather_forecast: weatherForcastTool } satisfies ToolSet

export function createAssistantInstance(): Assistant {
  logger.debug(`Creating assistant instance with ${Object.keys(tools).length.toString()} tools and model ${model.modelId}`)
  let agent: ToolLoopAgent<never, typeof tools> | undefined = undefined
  const listeners: ((event: AssistantEvent) => void)[] = []
  let running = false

  function emit(event: AssistantEvent) {
    listeners.forEach((l) => { l(event) })
  }

  function emitError(error: unknown) {
    if (error instanceof Error)
      emit({ type: 'error', error })
    emit({ type: 'error', error: new Error(`Unknown error: ${String(error)}`) })
  }

  async function send(message: string): Promise<void> {
    if (!agent) throw new Error('Assistant not initialized')
    if (running) throw new Error('Assistant is already processing a message')
    running = true
    const result = await agent.stream({ prompt: message })
    for await (const chunk of result.textStream) {
      emit({ type: 'stream_response', chunk })
    }
    running = false
    emit({ type: 'finished_response' })
    const actionsResp = await agent.generate({ prompt: getActionPrompt() })
    const actions = JSON.parse(actionsResp.text) as string[]
    emit({ type: 'got_actions', actions })
  }

  async function initialize(initialContext: InitialContext): Promise<void> {
    logger.debug(`Initializing assistant with context: ${JSON.stringify(initialContext)}`)
    const instructions = await getInstructions(initialContext)
    running = true
    agent = new ToolLoopAgent({ model, tools, instructions })
    const result = await agent.stream({ prompt: getInitialMessage() })
    for await (const chunk of result.textStream) { emit({ type: 'stream_response', chunk }) }
    running = false
    emit({ type: 'finished_response' })
    const actions = ['Get Todays Weather', 'Get Weekly Forecast', 'Get Tomorrow\'s Weather']
    emit({ type: 'got_actions', actions })
  }

  const result: Assistant = {
    on: listener => listeners.push(listener),
    init: initialContext => void initialize(initialContext).catch(emitError),
    send: message => void send(message).catch(emitError),
  }
  return result
}

async function getInstructions(initialContext: InitialContext): Promise<string> {
  const context = {
    time: new Date().toLocaleString(),
    location: initialContext.location,
    weather: await shortWeatherOverview(initialContext.location.lat, initialContext.location.lon),
  }

  return `You are the assistant for a personal homeserver dashboard. 
    You are helping my organize and manage my personal information, and provide me with useful insights and suggestions. 
  You are friendly and helpful, but also funny and a bit sarcastic. You reponse in markdown format but do NOT use markdown tables, and you can use emojis. 
  You can also provide links to relevant information, but do not make up links. Format all times as HH:MM and all dates as DD.MM.YYYY. Always use the 24h format for times. Always use the Celsius unit for temperatures.
  If you do not know the answer to a question, say so. Do not make up answers. If you need more information, ask for it.

  Never invent values such as temperatures, times, task counts, or names. If a tool exists for a fact, that fact must come from the tool.
  If a tool call fails or returns nothing, mention it briefly in "message" and set "error". Do not substitute a guessed value. 

  The current context is ${JSON.stringify(context)}
  `
}

function getInitialMessage(): string {
  return `Start by generating an initial greeting message for the user.
  The greeting message should start with the following template, using markdown formatting.
  
  Good {timeofday}!

  {Totally one paragraph, 3-4 sentences, no newlines}Currently the weather is **{currentWeather and temperature}** in **{currentLocation}**. During {"the day if in the morning, "next day" if in the evening}, the temperature will rise to **{maxTemp}°C** and drop to **{minTemp}°C** in the evening. 
  The sun will rise at **{sunrise}** and set at **{sunset}**. {Say something about the precipitation, for example "There is a high chance of rain in the afternoon" or "No rain expected"}
  {say something about the wind if it is notable"} {say something about clothing, e.g. "It's a good day for shorts and a t-shirt" or "Better wear a jacket today", "So do not forget your umbrella!"}
  `
}

function getActionPrompt(): string {
  return `Based on the conversation so far, list the next actions the assistant should take to help the user. 
    Only list actions that are directly relevant to the users needs and can be executed with the available tools. 
    Do not list more than 5 actions.
    An action must be a short command, for example "Get Todays Weather", "Get Weekly Forecast", "What about tomorrow?".
    Return an array of strings in JSON format, for example ["Get Todays Weather", "Get Weekly Forecast"].
    Do not return any explanations, only the array of strings. Try to come up with at least one action. If there are no relevant actions, return an empty array.
  `
}
