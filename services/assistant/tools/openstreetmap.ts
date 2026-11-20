import { logger } from '../logger'
import { z } from 'zod'

const CACHE_TTL_MS = 10 * 60 * 1000
const reverseSchema = z.object({ address: z.object({ city: z.string() }) })
const searchSchema = z.array(z.object({ lat: z.string(), lon: z.string() })).min(1)
const cache = new Map<string, { data: unknown, timestamp: number }>()

export async function getLocationDescription(location: { lat: number, lon: number }): Promise<string> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${location.lat.toString()}&lon=${location.lon.toString()}`
    const data = reverseSchema.parse(await cachedFetch(url))
    return data.address.city
  }
  catch (error) {
    logger.warn('Could not get location description', error)
    return 'Unknown location'
  }
}

export async function getLocationByName(placeName: string): Promise<{ lat: number, lon: number }> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${placeName}&format=jsonv2`
    const data = searchSchema.parse(await cachedFetch(url))
    return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) }
  }
  catch (error) {
    logger.warn('Could not get location by name', error)
    throw error
  }
}

async function cachedFetch(url: string): Promise<unknown> {
  if (cache.has(url)) {
    const cached = cache.get(url)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      logger.debug(`Return cached openstreetmap data for request ${url}`)
      return cached.data
    }
  }
  logger.silly(`Fetch data from ${url}`)
  const start = Date.now()
  const response = await fetch(url, { headers: { 'User-Agent': 'gutschi.site' } })
  if (!response.ok) throw new Error(`Failed to fetch: ${response.status.toString()} ${response.statusText}`)
  const data: unknown = await response.json()
  logger.silly(`Fetched data from ${url} in ${(Date.now() - start).toString()}ms`)
  cache.set(url, { data, timestamp: Date.now() })
  return data
}
