import type { AssistantEvent, InitialContext } from './types'
import { ensureWhatsappStarted, getWhatsappChats, getWhatsappStatus } from './whatsapp/whatsapp'
import { openmeteoRequest, parseOpenMeteoData } from './tools/openmeteo'
import type { ModelMessage } from 'ai'
import { Temporal } from '@js-temporal/polyfill'
import type { UserSession } from './session'
import fs from 'fs'
import { getLocationDescription } from './tools/openstreetmap'
import { getMicrosoftCalendarWorker } from './microsoft/calendar'
import { getMicrosoftMailWorker } from './microsoft/mail'
import { getMicrosoftTodoWorker } from './microsoft/todo'
import { join } from 'path'
import { logger } from './logger'

const ASSISTANT_DIR = __dirname,
 systemMessageTemplate = fs.readFileSync(join(ASSISTANT_DIR, 'system.md'), 'utf-8')

export async function generateInitialMessages(user: UserSession, initialContext: InitialContext, emit: (event: AssistantEvent) => void): Promise<ModelMessage[]> {
  // Initialize all the needed data. Do this in a particular order to avoid unnecessary waiting time.
  logger.info(`Generating initial messages for user ${user.email} with context: ${JSON.stringify(initialContext)}`)
  const greeting = getGreeting(),
   weather = getWeather(initialContext),
   microsoft = getMicrosoft(user),
   whatsapp = getWhatsapp(user),
   parts = await Promise.all([greeting, weather, microsoft, whatsapp]),

  // Now we can generate the actual messages
   systemMessage = getSystemMessage(initialContext),
   initialMessage = parts.map(part => part.text).join(''),
   actions = parts.reverse().flatMap(part => part.actions)

  // Now we emit the message to the client, start with a tool_call to clean existing messages
  emit({ chunk: initialMessage, type: 'stream_response' })
  emit({ type: 'finished_response' })
  emit({ actions, type: 'got_actions' })
  logger.debug(`Finished initial message generation.`)
  return [{ content: systemMessage, role: 'system' }, { content: initialMessage, role: 'assistant' }]
}

function getGreeting(): Promise<PartResult> {
  const hour = new Date().getHours();
  let timeOfDay = ""
  if (hour < 12) {
    timeOfDay = 'morning';
  } else if (hour < 18) {
    timeOfDay = 'afternoon';
  } else {
    timeOfDay = 'evening';
  }
   const result = { actions: [], text: `Good ${timeOfDay}!\n\n` }
  return Promise.resolve(result)
}

async function getWeather(initialContext: InitialContext): Promise<PartResult> {
  const {location} = initialContext,
   today = Temporal.Now.plainDateISO().toString(),
   tomorrow = Temporal.Now.plainDateISO().add({ days: 1 }).toString(),
   params = { daily: 'sunrise,sunset', end_date: tomorrow, hourly: 'temperature_2m,precipitation,weather_code', start_date: today },
   [city, data] = await Promise.all([
    getLocationDescription(location),
    openmeteoRequest(location.lat, location.lon, params),
  ]),
   daily = parseOpenMeteoData(data.daily),
   hourly = parseOpenMeteoData(data.hourly),
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion
   temperatures = Object.entries(hourly).filter(([timeKey]) => timeKey.startsWith(today)).map(([, point]) => point.temperature as number),
   minTemp = Math.min(...temperatures),
   maxTemp = Math.max(...temperatures),
   timeStr = `${Temporal.Now.plainDateTimeISO().toString().substring(0, 13)  }:00`,
   current = hourly[timeStr]
  let text = ''
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  text += `Currently the weather is **${current.weather_condition as string}** with **${current.temperature as string}°C,** in **${city}**.  `
  text += `During the day, the temperature will rise to **${maxTemp.toString()}°C** and drop to **${minTemp.toString()}°C** in the evening.  `
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  text += `The sun will rise at **${formatTime(daily[today].sunrise as string)}** and set at **${formatTime(daily[today].sunset as string)}**. `
  text += getPrecipitationString(hourly, Temporal.Now.plainDateTimeISO())
  text += '\n\n'
  return { actions: ['Get Todays Weather Details', 'Get Tomorrow\'s Weather Details', 'Get a Weekly Weather Forecast'], text }
}

