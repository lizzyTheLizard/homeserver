import { UserSession } from '@/app/shared/auth/session'
import { AssistantEvent, InitialContext } from './assistant'
import { openmeteoRequest, parseOpenMeteoData } from '../_external/openmeteo'
import { getLocationDescription } from '../_external/openstreetmap'
import { getWhatsappChats, getWhatsappStatus } from '../_external/whatsapp'
import { getMicrosoftMailWorker } from '../_external/microsoft-mail'
import { getMicrosoftTodoWorker } from '../_external/microsoft-todo'
import { getMicrosoftCalendarWorker } from '../_external/microsoft-calendar'
import { ModelMessage } from 'ai'
import { Temporal } from '@js-temporal/polyfill'
import fs from 'fs'
import { join } from 'path'
import { logger } from '@/app/shared/logger'
import { getMicrosoftToken } from '../_data/Microsoft'
import { nontransactional } from '@/app/shared/_external/db/access'

const ASSISTANT_DIR = join(process.cwd(), 'app', 'startpage', '_assistant')
const systemMessageTemplate = fs.readFileSync(join(ASSISTANT_DIR, 'system.md'), 'utf-8')

export async function generateInitialMessages(user: UserSession, initialContext: InitialContext, emit: (event: AssistantEvent) => void): Promise<ModelMessage[]> {
  // Initialize all the needed data. Do this in a particular order to avoid unnecessary waiting time.
  logger.info(`Generating initial messages for user ${user.email} with context: ${JSON.stringify(initialContext)}`)
  const greeting = getGreeting()
  const weather = getWeather(initialContext)
  const microsoft = getMicrosoft(user)
  const whatsapp = getWhatsapp(user)
  const parts = await Promise.all([greeting, weather, microsoft, whatsapp])

  // Now we can generate the actual messages
  const systemMessage = getSystemMessage(initialContext)
  const initialMessage = parts.map(part => part.text).join('')
  const actions = parts.reverse().flatMap(part => part.actions)

  // Now we emit the message to the client, start with a tool_call to clean existing messages
  emit({ type: 'stream_response', chunk: initialMessage })
  emit({ type: 'finished_response' })
  emit({ type: 'got_actions', actions: actions })
  logger.debug(`Finished initial message generation.`)
  return [{ role: 'system', content: systemMessage }, { role: 'assistant', content: initialMessage }]
}

function getGreeting(): Promise<PartResult> {
  const hour = new Date().getHours()
  const timeOfDay = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening'
  const result = { text: `Good ${timeOfDay}!\n\n`, actions: [] }
  return Promise.resolve(result)
}

async function getWeather(initialContext: InitialContext): Promise<PartResult> {
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

async function getMicrosoft(user: UserSession): Promise<PartResult> {
  const microsoftToken = await nontransactional(db => getMicrosoftToken(db, user.email))
  if (!microsoftToken) return { text: 'Microsoft is not connected. ', actions: [] }
  const [mailWorker, todoWorker, calendarWorker] = await Promise.all([
    getMicrosoftMailWorker(user),
    getMicrosoftTodoWorker(user),
    getMicrosoftCalendarWorker(user),
  ])

  for (let i = 0; i < 300; i++) {
    const connected = [mailWorker, todoWorker, calendarWorker].reduce((p, s) => p && s.getStatus() === 'connected', true)
    if (connected) break
    if (i === 299) {
      logger.error(`Microsoft services not connected for user ${user.email}. Mail: ${mailWorker.getStatus()}, Todo: ${todoWorker.getStatus()}, Calendar: ${calendarWorker.getStatus()}`)
      return { text: 'Microsoft services not connected in time. ', actions: [] }
    }
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  const actions: string[] = []
  let text = ''

  const inboxCount = mailWorker.getInboxCount()
  const totalInboxCount = inboxCount.focused + inboxCount.other
  text += `You have **${inboxCount.focused.toString()}** focused emails (${inboxCount.focusedUnread.toString()} unread) and ${inboxCount.other.toString()} others. `
  if (totalInboxCount > 0) actions.push('Get Outlook Overview')

  const todoCount = todoWorker.getTodoCount()
  const totalTaskCount = todoCount.tasksDueToday + todoCount.tasksDueRestOfWeek + todoCount.tasksWithoutDate
  text += `You have **${todoCount.tasksDueToday.toString()}** tasks due today and **${(todoCount.tasksDueRestOfWeek + todoCount.tasksWithoutDate).toString()}** tasks due this week. `
  if (totalTaskCount > 0) actions.push('Show task overview')

  const eventCount = calendarWorker.getEventCount()
  text += `You have **${eventCount.eventsToday.toString()}** events today and **${eventCount.eventsThisWeek.toString()}** in this week.`
  actions.push('Show Calendar Overview')

  return { text, actions }
}

async function getWhatsapp(user: UserSession): Promise<PartResult> {
  const status = await getWhatsappStatus(user.email)
  if (status.type !== 'connected') return { text: 'WhatsApp is not connected. ', actions: [] }
  const chats = await getWhatsappChats(user.email)
  const unarchived = chats.filter(c => !c.isArchived).length
  const text = `There are **${unarchived.toString()}** unarchived WhatsApp chats. `
  const actions = (unarchived > 0 ? ['Get WhatsApp Overview'] : [])
  return { text, actions }
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
