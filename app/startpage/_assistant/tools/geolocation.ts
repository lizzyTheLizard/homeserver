import { logger } from '@/app/shared/logger'
import { tool, ToolSet } from 'ai'
import { z } from 'zod/v4'

export async function getLocationDescription(location: { lat: number, lon: number }): Promise<string> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${location.lat.toString()}&lon=${location.lon.toString()}`
    const response = await fetch(url, { headers: { 'User-Agent': 'gutschi.site' } })
    if (!response.ok) throw new Error(`Failed to get location name: ${response.status.toString()} ${response.statusText}`)
    const data = await response.json() as { display_name: string }
    return data.display_name
  }
  catch (error) {
    logger.warn('Could not get location description', error)
    return 'Unknown location'
  }
}

export function getGeolocationTools(): ToolSet {
  const locationByNameTool = tool({
    description: 'Get the location (latitude and longitude) of a place by its name',
    inputSchema: z.object({
      name: z.string().describe('Name of the place to get the location for'),
    }),
    outputSchema: z.object({
      lat: z.number().describe('Latitude of the place'),
      lon: z.number().describe('Longitude of the place'),
    }),
    execute: async ({ name }) => {
      return await getLocationByName(name)
    },
  })

  return {
    get_location_by_name: locationByNameTool,
  }
}

export async function getLocationByName(placeName: string): Promise<{ lat: number, lon: number }> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${placeName}&format=jsonv2`
    const response = await fetch(url, { headers: { 'User-Agent': 'gutschi.site' } })
    if (!response.ok) throw new Error(`Failed to get location: ${response.status.toString()} ${response.statusText}`)
    const data = await response.json() as { lat: string, lon: string }[]
    return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) }
  }
  catch (error) {
    logger.warn('Could not get location by name', error)
    return { lat: 0, lon: 0 }
  }
}
