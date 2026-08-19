import { tool, ToolSet } from 'ai'
import { z } from 'zod/v4'
import { Temporal } from '@js-temporal/polyfill'
import { logEvent } from '@/app/shared/_data/Event'
import { logger } from '@/app/shared/logger'
import { openmeteoRequest, parseOpenMeteoData } from './openmeteo'

export default function getTools(): ToolSet {
  return {
    get_detailed_weather: detailedWeatherTool,
    get_weather_forecast: weatherForcastTool,
  }
}

const detailedWeatherTool = tool({
  description: 'Get the detailed weather for a specific location and day',
  inputSchema: z.object({
    date: z.string().describe('Date for the detailed weather in YYYY-MM-DD format'),
    latitude: z.number().describe('Latitude of the location'),
    longitude: z.number().describe('Longitude of the location'),
  }),
  execute: async ({ date, latitude, longitude }) => {
    try {
      const params = { hourly: 'temperature_2m,relative_humidity_2m,precipitation,precipitation_probability,weather_code,cloud_cover,wind_speed_10m,wind_direction_10m', daily: 'sunrise,sunset', start_date: date, end_date: date }
      const data = await openmeteoRequest(latitude, longitude, params)
      const daily = parseOpenMeteoData(data.daily)
      const sunrise = daily[date].sunrise
      const sunset = daily[date].sunset
      return JSON.stringify({ sunrise, sunset, ...parseOpenMeteoData(data.hourly) })
    }
    catch (error) {
      logger.warn('Could not get detailed weather', error)
      await logEvent(undefined, 'WARN', `Could not get detailed weather for ${date} at (${latitude.toString()}, ${longitude.toString()})`)
      throw error
    }
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
    try {
      const endDate = Temporal.PlainDate.from(startDay).add({ days: 4 }).toString()
      const params = { daily: 'weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,wind_direction_10m_dominant', start_date: startDay, end_date: endDate }
      const data = await openmeteoRequest(latitude, longitude, params)
      return JSON.stringify(parseOpenMeteoData(data.daily))
    }
    catch (error) {
      logger.warn('Could not get weather forecast', error)
      await logEvent(undefined, 'WARN', `Could not get weather forecast for ${startDay} at (${latitude.toString()}, ${longitude.toString()})`)
      throw error
    }
  },
})
