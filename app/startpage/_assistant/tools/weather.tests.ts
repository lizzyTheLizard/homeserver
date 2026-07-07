/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { describe, expect, test } from 'vitest'
import { getWeatherTools } from './weather'
import { Temporal } from '@js-temporal/polyfill'

const executionOptions = { toolCallId: 'test', messages: [], context: {} }
const weatherTools = getWeatherTools()

describe('weatherForcastTool', () => {
  test('should return a valid weather forecast', async () => {
    const today = Temporal.Now.plainDateISO()
    const tomorrow = today.add({ days: 1 })
    const execute = weatherTools.get_weather_forecast.execute
    const result = await execute({ startDay: today.toString(), latitude: 52.52, longitude: 13.404 }, executionOptions)
    const parsedResult = JSON.parse(result as string) as Record<string, Record<string, unknown>>
    expect(parsedResult).toBeDefined()
    expect(typeof parsedResult).toBe('object')
    expect(parsedResult[today.toString()]).toEqual({
      temperature_2m_max: expect.any(Number),
      temperature_2m_min: expect.any(Number),
      sunrise: expect.any(String),
      sunset: expect.any(String),
      precipitation_sum: expect.any(Number),
      precipitation_probability_max: expect.any(Number),
      wind_speed_10m_max: expect.any(Number),
      wind_direction_10m_dominant: expect.any(Number),
      weather_condition: expect.any(String),
    })
    expect(parsedResult[tomorrow.toString()]).toEqual({
      temperature_2m_max: expect.any(Number),
      temperature_2m_min: expect.any(Number),
      sunrise: expect.any(String),
      sunset: expect.any(String),
      precipitation_sum: expect.any(Number),
      precipitation_probability_max: expect.any(Number),
      wind_speed_10m_max: expect.any(Number),
      wind_direction_10m_dominant: expect.any(Number),
      weather_condition: expect.any(String),
    })
    expect(Object.keys(parsedResult).length).toBe(5)
  })
})

describe('detailedWeatherTool', () => {
  test('should return a valid daily weather detail', async () => {
    const today = Temporal.Now.plainDateISO()
    const execute = weatherTools.get_detailed_weather.execute
    const result = await execute({ date: today.toString(), latitude: 52.52, longitude: 13.405 }, executionOptions)
    const parsedResult = JSON.parse(result as string) as Record<string, Record<string, unknown>>
    expect(parsedResult).toBeDefined()
    expect(typeof parsedResult).toBe('object')
    expect(parsedResult.sunrise).toBeDefined()
    expect(parsedResult.sunset).toBeDefined()
    expect(parsedResult[today.toString() + 'T00:00']).toEqual({
      temperature: expect.any(Number),
      relative_humidity_2m: expect.any(Number),
      precipitation: expect.any(Number),
      precipitation_probability: expect.any(Number),
      cloud_cover: expect.any(Number),
      wind_speed_10m: expect.any(Number),
      wind_direction_10m: expect.any(Number),
      weather_condition: expect.any(String),
    })
    expect(parsedResult[today.toString() + 'T23:00']).toEqual({
      temperature: expect.any(Number),
      relative_humidity_2m: expect.any(Number),
      precipitation: expect.any(Number),
      precipitation_probability: expect.any(Number),
      cloud_cover: expect.any(Number),
      wind_speed_10m: expect.any(Number),
      wind_direction_10m: expect.any(Number),
      weather_condition: expect.any(String),
    })
    expect(Object.keys(parsedResult).length).toBe(26)
  })
})
