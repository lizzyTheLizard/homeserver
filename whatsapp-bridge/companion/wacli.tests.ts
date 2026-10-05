import { PassThrough, Readable } from 'node:stream'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import type { Mock } from 'vitest'
import { attachEventParser, runWacli, spawnWacli, type WacliEvent } from './wacli'

const { mockDebug, mockWarn, mockSpawn } = vi.hoisted(() => ({
  mockDebug: vi.fn<(message: string) => void>(),
  mockWarn: vi.fn<(message: string) => void>(),
  mockSpawn: vi.fn(),
}))

vi.mock('./logger', () => ({ logger: { debug: mockDebug, warn: mockWarn } }))
vi.mock('node:child_process', () => ({ spawn: mockSpawn }))

describe('attachEventParser', () => {
  beforeEach(() => {
    vi.resetAllMocks()
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

describe('runWacli', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  test('rejects a second command for the same store without spawning it', async () => {
    const child = makeFakeChild()
    mockSpawn.mockReturnValue(child)
    const first = runWacli('/data/store-shared', ['chats', 'list'], true)
    await expect(runWacli('/data/store-shared', ['messages', 'list'], true)).rejects.toThrow('already running')
    expect(mockSpawn).toHaveBeenCalledTimes(1)
    child.emit('close', 0)
    await expect(first).resolves.toBeNull()
  })

  test('releases the store after a successful command', async () => {
    const first = makeFakeChild()
    const second = makeFakeChild()
    mockSpawn.mockReturnValueOnce(first).mockReturnValueOnce(second)
    const firstRun = runWacli('/data/store-success', ['chats', 'list'], true)
    first.emit('close', 0)
    await expect(firstRun).resolves.toBeNull()
    const secondRun = runWacli('/data/store-success', ['chats', 'list'], true)
    expect(mockSpawn).toHaveBeenCalledTimes(2)
    second.emit('close', 0)
    await expect(secondRun).resolves.toBeNull()
  })

  test('releases the store after a failed command', async () => {
    const first = makeFakeChild()
    const second = makeFakeChild()
    mockSpawn.mockReturnValueOnce(first).mockReturnValueOnce(second)
    const firstRun = runWacli('/data/store-failure', ['chats', 'list'], true)
    first.emit('close', 1)
    await expect(firstRun).rejects.toThrow('exited with code 1')
    const secondRun = runWacli('/data/store-failure', ['chats', 'list'], true)
    expect(mockSpawn).toHaveBeenCalledTimes(2)
    second.emit('close', 0)
    await expect(secondRun).resolves.toBeNull()
  })

  test('accepts concurrent commands for different stores', async () => {
    const first = makeFakeChild()
    const second = makeFakeChild()
    mockSpawn.mockReturnValueOnce(first).mockReturnValueOnce(second)
    const firstRun = runWacli('/data/store-one', ['chats', 'list'], true)
    const secondRun = runWacli('/data/store-two', ['chats', 'list'], true)
    expect(mockSpawn).toHaveBeenCalledTimes(2)
    first.emit('close', 0)
    second.emit('close', 0)
    await expect(Promise.all([firstRun, secondRun])).resolves.toEqual([null, null])
  })
})

describe('spawnWacli', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  test('waits for a running short command before spawning', async () => {
    const short = makeFakeChild()
    const long = makeFakeChild()
    mockSpawn.mockReturnValueOnce(short).mockReturnValueOnce(long)
    const shortRun = runWacli('/data/store-long-wait', ['chats', 'list'], true)
    const spawnPromise = spawnWacli('/data/store-long-wait', ['sync', '--follow'], () => undefined)
    await Promise.resolve()
    expect(mockSpawn).toHaveBeenCalledTimes(1)
    short.emit('close', 0)
    await shortRun
    await expect(spawnPromise).resolves.toBe(long)
    expect(mockSpawn).toHaveBeenCalledTimes(2)
  })

  test('spawns immediately when the store is idle', async () => {
    const long = makeFakeChild()
    mockSpawn.mockReturnValue(long)
    await expect(spawnWacli('/data/store-long-idle', ['sync', '--follow'], () => undefined)).resolves.toBe(long)
    expect(mockSpawn).toHaveBeenCalledTimes(1)
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

interface FakeChild {
  stdout: PassThrough
  stderr: PassThrough
  kill: Mock<() => boolean>
  on: Mock
  emit(event: string, ...args: unknown[]): void
}

// Minimal ChildProcess stand-in: stdout/stderr are real streams and `emit`
// dispatches to the listeners runWacli registers through `on`.
function makeFakeChild(): FakeChild {
  const listeners = new Map<string, ((...args: unknown[]) => void)[]>()
  return {
    stdout: new PassThrough(),
    stderr: new PassThrough(),
    kill: vi.fn<() => boolean>(),
    on: vi.fn().mockImplementation((event: string, listener: (...args: unknown[]) => void) => {
      listeners.set(event, [...(listeners.get(event) ?? []), listener])
    }),
    emit(event: string, ...args: unknown[]): void {
      for (const listener of listeners.get(event) ?? []) listener(...args)
    },
  }
}
