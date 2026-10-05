import { Readable } from 'node:stream'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { attachEventParser, type WacliEvent } from './wacli'

const { mockDebug, mockWarn } = vi.hoisted(() => ({
  mockDebug: vi.fn<(message: string) => void>(),
  mockWarn: vi.fn<(message: string) => void>(),
}))

vi.mock('./logger', () => ({ logger: { debug: mockDebug, warn: mockWarn } }))

describe('attachEventParser', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('logs a warning event at warn level with its code and message', async () => {
    const warning = {
      event: 'warning',
      data: {
        code: 'app_state_lthash_mismatch',
        message: 'warning: app state regular_low hit an LTHash mismatch; requesting recovery snapshot',
        name: 'regular_low',
      },
      ts: 1791178646317,
    }
    const events = await parseEvents([JSON.stringify(warning)])
    expect(mockWarn).toHaveBeenCalledTimes(1)
    expect(mockWarn.mock.calls[0][0]).toContain('app_state_lthash_mismatch')
    expect(mockWarn.mock.calls[0][0]).toContain('hit an LTHash mismatch')
    expect(mockDebug).not.toHaveBeenCalled()
    expect(events).toEqual([warning])
  })

  test('logs a non-warning event at debug level and not as a warning', async () => {
    const events = await parseEvents([JSON.stringify({ event: 'connected' })])
    expect(mockWarn).not.toHaveBeenCalled()
    expect(mockDebug).toHaveBeenCalledTimes(1)
    expect(events).toEqual([{ event: 'connected' }])
  })
})

async function parseEvents(lines: string[]): Promise<WacliEvent[]> {
  const stream = Readable.from(lines.map(line => line + '\n'))
  const events: WacliEvent[] = []
  attachEventParser(stream, (event) => { events.push(event) })
  await new Promise<void>((resolve) => {
    stream.on('end', () => { resolve() })
  })
  return events
}
