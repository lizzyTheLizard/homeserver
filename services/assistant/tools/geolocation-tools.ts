import { type ToolSet, tool } from 'ai';
import { getLocationByName } from './openstreetmap'
import { z } from 'zod/v4'

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
