import { describe, expect, test } from 'vitest'
import { Temporal } from '@js-temporal/polyfill'
import { getPrecipitationString } from './initial'

function makeHourly(entries: { time: string, condition: string }[]): Record<string, Record<string, unknown>> {
  const hourly: Record<string, Record<string, unknown>> = {}
  for (const { time, condition } of entries) {
    hourly[`2026-07-15T${time}:00`] = { temperature: 20, weather_condition: condition, precipitation: 0.5 }
  }
  return hourly
}

function dt(time: string): Temporal.PlainDateTime {
  return Temporal.PlainDateTime.from(`2026-07-15T${time}:00`)
}

describe('getPrecipitationString', () => {
  test('returns no rain when no precipitation events', () => {
    const hourly = makeHourly([
      { time: '14:00', condition: 'Clear sky' },
      { time: '15:00', condition: 'Partly cloudy' },
      { time: '16:00', condition: 'Overcast' },
    ])
    expect(getPrecipitationString(hourly, dt('14:00'))).toBe('No rain to be expected.')
  })

  test('reports a single precipitation event later', () => {
    const hourly = makeHourly([
      { time: '12:00', condition: 'Clear sky' },
      { time: '13:00', condition: 'Clear sky' },
      { time: '14:00', condition: 'Light rain' },
      { time: '15:00', condition: 'Light rain' },
      { time: '16:00', condition: 'Clear sky' },
    ])
    expect(getPrecipitationString(hourly, dt('12:00'))).toBe('Light rain expected at around 14:00.')
  })

  test('reports continuing until when currently precipitating with clearing', () => {
    const hourly = makeHourly([
      { time: '14:00', condition: 'Light rain' },
      { time: '15:00', condition: 'Light rain' },
      { time: '16:00', condition: 'Clear sky' },
    ])
    expect(getPrecipitationString(hourly, dt('14:00'))).toBe('Light rain is expected to continue until around 16:00.')
  })

  test('reports continuing indefinitely when currently precipitating with no clearing', () => {
    const hourly = makeHourly([
      { time: '14:00', condition: 'Light rain' },
      { time: '15:00', condition: 'Light rain' },
      { time: '16:00', condition: 'Light rain' },
    ])
    expect(getPrecipitationString(hourly, dt('14:00'))).toBe('Light rain is expected to continue.')
  })

  test('reports two events with first starting now', () => {
    const hourly = makeHourly([
      { time: '14:00', condition: 'Light rain' },
      { time: '15:00', condition: 'Light rain' },
      { time: '16:00', condition: 'Clear sky' },
      { time: '17:00', condition: 'Moderate rain' },
      { time: '18:00', condition: 'Moderate rain' },
      { time: '19:00', condition: 'Clear sky' },
    ])
    expect(getPrecipitationString(hourly, dt('14:00'))).toBe('Light rain is expected to continue until around 16:00, then moderate rain afterwards.')
  })

  test('reports two future events', () => {
    const hourly = makeHourly([
      { time: '12:00', condition: 'Clear sky' },
      { time: '13:00', condition: 'Clear sky' },
      { time: '14:00', condition: 'Light rain' },
      { time: '15:00', condition: 'Light rain' },
      { time: '16:00', condition: 'Clear sky' },
      { time: '17:00', condition: 'Heavy rain' },
      { time: '18:00', condition: 'Heavy rain' },
      { time: '19:00', condition: 'Clear sky' },
    ])
    expect(getPrecipitationString(hourly, dt('12:00'))).toBe('Light rain expected at around 14:00 until around 16:00, then heavy rain afterwards.')
  })

  test('reports three events', () => {
    const hourly = makeHourly([
      { time: '12:00', condition: 'Clear sky' },
      { time: '13:00', condition: 'Light rain' },
      { time: '14:00', condition: 'Light rain' },
      { time: '15:00', condition: 'Clear sky' },
      { time: '16:00', condition: 'Moderate rain' },
      { time: '17:00', condition: 'Moderate rain' },
      { time: '18:00', condition: 'Clear sky' },
      { time: '19:00', condition: 'Heavy snow' },
      { time: '20:00', condition: 'Heavy snow' },
      { time: '21:00', condition: 'Clear sky' },
    ])
    expect(getPrecipitationString(hourly, dt('12:00'))).toBe('Light rain expected at around 13:00 until around 15:00, then moderate rain until around 18:00, heavy snow afterwards.')
  })

  test('reports single event with no clearing before end of data', () => {
    const hourly = makeHourly([
      { time: '14:00', condition: 'Clear sky' },
      { time: '15:00', condition: 'Light rain' },
      { time: '16:00', condition: 'Light rain' },
      { time: '17:00', condition: 'Light rain' },
    ])
    expect(getPrecipitationString(hourly, dt('14:00'))).toBe('Light rain expected at around 15:00.')
  })

  test('ignores entries before the current hour', () => {
    const hourly = makeHourly([
      { time: '14:00', condition: 'Light rain' },
      { time: '15:00', condition: 'Clear sky' },
      { time: '16:00', condition: 'Moderate rain' },
    ])
    expect(getPrecipitationString(hourly, dt('15:00'))).toBe('Moderate rain expected at around 16:00.')
  })
})
