import { tool } from 'ai'
import { z } from 'zod/v4'
import { Temporal } from '@js-temporal/polyfill'

const CACHE_TTL_MS = 10 * 60 * 1000
const cache = new Map<string, { data: { hourly?: unknown, daily?: unknown }, timestamp: number }>()

export function getWeatherTools() {
  const detailedWeatherTool = tool({
    description: 'Get the detailed weather for a specific location and day',
    inputSchema: z.object({
      date: z.string().describe('Date for the detailed weather in YYYY-MM-DD format'),
      latitude: z.number().describe('Latitude of the location'),
      longitude: z.number().describe('Longitude of the location'),
    }),
    execute: async ({ date, latitude, longitude }) => {
      const params = { hourly: 'temperature_2m,relative_humidity_2m,precipitation,precipitation_probability,weather_code,cloud_cover,wind_speed_10m,wind_direction_10m', daily: 'sunrise,sunset', start_date: date, end_date: date }
      const data = await openmeteoRequest(latitude, longitude, params)
      const daily = parseOpenMeteoData(data.daily)
      const sunrise = daily[date].sunrise
      const sunset = daily[date].sunset
      return JSON.stringify({ sunrise, sunset, ...parseOpenMeteoData(data.hourly) })
    },
  })

  const weatherForcastTool = tool({
    description: 'Get a detailed weather forecast for 5 days, starting from a specific date, for a specific location',
    inputSchema: z.object({
      startDay: z.string().describe('Date for the weather forecast in YYYY-MM-DD format'),
      latitude: z.number().describe('Latitude of the location'),
      longitude: z.number().describe('Longitude of the location'),
    }),
    execute: async ({ startDay, latitude, longitude }) => {
      const endDate = Temporal.PlainDate.from(startDay).add({ days: 4 }).toString()
      const params = { daily: 'weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,wind_direction_10m_dominant', start_date: startDay, end_date: endDate }
      const data = await openmeteoRequest(latitude, longitude, params)
      return JSON.stringify(parseOpenMeteoData(data.daily))
    },
  })

  return {
    get_detailed_weather: detailedWeatherTool,
    get_weather_forecast: weatherForcastTool,
  }
}

export async function shortWeatherOverview(latitude: number, longitude: number): Promise<unknown> {
  const today = Temporal.Now.plainDateISO().toString()
  const tomorrow = Temporal.Now.plainDateISO().add({ days: 1 }).toString()
  const params = { hourly: 'temperature_2m,precipitation,weather_code', daily: 'sunrise,sunset', start_date: today, end_date: tomorrow }
  const data = await openmeteoRequest(latitude, longitude, params)
  const daily = parseOpenMeteoData(data.daily)
  const sunrise = daily[today].sunrise
  const sunset = daily[today].sunset
  const hourly = parseOpenMeteoData(data.hourly)
  const current = getShortWeatherOverview(hourly, Temporal.Now.plainDateTimeISO())
  const midday = getShortWeatherOverview(hourly, Temporal.Now.plainDateTimeISO().with({ hour: 12, minute: 0 }))
  const evening = getShortWeatherOverview(hourly, Temporal.Now.plainDateTimeISO().with({ hour: 18, minute: 0 }))
  const tomorrowMorning = getShortWeatherOverview(hourly, Temporal.Now.plainDateTimeISO().add({ days: 1 }).with({ hour: 6, minute: 0 }))
  const tomorrowMidday = getShortWeatherOverview(hourly, Temporal.Now.plainDateTimeISO().add({ days: 1 }).with({ hour: 12, minute: 0 }))
  const tomorrowEvening = getShortWeatherOverview(hourly, Temporal.Now.plainDateTimeISO().add({ days: 1 }).with({ hour: 18, minute: 0 }))
  return { sunrise, sunset, current, midday, evening, tomorrowMorning, tomorrowMidday, tomorrowEvening }
}

function getShortWeatherOverview(hourly: Record<string, Record<string, unknown>>, time: Temporal.PlainDateTime): unknown {
  const timeStr = time.toString().substring(0, 13) + ':00'
  const weather = hourly[timeStr]
  return { temperature: weather.temperature, condition: weather.weather_condition, precipitation: weather.precipitation }
}

async function openmeteoRequest(lat: number, lon: number, params: Record<string, string>): Promise<{ hourly?: unknown, daily?: unknown }> {
  const urlParams = new URLSearchParams()
  urlParams.append('latitude', lat.toFixed(4))
  urlParams.append('longitude', lon.toFixed(4))
  urlParams.append('timezone', 'auto')
  for (const [key, value] of Object.entries(params)) {
    urlParams.append(key, value)
  }
  if (cache.has(urlParams.toString())) {
    const cached = cache.get(urlParams.toString())
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.data
    }
  }
  const url = `https://api.open-meteo.com/v1/forecast?${urlParams}`
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) {
    throw new Error(`Open-Meteo API error: ${res.status.toString()} ${res.statusText}`)
  }
  const data = await res.json() as { hourly?: unknown, daily?: unknown }
  cache.set(urlParams.toString(), { data, timestamp: Date.now() })
  return data
}

function parseOpenMeteoData(hourlyOrDaily: unknown): Record<string, Record<string, unknown>> {
  if (typeof hourlyOrDaily !== 'object' || hourlyOrDaily === null) throw new Error('Invalid Open-Meteo data format')
  if (!('time' in hourlyOrDaily && Array.isArray(hourlyOrDaily.time))) throw new Error('Invalid Open-Meteo data format: missing time array')
  const result: Record<string, Record<string, unknown>> = {}
  hourlyOrDaily.time.forEach((time: unknown, index: number) => {
    if (typeof time !== 'string') throw new Error('Invalid Open-Meteo data format: time should be a string')
    const timeResult: Record<string, unknown> = { }
    for (const [key, value] of Object.entries(hourlyOrDaily)) {
      if (key === 'time') continue
      if (!Array.isArray(value)) throw new Error(`Invalid Open-Meteo data format for key ${key}`)
      if (key === 'temperature_2m') timeResult.temperature = value[index]
      else if (key === 'weather_code') {
        timeResult.weather_condition = getWmoCondition(value[index] as number)
      }
      else timeResult[key] = value[index]
    }
    result[time] = timeResult
  })
  return result
}

function getWmoCondition(code: number): string {
  switch (code) {
    case 0: return 'Clear sky'
    case 1: return 'Mainly clear'
    case 2: return 'Partly cloudy'
    case 3: return 'Overcast'
    case 45: return 'Fog'
    case 48: return 'Depositing rime fog'
    case 51: return 'Light drizzle'
    case 53: return 'Moderate drizzle'
    case 55: return 'Dense drizzle'
    case 56: return 'Light freezing drizzle'
    case 57: return 'Dense freezing drizzle'
    case 61: return 'Light rain'
    case 63: return 'Moderate rain'
    case 65: return 'Heavy rain'
    case 66: return 'Light freezing rain'
    case 67: return 'Heavy freezing rain'
    case 71: return 'Light snow'
    case 73: return 'Moderate snow'
    case 75: return 'Heavy snow'
    case 77: return 'Snow grains'
    case 80: return 'Light rain showers'
    case 81: return 'Moderate rain showers'
    case 82: return 'Heavy rain showers'
    case 85: return 'Light snow showers'
    case 86: return 'Heavy snow showers'
    case 95: return 'Slight or moderate thunderstorm'
    case 96: return 'Thunderstorm with slight hail'
    case 99: return 'Thunderstorm with heavy hail'
    default: throw new Error('Unknown WMO code: ' + String(code))
  }
}
