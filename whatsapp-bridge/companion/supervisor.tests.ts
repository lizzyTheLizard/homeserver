import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test, vi } from 'vitest'
import { createHash } from 'node:crypto'
import { promises as fs } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { ChildProcess } from 'node:child_process'
import type { Mock } from 'vitest'
import { Supervisor } from './supervisor'
import type { WacliEvent } from './wacli'

const { mockRunWacli, mockSpawnWacli } = vi.hoisted(() => ({
  mockRunWacli: vi.fn(),
  mockSpawnWacli: vi.fn(),
}))

const testConfig = vi.hoisted(() => ({
  NODE_ENV: 'test',
  LOG_LEVEL: 'info',
  PORT: 8400,
  WHATSAPP_DATA_DIR: '/data',
  WACLI_BIN: 'wacli',
  WACLI_DEVICE_PLATFORM: 'desktop',
  WACLI_DEVICE_LABEL: 'Gutschi.site (TEST)',
  WHATSAPP_CMD_TIMEOUT_MS: 30_000,
  WHATSAPP_CHATS_LIMIT: 1000,
  WHATSAPP_MESSAGES_LIMIT: 5_000,
  WACLI_SYNC_MAX_MESSAGES: '10000',
  WACLI_SYNC_MAX_DB_SIZE: '100mb',
}))

vi.mock('./config', () => ({ config: testConfig }))
vi.mock('./wacli', () => ({
  runWacli: mockRunWacli as typeof import('./wacli').runWacli,
  spawnWacli: mockSpawnWacli as typeof import('./wacli').spawnWacli,
}))

const userId = 'user@example.com'
const storeDir = join('/data', createHash('sha256').update(userId).digest('hex').slice(0, 32))

interface FakeChild {
  exitCode: number | null
  signalCode: NodeJS.Signals | null
  kill: Mock<() => boolean>
  once: Mock
  emitEvent(event: string, ...args: unknown[]): void
}

interface Session {
  child: FakeChild
  handleEvent: ((event: WacliEvent) => void) | undefined
}

function makeFakeChild(): FakeChild {
  const listeners = new Map<string, ((...args: unknown[]) => void)[]>()
  return {
    exitCode: null,
    signalCode: null,
    kill: vi.fn<() => boolean>().mockReturnValue(true),
    once: vi.fn().mockImplementation((event: string, listener: (...args: unknown[]) => void) => {
      listeners.set(event, [...(listeners.get(event) ?? []), listener])
    }),
    emitEvent(event: string, ...args: unknown[]): void {
      for (const listener of listeners.get(event) ?? []) listener(...args)
    },
  }
}

// Returns a session whose handleEvent is assigned by the mocked spawnWacli as
// soon as the supervisor calls it. Keep the object (not a destructured copy)
// so closures observe the assignment.
function setupSupervisor(): Session {
  const child = makeFakeChild()
  const session: Session = { child, handleEvent: undefined }
  mockSpawnWacli.mockImplementation((_store: string, _args: string[], onEvent: (event: WacliEvent) => void): ChildProcess => {
    session.handleEvent = onEvent
    return child as unknown as ChildProcess
  })
  return session
}

async function startConnected(supervisor: Supervisor, session: Session): Promise<void> {
  const startPromise = supervisor.start()
  await vi.waitFor(() => { expect(session.handleEvent).toBeDefined() })
  session.handleEvent?.({ event: 'connected' })
  await startPromise
}

let tempDir: string

beforeAll(async () => {
  tempDir = await fs.mkdtemp(join(tmpdir(), 'wa-bridge-test-'))
})

beforeEach(() => {
  vi.clearAllMocks()
  mockRunWacli.mockImplementation((_store: string, args: string[]) => {
    if (args[0] === 'auth' && args[1] === 'status') return Promise.resolve({ authenticated: true })
    return Promise.resolve(null)
  })
})

afterEach(() => {
  vi.useRealTimers()
  testConfig.WHATSAPP_DATA_DIR = '/data'
})

afterAll(async () => {
  await fs.rm(tempDir, { recursive: true, force: true })
})

