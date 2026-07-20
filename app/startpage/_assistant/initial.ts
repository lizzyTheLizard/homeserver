import { UserSession } from '@/app/shared/auth/auth'
import { AssistantEvent, InitialContext } from './assistant'
import { openmeteoRequest, parseOpenMeteoData } from '../_external/openmeteo'
import { getLocationDescription } from '../_external/openstreetmap'
import { getWAFasade } from '../_external/whatsapp'
import { getInboxCount } from '../_external/microsoft-mail'
import { getTodoCount } from '../_external/microsoft-todo'
import { getEventCount } from '../_external/microsoft-calendar'
import { ModelMessage } from 'ai'
import { Temporal } from '@js-temporal/polyfill'
import fs from 'fs'
import { join } from 'path'
import { logger } from '@/app/shared/logger'

const ASSISTANT_DIR = join(process.cwd(), 'app', 'startpage', '_assistant')
const systemMessageTemplate = fs.readFileSync(join(ASSISTANT_DIR, 'system.md'), 'utf-8')

export async function generateInitialMessages(user: UserSession, initialContext: InitialContext, emit: (event: AssistantEvent) => void): Promise<ModelMessage[]> {
  logger.debug('Generating initial message for assistant.')
  // Start all data gatherin in parallel
  const greetingP = getGreeting()
  const weatherP = getWeather(initialContext)
  const tasksP = getTasks(user)

  // Generate system message based on the initial context
  const systemMessage = getSystemMessage(initialContext)

  // Emit the messages in the right order
  const { text: greetingText, actions: greetingActions } = await greetingP
  emit({ type: 'stream_response', chunk: greetingText })
  const { text: weatherText, actions: weatherActions } = await weatherP
  emit({ type: 'stream_response', chunk: weatherText })
  const { text: tasksText, actions: tasksActions } = await tasksP
  emit({ type: 'stream_response', chunk: tasksText })
  emit({ type: 'finished_response' })

  const actions = [...tasksActions, ...greetingActions, ...weatherActions]
  emit({ type: 'got_actions', actions: actions })
  const fullGreeting = tasksText + greetingText + weatherText
  logger.debug(`Finished initial message generation.`)
  return [{ role: 'system', content: systemMessage }, { role: 'assistant', content: fullGreeting }]
}

function getSystemMessage(initialContext: InitialContext): string {
  const location = initialContext.location
  const locationDescription = `Latitude: ${location.lat.toString()}, Longitude: ${location.lon.toString()}`
  return systemMessageTemplate
    .replace('{{LOCATION}}', locationDescription)
    .replace('{{DATE}}', Temporal.Now.plainDateTimeISO().toString())
}

interface PartResult {
  text: string
  actions: string[]
}

async function getGreeting(): Promise<PartResult> {
  logger.debug('Initialize greeting part')
  const hour = new Date().getHours()
  const timeOfDay = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening'
  return Promise.resolve({ text: `Good ${timeOfDay}!\n\n`, actions: [] })
}

async function getWeather(initialContext: InitialContext): Promise<PartResult> {
  logger.debug('Initialize weather part')
  const location = initialContext.location
  const today = Temporal.Now.plainDateISO().toString()
  const tomorrow = Temporal.Now.plainDateISO().add({ days: 1 }).toString()
  const params = { hourly: 'temperature_2m,precipitation,weather_code', daily: 'sunrise,sunset', start_date: today, end_date: tomorrow }
  const [city, data] = await Promise.all([
    getLocationDescription(location),
    openmeteoRequest(location.lat, location.lon, params),
  ])
  const daily = parseOpenMeteoData(data.daily)
  const hourly = parseOpenMeteoData(data.hourly)
  const temperatures = Object.entries(hourly).filter(([timeKey]) => timeKey.startsWith(today)).map(([, point]) => point.temperature as number)
  const minTemp = Math.min(...temperatures)
  const maxTemp = Math.max(...temperatures)
  const timeStr = Temporal.Now.plainDateTimeISO().toString().substring(0, 13) + ':00'
  const current = hourly[timeStr]
  let text = ''
  text += `Currently the weather is **${current.weather_condition as string}** with **${current.temperature as string}°C,** in **${city}**.  `
  text += `During the day, the temperature will rise to **${maxTemp.toString()}°C** and drop to **${minTemp.toString()}°C** in the evening.  `
  text += `The sun will rise at **${formatTime(daily[today].sunrise as string)}** and set at **${formatTime(daily[today].sunset as string)}**. `
  text += getPrecipitationString(hourly, Temporal.Now.plainDateTimeISO())
  text += '\n\n'
  return { text, actions: ['Get Todays Weather Details', 'Get Tomorrow\'s Weather Details', 'Get a Weekly Weather Forecast'] }
}

