import { tool } from 'ai'
import { z } from 'zod/v4'
import { Temporal } from '@js-temporal/polyfill'

const FALLBACK_LAT = 46.948
const FALLBACK_LON = 7.4474

export async function getLocation(): Promise<{ lon: number, lat: number }> {
  try {
    const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000, enableHighAccuracy: false })
    })
    return { lat: pos.coords.latitude, lon: pos.coords.longitude }
  }
  catch (error) {
    const pos = { lat: FALLBACK_LAT, lon: FALLBACK_LON }
    console.warn('Unable to get geolocation, using fallback coordinates', pos, error)
    return pos
  }
}

export const weatherForcastTool = tool({
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

export const detailedWeatherTool = tool({
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

const CACHE_TTL_MS = 10 * 60 * 1000
const cache = new Map<string, { data: { hourly?: unknown, daily?: unknown }, timestamp: number }>()

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
        timeResult.weather_condition = WMO_CONDITIONS[value[index] as number]
        if (timeResult.weather_condition === undefined) throw new Error('Unknown WMO code: ' + String(value[index]))
      }
      else timeResult[key] = value[index]
    }
    result[time] = timeResult
  })
  return result
}

const WMO_CONDITIONS: Record<number, string> = {
  0: 'Clear sky',
  1: 'Mainly clear',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Fog',
  48: 'Depositing rime fog',
  51: 'Light drizzle',
  53: 'Moderate drizzle',
  55: 'Dense drizzle',
  56: 'Light freezing drizzle',
  57: 'Dense freezing drizzle',
  61: 'Light rain',
  63: 'Moderate rain',
  65: 'Heavy rain',
  66: 'Light freezing rain',
  67: 'Heavy freezing rain',
  71: 'Light snow',
  73: 'Moderate snow',
  75: 'Heavy snow',
  77: 'Snow grains',
  80: 'Light rain showers',
  81: 'Moderate rain showers',
  82: 'Heavy rain showers',
  85: 'Light snow showers',
  86: 'Heavy snow showers',
  95: 'Slight or moderate thunderstorm',
  96: 'Thunderstorm with slight hail',
  99: 'Thunderstorm with heavy hail',
}
