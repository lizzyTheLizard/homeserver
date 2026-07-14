import { describe, expect, test } from 'vitest'
import { Temporal } from '@js-temporal/polyfill'
import { openmeteoRequest, parseOpenMeteoData, shortWeatherOverview } from './openmeteo'

describe('parseOpenMeteoData', () => {
  test('parses daily data', () => {
    const daily = {
      time: ['2025-01-01', '2025-01-02'],
      temperature_2m_max: [10, 12],
      temperature_2m_min: [2, 4],
      sunrise: ['07:30', '07:31'],
      sunset: ['16:45', '16:46'],
      weather_code: [0, 61],
    }
    const result = parseOpenMeteoData(daily)
    expect(result['2025-01-01']).toEqual({
      temperature_2m_max: 10,
      temperature_2m_min: 2,
      sunrise: '07:30',
      sunset: '16:45',
      weather_condition: 'Clear sky',
    })
    expect(result['2025-01-02']).toEqual({
      temperature_2m_max: 12,
      temperature_2m_min: 4,
      sunrise: '07:31',
      sunset: '16:46',
      weather_condition: 'Light rain',
    })
  })

  test('parses hourly data with temperature mapping', () => {
    const hourly = {
      time: ['2025-01-01T00:00'],
      temperature_2m: [5],
      precipitation: [0.2],
      weather_code: [3],
    }
    const result = parseOpenMeteoData(hourly)
    expect(result['2025-01-01T00:00']).toEqual({
      temperature: 5,
      precipitation: 0.2,
      weather_condition: 'Overcast',
    })
  })

  test('throws for invalid input', () => {
    expect(() => parseOpenMeteoData(null)).toThrow('Invalid Open-Meteo data format')
    expect(() => parseOpenMeteoData('string')).toThrow('Invalid Open-Meteo data format')
    expect(() => parseOpenMeteoData({})).toThrow('Invalid Open-Meteo data format: missing time array')
  })
})

describe('shortWeatherOverview', () => {
  test('should return a weather overview for Berlin', async () => {
    const result = await shortWeatherOverview(52.52, 13.405) as Record<string, unknown>
    expect(result).toBeDefined()
    expect(result.sunrise).toBeDefined()
    expect(result.sunset).toBeDefined()
    expect(result.current).toBeDefined()
    expect(result.midday).toBeDefined()
    expect(result.evening).toBeDefined()
    expect(result.tomorrowMorning).toBeDefined()
    expect(result.tomorrowMidday).toBeDefined()
    expect(result.tomorrowEvening).toBeDefined()
  })
})

describe('openmeteoRequest', () => {
  test('should return a valid 5-day daily forecast via openmeteoRequest and parseOpenMeteoData', async () => {
    const today = Temporal.Now.plainDateISO()
    const tomorrow = today.add({ days: 1 })
    const endDate = today.add({ days: 4 }).toString()
    const params = { daily: 'weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,wind_direction_10m_dominant', start_date: today.toString(), end_date: endDate }
    const data = await openmeteoRequest(52.52, 13.404, params)
    const parsedResult = parseOpenMeteoData(data.daily)

    expect(typeof parsedResult).toBe('object')
    expect(parsedResult[today.toString()]).toEqual({
      temperature_2m_max: expect.any(Number) as number,
      temperature_2m_min: expect.any(Number) as number,
      sunrise: expect.any(String) as string,
      sunset: expect.any(String) as string,
      precipitation_sum: expect.any(Number) as number,
      precipitation_probability_max: expect.any(Number) as number,
      wind_speed_10m_max: expect.any(Number) as number,
      wind_direction_10m_dominant: expect.any(Number) as number,
      weather_condition: expect.any(String) as string,
    })
    expect(parsedResult[tomorrow.toString()]).toEqual({
      temperature_2m_max: expect.any(Number) as number,
      temperature_2m_min: expect.any(Number) as number,
      sunrise: expect.any(String) as string,
      sunset: expect.any(String) as string,
      precipitation_sum: expect.any(Number) as number,
      precipitation_probability_max: expect.any(Number) as number,
      wind_speed_10m_max: expect.any(Number) as number,
      wind_direction_10m_dominant: expect.any(Number) as number,
      weather_condition: expect.any(String) as string,
    })
    expect(Object.keys(parsedResult).length).toBe(5)
  })
})