export function getPrecipitationString(hourly: Record<string, Record<string, unknown>>, now: Temporal.PlainDateTime): string {
  const today = now.toString().substring(0, 10)
  const currentHour = now.toString().substring(0, 13) + ':00'
  const entries = Object.entries(hourly)
    .filter(([timeKey]) => timeKey.startsWith(today) && timeKey >= currentHour)
    .sort(([a], [b]) => a.localeCompare(b))

  const events: { condition: string, start: string, end: string, isNow: boolean, noClearing: boolean }[] = []
  let i = 0
  while (i < entries.length) {
    const [, point] = entries[i]
    if (!PRECIPITATION_CONDITIONS.has(point.weather_condition as string)) {
      i++
      continue
    }

    const condition = (point.weather_condition as string).toLowerCase()
    const start = entries[i][0].substring(11, 16)
    let j = i + 1
    while (j < entries.length && (entries[j][1].weather_condition as string).toLowerCase() === condition) j++
    const end = j < entries.length ? entries[j][0].substring(11, 16) : entries[j - 1][0].substring(11, 16)
    events.push({ condition, start, end, isNow: entries[i][0].startsWith(currentHour), noClearing: j >= entries.length })
    i = j
  }

  if (events.length === 0) return 'No rain to be expected.'

  const first = events[0]
  if (events.length === 1) {
    if (first.isNow) {
      if (first.noClearing) return capitalize(`${first.condition} is expected to continue.`)
      return capitalize(`${first.condition} is expected to continue until around ${first.end}.`)
    }
    return capitalize(`${first.condition} expected at around ${first.start}.`)
  }

  let result = first.isNow
    ? `${first.condition} is expected to continue until around ${first.end}`
    : `${first.condition} expected at around ${first.start} until around ${first.end}`
  for (let k = 1; k < events.length; k++) {
    if (k === 1) result += `, then ${events[k].condition}`
    else result += `, ${events[k].condition}`
    if (k === events.length - 1) result += ' afterwards.'
    else result += ` until around ${events[k].end}`
  }
  return capitalize(result)
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

const PRECIPITATION_CONDITIONS = new Set([
  'Light drizzle', 'Moderate drizzle', 'Dense drizzle', 'Light freezing drizzle', 'Dense freezing drizzle',
  'Light rain', 'Moderate rain', 'Heavy rain', 'Light freezing rain', 'Heavy freezing rain',
  'Light snow', 'Moderate snow', 'Heavy snow', 'Snow grains',
  'Light rain showers', 'Moderate rain showers', 'Heavy rain showers',
  'Light snow showers', 'Heavy snow showers',
  'Slight or moderate thunderstorm', 'Thunderstorm with slight hail', 'Thunderstorm with heavy hail',
])

function formatTime(input: string): string {
  const date = new Date(input)
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

async function getTasks(user: UserSession): Promise<PartResult> {
  logger.debug('Initialize tasks part')
  const [inboxCount, whatsAppChats, todoCount, eventCount] = await Promise.all([
    getInboxCount(user),
    getWAFasade(user).then(async wa => (await wa.getChats()).filter(c => !c.isArchived)).then(chats => chats.length),
    getTodoCount(user),
    getEventCount(user),
  ])
  const totalTaskCount = todoCount.tasksDueToday + todoCount.tasksDueRestOfWeek + todoCount.tasksWithoutDate
  let text = ''
  text += `You have **${inboxCount.focused.toString()}** focused emails (${inboxCount.focusedUnread.toString()} unread) and ${inboxCount.other.toString()} others. `
  text += `There are **${whatsAppChats.toString()}** unarchived WhatsApp chats. `
  text += `You have **${todoCount.tasksDueToday.toString()}** tasks due today and **${(todoCount.tasksDueRestOfWeek + todoCount.tasksWithoutDate).toString()}** tasks due this week. `
  text += `You have **${eventCount.eventsToday.toString()}** events today and **${eventCount.eventsThisWeek.toString()}** in this week.`
  const actions: string[] = []
  if (totalTaskCount > 0) actions.push('Show task overview')
  if ((inboxCount.focusedUnread + inboxCount.otherUnread) > 0) actions.push('Get Outlook Overview')
  if (whatsAppChats > 0) actions.push('Get WhatsApp Overview')
  actions.push('Show Calendar Overview')
  return { text, actions }
}
