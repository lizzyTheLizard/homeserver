import { type ToolSet, tool } from 'ai';
import { openmeteoRequest, parseOpenMeteoData } from './openmeteo'
import { Temporal } from '@js-temporal/polyfill'
import { logger } from '../logger'
import { z } from 'zod/v4'

export default function getTools(): ToolSet {
  return {
    get_detailed_weather: detailedWeatherTool,
    get_weather_forecast: weatherForcastTool,
  }
}

const detailedWeatherTool = tool({
  description: 'Get the detailed weather for a specific location and day',
  execute: async ({ date, latitude, longitude }) => {
    try {
      const params = { daily: 'sunrise,sunset', end_date: date, hourly: 'temperature_2m,relative_humidity_2m,precipitation,precipitation_probability,weather_code,cloud_cover,wind_speed_10m,wind_direction_10m', start_date: date },
       data = await openmeteoRequest(latitude, longitude, params),
       daily = parseOpenMeteoData(data.daily),
       {sunrise} = daily[date],
       {sunset} = daily[date]
      return JSON.stringify({ sunrise, sunset, ...parseOpenMeteoData(data.hourly) })
    }
    catch (error) {
      logger.warn('Could not get detailed weather', error)
      throw error
    }
  },
  inputSchema: z.object({
    date: z.string().describe('Date for the detailed weather in YYYY-MM-DD format'),
    latitude: z.number().describe('Latitude of the location'),
    longitude: z.number().describe('Longitude of the location'),
  }),
}),

 weatherForcastTool = tool({
  description: 'Get a detailed weather forecast for 5 days, starting from a specific date, for a specific location',
  execute: async ({ startDay, latitude, longitude }) => {
    try {
      const endDate = Temporal.PlainDate.from(startDay).add({ days: 4 }).toString(),
       params = { daily: 'weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,wind_direction_10m_dominant', end_date: endDate, start_date: startDay },
       data = await openmeteoRequest(latitude, longitude, params)
      return JSON.stringify(parseOpenMeteoData(data.daily))
    }
    catch (error) {
      logger.warn('Could not get weather forecast', error)
      throw error
    }
  },
  inputSchema: z.object({
    latitude: z.number().describe('Latitude of the location'),
    longitude: z.number().describe('Longitude of the location'),
    startDay: z.string().describe('Date for the weather forecast in YYYY-MM-DD format'),
  }),
})
