import { logger } from '@/app/shared/logger'

const CACHE_TTL_MS = 10 * 60 * 1000
const cache = new Map<string, { data: unknown, timestamp: number }>()

export async function openmeteoRequest(lat: number, lon: number, params: Record<string, string>): Promise<{ hourly?: unknown, daily?: unknown }> {
  const urlParams = new URLSearchParams()
  urlParams.append('latitude', lat.toFixed(4))
  urlParams.append('longitude', lon.toFixed(4))
  urlParams.append('timezone', 'auto')
  for (const [key, value] of Object.entries(params)) {
    urlParams.append(key, value)
  }
  const url = `https://api.open-meteo.com/v1/forecast?${urlParams}`
  return await cachedFetch(url) as { hourly?: unknown, daily?: unknown }
}

async function cachedFetch(url: string): Promise<unknown> {
  if (cache.has(url)) {
    const cached = cache.get(url)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      logger.debug(`Return cached openmeteo data for request ${url}`)
      return cached.data
    }
  }
  logger.silly(`Fetch data from ${url}`)
  const start = Date.now()
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Failed to fetch: ${response.status.toString()} ${response.statusText}`)
  const data = await response.json() as unknown
  logger.silly(`Fetched from ${url} data in ${(Date.now() - start).toString()}ms`)
  cache.set(url, { data, timestamp: Date.now() })
  return data
}

export function parseOpenMeteoData(hourlyOrDaily: unknown): Record<string, Record<string, unknown>> {
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
