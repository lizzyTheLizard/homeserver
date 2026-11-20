import type { ToolSet } from 'ai';
import { tool } from 'ai'
import { z } from 'zod/v4'
import { getLocationByName } from './openstreetmap'

export default function getTools(): ToolSet {
  return {
    get_location_by_name: locationByNameTool,
  }
}

const locationByNameTool = tool({
  description: 'Get the location (latitude and longitude) of a place by its name',
  execute: async ({ name }) => 
    await getLocationByName(name)
  ,
  inputSchema: z.object({
    name: z.string().describe('Name of the place to get the location for'),
  }),
  outputSchema: z.object({
    lat: z.number().describe('Latitude of the place'),
    lon: z.number().describe('Longitude of the place'),
  }),
})
