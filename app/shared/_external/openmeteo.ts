import { logEvent } from '../_data/Event'
import { logger } from '../logger'
import { nontransactional } from './db/access'

export interface OpenMeteoWeather {
  temp: number
  weatherCode: number
}

const CACHE_TTL_MS = 10 * 60 * 1000

interface CacheEntry {
  data: OpenMeteoWeather
  timestamp: number
}

let cache: CacheEntry | null = null

export async function fetchWeather(location: string): Promise<OpenMeteoWeather | undefined> {
  const now = Date.now()
  if (cache && now - cache.timestamp < CACHE_TTL_MS) return cache.data

  try {
    const [lat, lon] = location.split(',').map(s => s.trim())
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`
    const res = await fetch(url, { cache: 'no-store' })
    if (!res.ok) {
      logger.warn(`Weather API returned ${String(res.status)} ${res.statusText}`)
      await nontransactional(c => logEvent(c, 'WARN', `Weather API error: ${String(res.status)} ${res.statusText}`))
      return undefined
    }

    const json = await res.json() as { current_weather?: { temperature?: number, weathercode?: number } }
    const temperature = json.current_weather?.temperature
    const weathercode = json.current_weather?.weathercode
    if (temperature === undefined || weathercode === undefined) {
      logger.warn('Weather API response missing current_weather data')
      return undefined
    }

    const data: OpenMeteoWeather = {
      temp: Math.round(temperature),
      weatherCode: weathercode,
    }
    cache = { data, timestamp: now }
    return data
  }
  catch (e) {
    logger.warn('Failed to fetch weather data', e)
    await nontransactional(c => logEvent(c, 'WARN', `Failed to fetch weather data: ${String(e)}`))
    return undefined
  }
}
