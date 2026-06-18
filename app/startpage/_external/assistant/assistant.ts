import { InitialContext, Message } from './Message'
import { OpenAI } from 'openai/index.js'
import { config } from '@/app/shared/config'
import { logger } from '@/app/shared/logger'
import { detailedWeatherTool, shortWeatherOverview, weatherForcastTool } from './WeatherPlugin'
import { ChatCompletionCreateParamsNonStreaming, ChatCompletionMessage, ChatCompletionMessageToolCall } from 'openai/resources.js'
import { ToolDefinition } from './Tool'

const client = new OpenAI({ baseURL: config.AI.BASE_URL, apiKey: config.AI.API_KEY })
const tools: ToolDefinition[] = [detailedWeatherTool, weatherForcastTool]
const max_tool_interations = 5

export async function initializeConversation(initialContext: InitialContext): Promise<{ messages: Message[], actions: string[] }> {
  const initialMessages = [await getSystemMessage(initialContext), getInitialMessage()]
  const result = await assistantIteration(initialMessages, false)
  const actions = ['Get Todays Weather', 'Get Weekly Forecast', 'Get Tomorrow\'s Weather']
  return { messages: [...initialMessages, ...result.messages], actions: actions }
}

async function getSystemMessage(initialContext: InitialContext): Promise<Message> {
  const currentLocation = initialContext.location
  const currentWeather = await shortWeatherOverview(currentLocation.lat, currentLocation.lon)

  return { id: 0, hidden: true, role: 'system', content: `You are the assistant for a personal homeserver dashboard. 
    You are helping my organize and manage my personal information, and provide me with useful insights and suggestions. 
  You are friendly and helpful, but also funny and a bit sarcastic. You reponse in markdown format but do NOT use markdown tables, and you can use emojis. 
  You can also provide links to relevant information, but do not make up links. Format all times as HH:MM and all dates as DD.MM.YYYY. Always use the 24h format for times. Always use the Celsius unit for temperatures.
  If you do not know the answer to a question, say so. Do not make up answers. If you need more information, ask for it.

  Never invent values such as temperatures, times, task counts, or names. If a tool exists for a fact, that fact must come from the tool.
  If a tool call fails or returns nothing, mention it briefly in "message" and set "error". Do not substitute a guessed value. 
  
  The current time is ${new Date().toLocaleString()}.
  The current location is ${JSON.stringify(currentLocation)}
  The current weather is ${JSON.stringify(currentWeather)}
  ` }
}

function getInitialMessage(): Message {
  return { id: 1, role: 'user', hidden: true, content: `Start by generating an initial greeting message for the user.
  The greeting message should start with the following template, using markdown formatting.
  
  Good {timeofday}!

  {Totally one paragraph, 3-4 sentences, no newlines}Currently the weather is **{currentWeather and temperature}** in **{currentLocation}**. During {"the day if in the morning, "next day" if in the evening}, the temperature will rise to **{maxTemp}°C** and drop to **{minTemp}°C** in the evening. 
  The sun will rise at **{sunrise}** and set at **{sunset}**. {Say something about the precipitation, for example "There is a high chance of rain in the afternoon" or "No rain expected"}
  {say something about the wind if it is notable"} {say something about clothing, e.g. "It's a good day for shorts and a t-shirt" or "Better wear a jacket today", "So do not forget your umbrella!"}
  ` }
}

export async function askAssistant(inMessages: Message[]): Promise<{ messages: Message[], actions: string[] }> {
  const responseMessages: Message[] = []
  logger.info('Start assistant loop')
  for (let i = 0; i < max_tool_interations; i++) {
    const result = await assistantIteration([...inMessages, ...responseMessages], true)
    responseMessages.push(...result.messages)
    if (!result.finished) continue
    const actions = await getNextActions([...inMessages, ...responseMessages])
    return { messages: responseMessages, actions: actions }
  }
  throw new Error(`AI response was cut after ${max_tool_interations.toString()} iterations, something is wrong`)
}