describe('Supervisor', () => {
  test('starts in connecting state', () => {
    const supervisor = new Supervisor(userId)
    expect(supervisor.getStatus()).toEqual({ type: 'connecting' })
  })

  test('starts a sync process when already authenticated', async () => {
    const session = setupSupervisor()
    const supervisor = new Supervisor(userId)
    const startPromise = supervisor.start()
    await vi.waitFor(() => { expect(session.handleEvent).toBeDefined() })
    session.handleEvent?.({ event: 'connected' })
    await expect(startPromise).resolves.toEqual({ type: 'connected' })
    expect(mockSpawnWacli).toHaveBeenCalledWith(storeDir, ['sync', '--follow', '--events'], expect.any(Function))
  })

  test('starts an auth process when not authenticated', async () => {
    mockRunWacli.mockResolvedValue({ authenticated: false })
    const session = setupSupervisor()
    const supervisor = new Supervisor(userId)
    const startPromise = supervisor.start()
    await vi.waitFor(() => { expect(session.handleEvent).toBeDefined() })
    session.handleEvent?.({ event: 'qr_code', data: { code: 'QRCODE123' } })
    await expect(startPromise).resolves.toEqual({ type: 'needAuth', qr: 'QRCODE123' })
    expect(mockSpawnWacli).toHaveBeenCalledWith(storeDir, ['auth', '--events'], expect.any(Function))
  })

  test('returns the current status when already started', async () => {
    const session = setupSupervisor()
    const supervisor = new Supervisor(userId)
    await startConnected(supervisor, session)
    await expect(supervisor.start()).resolves.toEqual({ type: 'connected' })
    expect(mockSpawnWacli).toHaveBeenCalledTimes(1)
    expect(mockRunWacli).toHaveBeenCalledTimes(1)
  })

  test('rejects when wacli reports an error during start', async () => {
    const session = setupSupervisor()
    const supervisor = new Supervisor(userId)
    const startPromise = supervisor.start()
    await vi.waitFor(() => { expect(session.handleEvent).toBeDefined() })
    session.handleEvent?.({ event: 'error', data: { message: 'boom' } })
    await expect(startPromise).rejects.toThrow()
    expect(supervisor.getStatus()).toEqual({ type: 'closed', error: 'boom' })
  })

  test('rejects when wacli closes during start', async () => {
    const session = setupSupervisor()
    const supervisor = new Supervisor(userId)
    const startPromise = supervisor.start()
    await vi.waitFor(() => { expect(session.handleEvent).toBeDefined() })
    session.handleEvent?.({ event: 'closed' })
    await expect(startPromise).rejects.toThrow('status is now closed')
    expect(supervisor.getStatus()).toEqual({ type: 'closed' })
  })

  test('stops the child with SIGTERM', async () => {
    const session = setupSupervisor()
    const supervisor = new Supervisor(userId)
    await startConnected(supervisor, session)
    const stopPromise = supervisor.stop()
    await vi.waitFor(() => { expect(session.child.kill).toHaveBeenCalledWith('SIGTERM') })
    session.child.emitEvent('close')
    await stopPromise
    expect(supervisor.getStatus()).toEqual({ type: 'closed' })
  })

  test('stop is a no-op when nothing is running', async () => {
    const supervisor = new Supervisor(userId)
    await expect(supervisor.stop()).resolves.toBeUndefined()
    expect(mockSpawnWacli).not.toHaveBeenCalled()
  })

  test('force-kills the child when it does not close in time', async () => {
    vi.useFakeTimers()
    const session = setupSupervisor()
    const supervisor = new Supervisor(userId)
    const startPromise = supervisor.start()
    await vi.advanceTimersByTimeAsync(0)
    session.handleEvent?.({ event: 'connected' })
    await vi.advanceTimersByTimeAsync(0)
    await startPromise
    const stopPromise = supervisor.stop()
    await vi.advanceTimersByTimeAsync(0)
    expect(session.child.kill).toHaveBeenCalledWith('SIGTERM')
    await vi.advanceTimersByTimeAsync(5001)
    expect(session.child.kill).toHaveBeenCalledWith('SIGKILL')
    await expect(stopPromise).resolves.toBeUndefined()
  })

  test('getChats returns only chats that have messages', async () => {
    mockRunWacli.mockImplementation((_store: string, args: string[]) => {
      if (args[0] === 'chats') {
        return [
          { jid: '123@s.whatsapp.net', name: 'Alice', last_message_ts: '2024-01-01T10:00:00Z' },
          { jid: '456@s.whatsapp.net', name: 'Bob', last_message_ts: '2024-01-02T10:00:00Z' },
          { jid: 'status@broadcast', name: 'Status', last_message_ts: '2024-01-03T10:00:00Z' },
        ]
      }
      if (args[0] === 'messages') {
        return {
          messages: [
            { MsgID: 'm1', ChatJID: '123@s.whatsapp.net', FromMe: false, Text: 'Hello', Timestamp: '2024-01-01T10:00:00Z' },
          ],
        }
      }
      return { authenticated: true }
    })
    const session = setupSupervisor()
    const supervisor = new Supervisor(userId)
    await startConnected(supervisor, session)
    const chats = await supervisor.getChats()
    expect(chats).toHaveLength(1)
    expect(chats[0]).toMatchObject({ id: '123@s.whatsapp.net', name: 'Alice' })
    expect(mockRunWacli).toHaveBeenCalledWith(storeDir, ['chats', 'list', '--limit', '1000'], true)
    expect(mockRunWacli).toHaveBeenCalledWith(storeDir, ['messages', 'list', '--asc', '--limit', '5000'], true)
  })

  test('getMessages lists messages for a chat', async () => {
    mockRunWacli.mockImplementation((_store: string, args: string[]) => {
      if (args.includes('--chat')) {
        return {
          messages: [
            { MsgID: 'm1', ChatJID: '123@s.whatsapp.net', FromMe: true, Text: 'Hi there', Timestamp: '2024-01-01T10:00:00.123Z' },
          ],
        }
      }
      return { authenticated: true }
    })
    const session = setupSupervisor()
    const supervisor = new Supervisor(userId)
    await startConnected(supervisor, session)
    const messages = await supervisor.getMessages('123@s.whatsapp.net')
    expect(messages).toEqual([
      { id: 'm1', chatId: '123@s.whatsapp.net', fromMe: true, fromName: 'Me', content: 'Hi there', messageTimestamp: '2024-01-01T10:00:00Z' },
    ])
    expect(mockRunWacli).toHaveBeenCalledWith(storeDir, ['messages', 'list', '--chat', '123@s.whatsapp.net', '--asc', '--limit', '5000'], true)
  })

  test('getChats rejects when the session is not connected', async () => {
    mockRunWacli.mockResolvedValue({ authenticated: false })
    const session = setupSupervisor()
    const supervisor = new Supervisor(userId)
    const startPromise = supervisor.start()
    await vi.waitFor(() => { expect(session.handleEvent).toBeDefined() })
    session.handleEvent?.({ event: 'qr_code', data: { code: 'QR' } })
    await startPromise
    await expect(supervisor.getChats()).rejects.toThrow('Not connected')
  })

  test('sendMessage delegates to wacli send', async () => {
    const session = setupSupervisor()
    const supervisor = new Supervisor(userId)
    await startConnected(supervisor, session)
    await supervisor.sendMessage('123@s.whatsapp.net', 'Hello')
    expect(mockRunWacli).toHaveBeenCalledWith(storeDir, ['send', 'text', '--to', '123@s.whatsapp.net', '--message', 'Hello', '--post-send-wait', '0'], false)
  })

  test('archiveChat archives and unarchives', async () => {
    const session = setupSupervisor()
    const supervisor = new Supervisor(userId)
    await startConnected(supervisor, session)
    const archivePromise = supervisor.archiveChat('123@s.whatsapp.net', true)
    await vi.waitFor(() => { expect(session.child.kill).toHaveBeenCalledWith('SIGTERM') })
    session.child.emitEvent('close')
    await archivePromise
    expect(mockRunWacli).toHaveBeenCalledWith(storeDir, ['chats', 'archive', '--chat', '123@s.whatsapp.net'], false)

    const unarchivePromise = supervisor.archiveChat('456@s.whatsapp.net', false)
    await vi.waitFor(() => { expect(session.child.kill).toHaveBeenCalledWith('SIGTERM') })
    session.child.emitEvent('close')
    await unarchivePromise
    expect(mockRunWacli).toHaveBeenCalledWith(storeDir, ['chats', 'unarchive', '--chat', '456@s.whatsapp.net'], false)
  })

  test('fullSync runs a one-off sync and returns to connecting', async () => {
    let resolveSync: ((value: unknown) => void) | undefined
    mockRunWacli.mockImplementation((_store: string, args: string[]) => {
      if (args[0] === 'sync') return new Promise((resolve) => { resolveSync = resolve })
      return { authenticated: true }
    })
    const session = setupSupervisor()
    const supervisor = new Supervisor(userId)
    await startConnected(supervisor, session)
    const fullSyncPromise = supervisor.fullSync()
    await vi.waitFor(() => { expect(session.child.kill).toHaveBeenCalledWith('SIGTERM') })
    session.child.emitEvent('close')
    await fullSyncPromise
    expect(supervisor.getStatus()).toEqual({ type: 'fullsync' })
    expect(mockRunWacli).toHaveBeenCalledWith(storeDir, ['sync', '--once', '--refresh-contacts', '--refresh-groups', '--refresh-channels', '--idle-exit', '10s'], false, 5 * 60 * 1000)
    resolveSync?.(null)
    await vi.waitFor(() => { expect(supervisor.getStatus()).toEqual({ type: 'connecting' }) })
  })

  test('fullSync ignores concurrent calls while syncing', async () => {
    mockRunWacli.mockImplementation(async (_store: string, args: string[]) => {
      if (args[0] === 'sync') return new Promise(() => { /* never resolves */ })
      if (args[0] === 'auth') return { authenticated: true }
      return null
    })
    const session = setupSupervisor()
    const supervisor = new Supervisor(userId)
    await startConnected(supervisor, session)
    const first = supervisor.fullSync()
    await vi.waitFor(() => { expect(session.child.kill).toHaveBeenCalledWith('SIGTERM') })
    session.child.emitEvent('close')
    await first
    expect(supervisor.getStatus()).toEqual({ type: 'fullsync' })
    await supervisor.fullSync()
    const syncCalls = mockRunWacli.mock.calls.filter(call => (call as string[][])[1][0] === 'sync')
    expect(syncCalls).toHaveLength(1)
  })

  test('disconnect logs out and removes the store directory', async () => {
    const dataDir = join(tempDir, 'data')
    testConfig.WHATSAPP_DATA_DIR = dataDir
    const storeDirForUser = join(dataDir, createHash('sha256').update(userId).digest('hex').slice(0, 32))
    await fs.mkdir(storeDirForUser, { recursive: true })
    const supervisor = new Supervisor(userId)
    await supervisor.disconnect()
    expect(mockRunWacli).toHaveBeenCalledWith(storeDirForUser, ['auth', 'logout'], false)
    await expect(fs.access(storeDirForUser)).rejects.toThrow()
    expect(supervisor.getStatus()).toEqual({ type: 'connecting' })
  })

  test('disconnect tolerates a failing logout', async () => {
    mockRunWacli.mockRejectedValue(new Error('logout failed'))
    const dataDir = join(tempDir, 'data-fail')
    testConfig.WHATSAPP_DATA_DIR = dataDir
    const storeDirForUser = join(dataDir, createHash('sha256').update(userId).digest('hex').slice(0, 32))
    await fs.mkdir(storeDirForUser, { recursive: true })
    const supervisor = new Supervisor(userId)
    await expect(supervisor.disconnect()).resolves.toBeUndefined()
    expect(supervisor.getStatus()).toEqual({ type: 'connecting' })
    await expect(fs.access(storeDirForUser)).rejects.toThrow()
  })
})
