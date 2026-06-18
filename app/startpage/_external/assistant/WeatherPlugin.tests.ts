/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { describe, expect, test } from 'vitest'
import { detailedWeatherTool, weatherForcastTool } from './WeatherPlugin'
import { Temporal } from '@js-temporal/polyfill'

describe('weatherForcastTool', () => {
  test('should return a valid weather forecast', async () => {
    const today = Temporal.Now.plainDateISO()
    const tomorrow = today.add({ days: 1 })
    const result = await weatherForcastTool.execute({ startDay: today.toString(), latitude: 52.52, longitude: 13.405 })
    const parsedResult = JSON.parse(result) as Record<string, Record<string, unknown>>
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
    const result = await detailedWeatherTool.execute({ date: today.toString(), latitude: 52.52, longitude: 13.405 })
    const parsedResult = JSON.parse(result) as Record<string, Record<string, unknown>>
    expect(parsedResult).toBeDefined()
    expect(typeof parsedResult).toBe('object')
    expect(parsedResult.sunrise).toBeDefined()
    expect(parsedResult.sunset).toBeDefined()
    expect(parsedResult[today.toString() + 'T00:00']).toEqual({
      temperature_2m: expect.any(Number),
      relative_humidity_2m: expect.any(Number),
      precipitation: expect.any(Number),
      precipitation_probability: expect.any(Number),
      cloud_cover: expect.any(Number),
      wind_speed_10m: expect.any(Number),
      wind_direction_10m: expect.any(Number),
      weather_condition: expect.any(String),
    })
    expect(parsedResult[today.toString() + 'T23:00']).toEqual({
      temperature_2m: expect.any(Number),
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
