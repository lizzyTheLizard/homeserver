import { beforeEach, describe, expect, test, vi } from 'vitest'
import { Temporal } from '@js-temporal/polyfill'

const mocks = vi.hoisted(() => ({
  getCurrentToken: vi.fn(),
  mailWorker: vi.fn(),
  todoWorker: vi.fn(),
  calendarWorker: vi.fn(),
}))

vi.mock('@/app/shared/logger', () => ({ logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() } }))
vi.mock('@/app/startpage/microsoft/_external/graph', () => ({ getCurrentToken: mocks.getCurrentToken }))
vi.mock('@/app/startpage/microsoft/_external/mail', () => ({ getMicrosoftMailWorker: mocks.mailWorker }))
vi.mock('@/app/startpage/microsoft/_external/todo', () => ({ getMicrosoftTodoWorker: mocks.todoWorker }))
vi.mock('@/app/startpage/microsoft/_external/calendar', () => ({ getMicrosoftCalendarWorker: mocks.calendarWorker }))
vi.mock('@/app/startpage/whatsapp/_external/whatsapp', () => ({
  ensureWhatsappStarted: vi.fn(),
  getWhatsappStatus: vi.fn(() => Promise.resolve({ type: 'closed' })),
  getWhatsappChats: vi.fn(),
}))
vi.mock('@/app/startpage/assistant/_external/openstreetmap', () => ({ getLocationDescription: vi.fn(() => Promise.resolve('Zurich')) }))
vi.mock('@/app/startpage/assistant/_external/openmeteo', async () => {
  const { Temporal: T } = await import('@js-temporal/polyfill')
  return {
    openmeteoRequest: vi.fn(() => {
      const today = T.Now.plainDateISO().toString()
      const hourly: Record<string, unknown> = {}
      for (let hour = 0; hour < 24; hour++)
        hourly[`${today}T${String(hour).padStart(2, '0')}:00`] = { temperature: 12, weather_condition: 'Clear sky', precipitation: 0 }
      return Promise.resolve({ daily: { [today]: { sunrise: `${today}T06:00`, sunset: `${today}T20:00` } }, hourly })
    }),
    parseOpenMeteoData: (data: unknown) => data,
  }
})

import { generateInitialMessages, getPrecipitationString } from './initial'

function makeHourly(entries: { time: string; condition: string }[]): Record<string, Record<string, unknown>> {
  const hourly: Record<string, Record<string, unknown>> = {}
  for (const { time, condition } of entries) hourly[`2026-07-15T${time}:00`] = { temperature: 20, weather_condition: condition, precipitation: 0.5 }

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
    expect(getPrecipitationString(hourly, dt('12:00'))).toBe(
      'Light rain expected at around 13:00 until around 15:00, then moderate rain until around 18:00, heavy snow afterwards.',
    )
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

describe('generateInitialMessages Microsoft part', () => {
  const user = { name: 'A', email: 'a@test.com', applications: ['startpage'] }
  const context = { location: { lat: 47, lon: 8 } }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  async function openingMessage(): Promise<string> {
    const chunks: string[] = []
    await generateInitialMessages(user, context, event => {
      if (event.type === 'stream_response') chunks.push(event.chunk)
    })
    return chunks.join('')
  }

  test('without a token it reports not connected at once and does not start the workers', async () => {
    mocks.getCurrentToken.mockResolvedValue(undefined)
    const started = Date.now()

    const message = await openingMessage()

    expect(Date.now() - started).toBeLessThan(1000)
    expect(message).toContain('Microsoft is not connected.')
    expect(message).not.toContain('not connected in time')
    expect(mocks.mailWorker).not.toHaveBeenCalled()
    expect(mocks.todoWorker).not.toHaveBeenCalled()
    expect(mocks.calendarWorker).not.toHaveBeenCalled()
  })

  test('with a token and connected workers it summarizes mail, tasks and events', async () => {
    mocks.getCurrentToken.mockResolvedValue({ access_token: 'a', refresh_token: 'r', expires_at: 1 })
    mocks.mailWorker.mockResolvedValue({ getStatus: () => 'connected', getInboxCount: () => ({ focused: 3, focusedUnread: 1, other: 2 }) })
    mocks.todoWorker.mockResolvedValue({ getStatus: () => 'connected', getTodoCount: () => ({ tasksDueToday: 1, tasksDueRestOfWeek: 2, tasksWithoutDate: 0 }) })
    mocks.calendarWorker.mockResolvedValue({ getStatus: () => 'connected', getEventCount: () => ({ eventsToday: 4, eventsThisWeek: 9 }) })

    const message = await openingMessage()

    expect(message).toContain('**3** focused emails')
    expect(message).toContain('**1** tasks due today')
    expect(message).toContain('**4** events today')
  })
})