export function getPrecipitationString(hourly: Record<string, Record<string, unknown>>, now: Temporal.PlainDateTime): string {
  const today = now.toString().substring(0, 10),
   currentHour = `${now.toString().substring(0, 13)  }:00`,
   entries = Object.entries(hourly)
    .filter(([timeKey]) => timeKey.startsWith(today) && timeKey >= currentHour)
    .sort(([a], [b]) => a.localeCompare(b)),

   events: { condition: string, start: string, end: string, isNow: boolean, noClearing: boolean }[] = []
  let i = 0
  while (i < entries.length) {
    const [, point] = entries[i]
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion
    if (!PRECIPITATION_CONDITIONS.has(point.weather_condition as string)) {
      i++
      continue
    }

    // oxlint-disable-next-line typescript/no-unsafe-type-assertion
    const condition = (point.weather_condition as string).toLowerCase(),
     start = entries[i][0].substring(11, 16)
    let j = i + 1
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion
    while (j < entries.length && (entries[j][1].weather_condition as string).toLowerCase() === condition) {j++}
    const end = j < entries.length ? entries[j][0].substring(11, 16) : entries[j - 1][0].substring(11, 16)
    events.push({ condition, end, isNow: entries[i][0].startsWith(currentHour), noClearing: j >= entries.length, start })
    i = j
  }

  if (events.length === 0) {return 'No rain to be expected.'}

  const first = events[0]
  if (events.length === 1) {
    if (first.isNow) {
      if (first.noClearing) {return capitalize(`${first.condition} is expected to continue.`)}
      return capitalize(`${first.condition} is expected to continue until around ${first.end}.`)
    }
    return capitalize(`${first.condition} expected at around ${first.start}.`)
  }

  let result = first.isNow
    ? `${first.condition} is expected to continue until around ${first.end}`
    : `${first.condition} expected at around ${first.start} until around ${first.end}`
  for (let k = 1; k < events.length; k++) {
    if (k === 1) {result += `, then ${events[k].condition}`}
    else {result += `, ${events[k].condition}`}
    if (k === events.length - 1) {result += ' afterwards.'}
    else {result += ` until around ${events[k].end}`}
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
  const [mailWorker, todoWorker, calendarWorker] = await Promise.all([
    getMicrosoftMailWorker(user),
    getMicrosoftTodoWorker(user),
    getMicrosoftCalendarWorker(user),
  ])

  for (let i = 0; i < 300; i++) {
    const connected = [mailWorker, todoWorker, calendarWorker].reduce((p, s) => p && s.getStatus() === 'connected', true)
    if (connected) {break}
    if (i === 299) {
      logger.error(`Microsoft services not connected for user ${user.email}. Mail: ${mailWorker.getStatus()}, Todo: ${todoWorker.getStatus()}, Calendar: ${calendarWorker.getStatus()}`)
      return { actions: [], text: 'Microsoft services not connected in time. ' }
    }
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  const actions: string[] = []
  let text = ''

  const inboxCount = mailWorker.getInboxCount(),
   totalInboxCount = inboxCount.focused + inboxCount.other
  text += `You have **${inboxCount.focused.toString()}** focused emails (${inboxCount.focusedUnread.toString()} unread) and ${inboxCount.other.toString()} others. `
  if (totalInboxCount > 0) {actions.push('Get Outlook Overview')}

  const todoCount = todoWorker.getTodoCount(),
   totalTaskCount = todoCount.tasksDueToday + todoCount.tasksDueRestOfWeek + todoCount.tasksWithoutDate
  text += `You have **${todoCount.tasksDueToday.toString()}** tasks due today and **${(todoCount.tasksDueRestOfWeek + todoCount.tasksWithoutDate).toString()}** tasks due this week. `
  if (totalTaskCount > 0) {actions.push('Show task overview')}

  const eventCount = calendarWorker.getEventCount()
  text += `You have **${eventCount.eventsToday.toString()}** events today and **${eventCount.eventsThisWeek.toString()}** in this week.`
  actions.push('Show Calendar Overview')

  return { actions, text }
}

async function getWhatsapp(user: UserSession): Promise<PartResult> {
  await ensureWhatsappStarted(user.email)
  const status = await getWhatsappStatus(user.email)
  if (status.type !== 'connected') {return { actions: [], text: 'WhatsApp is not connected. ' }}
  const chats = await getWhatsappChats(user.email),
   unarchived = chats.filter(c => !c.isArchived).length,
   text = `There are **${unarchived.toString()}** unarchived WhatsApp chats. `,
   actions = (unarchived > 0 ? ['Get WhatsApp Overview'] : [])
  return { actions, text }
}

function getSystemMessage(initialContext: InitialContext): string {
  const {location} = initialContext,
   locationDescription = `Latitude: ${location.lat.toString()}, Longitude: ${location.lon.toString()}`
  return systemMessageTemplate
    .replace('{{LOCATION}}', locationDescription)
    .replace('{{DATE}}', Temporal.Now.plainDateTimeISO().toString())
}

interface PartResult {
  text: string
  actions: string[]
}
