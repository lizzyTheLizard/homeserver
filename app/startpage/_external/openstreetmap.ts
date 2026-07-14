import { logEvent } from '@/app/shared/_data/Event'
import { logger } from '@/app/shared/logger'

const CACHE_TTL_MS = 10 * 60 * 1000
const cache = new Map<string, { data: unknown, timestamp: number }>()

async function cachedFetch(url: string): Promise<unknown> {
  if (cache.has(url)) {
    const cached = cache.get(url)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.data
    }
  }
  const response = await fetch(url, { headers: { 'User-Agent': 'gutschi.site' } })
  if (!response.ok) throw new Error(`Failed to fetch: ${response.status.toString()} ${response.statusText}`)
  const data = await response.json() as unknown
  cache.set(url, { data, timestamp: Date.now() })
  return data
}

export async function getLocationDescription(location: { lat: number, lon: number }): Promise<string> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${location.lat.toString()}&lon=${location.lon.toString()}`
    const data = await cachedFetch(url) as { display_name: string }
    return data.display_name
  }
  catch (error) {
    logger.warn('Could not get location description', error)
    return 'Unknown location'
  }
}

export async function getLocationByName(placeName: string): Promise<{ lat: number, lon: number }> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${placeName}&format=jsonv2`
    const data = await cachedFetch(url) as { lat: string, lon: string }[]
    return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) }
  }
  catch (error) {
    logger.warn('Could not get location by name', error)
    await logEvent(undefined, 'WARN', `Could not get location for place name: ${placeName}`)
    throw error
  }
}