async function getNextActions(messages: Message[]): Promise<string[]> {
  const result = await assistantIteration([...messages, getActionMessage()], false)
  if (!result.finished) throw new Error('AI did not finish when asking for next actions')
  if (!('content' in result.messages[0])) throw new Error('AI response has no content when asking for next actions')
  const actions = result.messages[0].content
  return actions ? JSON.parse(actions) as string[] : []
}

function getActionMessage(): Message {
  return { id: -1, role: 'user', hidden: true, content: `Based on the conversation so far, list the next actions the assistant should take to help the user. 
    Only list actions that are directly relevant to the users needs and can be executed with the available tools. 
    Do not list more than 5 actions.
    An action must be a short command, for example "Get Todays Weather", "Get Weekly Forecast", "What about tomorrow?".
    Return an array of strings in JSON format, for example ["Get Todays Weather", "Get Weekly Forecast"].
    Do not return any explanations, only the array of strings. Try to come up with at least one action. If there are no relevant actions, return an empty array.
  ` }
}

async function assistantIteration(messages: Message[], useTools: boolean): Promise<{ messages: Message[], finished: boolean }> {
  const body: ChatCompletionCreateParamsNonStreaming = useTools
    ? { model: 'Qwen/Qwen3.6-35B-A3B', messages, tools, tool_choice: 'auto', reasoning_effort: 'none' }
    : { model: 'Qwen/Qwen3.6-35B-A3B', messages, reasoning_effort: 'none' }
  logger.debug('Sending request to AI: ' + JSON.stringify(body))
  const start = Date.now()
  const completion = await client.chat.completions.create(body)
  const duration = Date.now() - start
  logger.debug(`Got response from AI in ${duration.toString()}ms: ` + JSON.stringify(completion))
  const finishReason = completion.choices[0].finish_reason
  const resultMessage = toResult(completion.choices[0].message, messages)
  if (finishReason === 'stop') return { messages: [resultMessage], finished: true }
  else if (finishReason === 'tool_calls') { /* continue to tool calls */ }
  else throw new Error(`Unknown finish reason: ${finishReason}`)
  const toolCalls = completion.choices[0].message.tool_calls
  if (!toolCalls || toolCalls.length === 0) throw new Error('AI response requested a tool call, but no tool calls were provided')
  logger.debug(`AI response requested ${toolCalls.length.toString()} tool calls`)
  const results = await toolCall(toolCalls, messages)
  return { messages: [resultMessage, ...results], finished: false }
}

function toResult(responseMessage: ChatCompletionMessage, messages: Message[]): Message {
  const id = messages.length
  if (responseMessage.tool_calls !== undefined && responseMessage.tool_calls.length > 0) {
    const tool_calls = responseMessage.tool_calls.filter(tc => tc.type === 'function')
    return { id, role: 'assistant', tool_calls: tool_calls, hidden: true, content: '' }
  }
  if (!responseMessage.content) throw new Error('AI response has no content')
  return { id, role: 'assistant', content: responseMessage.content, hidden: false }
}

async function toolCall(functionCalls: ChatCompletionMessageToolCall[], messages: Message[]): Promise<Message[]> {
  const results: Message[] = []
  // There is already the response from the AI, so we start with the next id
  let id = messages.length + 1
  for (const toolCall of functionCalls) {
    if (toolCall.type !== 'function') throw new Error(`Tool call is not a function call: ${JSON.stringify(toolCall)}`)
    logger.debug(`Executing tool call: ${toolCall.function.name} with arguments: ${toolCall.function.arguments}`)
    const args = JSON.parse(toolCall.function.arguments) as Record<string, unknown>
    const tool = tools.find(t => t.function.name === toolCall.function.name)
    if (!tool) throw new Error(`Tool not found: ${toolCall.function.name}`)
    const result = await tool.execute(args)
    results.push({ id: id++, role: 'tool', tool_call_id: toolCall.id, content: result, hidden: true })
  }
  return results
}
