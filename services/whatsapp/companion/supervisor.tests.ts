import { type Mock, afterAll, afterEach, beforeAll, beforeEach, describe, expect, test, vi } from 'vitest'
import type { ChildProcess } from 'node:child_process'
import { Supervisor } from './supervisor'
import type { WacliEvent } from './wacli'
import { createHash } from 'node:crypto'
import { promises as fs } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

const { mockRunWacli, mockSpawnWacli } = vi.hoisted(() => ({
  mockRunWacli: vi.fn(),
  mockSpawnWacli: vi.fn(),
}))

const testConfig = vi.hoisted(() => ({
  LOG_LEVEL: 'info',
  NODE_ENV: 'test',
  PORT: 8400,
  WACLI_BIN: 'wacli',
  WACLI_DEVICE_LABEL: 'Gutschi.site (TEST)',
  WACLI_DEVICE_PLATFORM: 'desktop',
  WACLI_SYNC_MAX_DB_SIZE: '100mb',
  WACLI_SYNC_MAX_MESSAGES: '10000',
  WHATSAPP_CHATS_LIMIT: 1000,
  WHATSAPP_CMD_TIMEOUT_MS: 30_000,
  WHATSAPP_DATA_DIR: '/data',
  WHATSAPP_MESSAGES_LIMIT: 5_000,
}))

vi.mock('./config', () => ({ config: testConfig }))
vi.mock('./wacli', () => ({
  runWacli: mockRunWacli as typeof import('./wacli').runWacli,
  spawnWacli: mockSpawnWacli as typeof import('./wacli').spawnWacli,
}))

const userId = 'user@example.com',
 storeDir = join('/data', createHash('sha256').update(userId).digest('hex').slice(0, 32))

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
    emitEvent(event: string, ...args: unknown[]): void {
      for (const listener of listeners.get(event) ?? []) {listener(...args)}
    },
    exitCode: null,
    kill: vi.fn<() => boolean>().mockReturnValue(true),
    once: vi.fn().mockImplementation((event: string, listener: (...args: unknown[]) => void) => {
      listeners.set(event, [...(listeners.get(event) ?? []), listener])
    }),
    signalCode: null,
  }
}

// Returns a session whose handleEvent is assigned by the mocked spawnWacli as
// Soon as the supervisor calls it. Keep the object (not a destructured copy)
// So closures observe the assignment.
function setupSupervisor(): Session {
  const child = makeFakeChild(),
   session: Session = { child, handleEvent: undefined }
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
    if (args[0] === 'auth' && args[1] === 'status') {return Promise.resolve({ authenticated: true })}
    return Promise.resolve(null)
  })
})

afterEach(() => {
  vi.useRealTimers()
  testConfig.WHATSAPP_DATA_DIR = '/data'
})

afterAll(async () => {
  await fs.rm(tempDir, { force: true, recursive: true })
})

describe('Supervisor', () => {
  test('starts in closed state', () => {
    const supervisor = new Supervisor(userId)
    expect(supervisor.getStatus()).toEqual({ type: 'closed' })
  })

  test('starts a sync process when already authenticated', async () => {
    const session = setupSupervisor(),
     supervisor = new Supervisor(userId),
     startPromise = supervisor.start()
    await vi.waitFor(() => { expect(session.handleEvent).toBeDefined() })
    session.handleEvent?.({ event: 'connected' })
    await expect(startPromise).resolves.toEqual({ type: 'connected' })
    expect(mockSpawnWacli).toHaveBeenCalledWith(
      storeDir,
      [
        'sync', '--follow', '--events',
        '--webhook', `http://127.0.0.1:8400/sessions/${userId}/webhook`,
        '--webhook-allow-private', '--webhook-secret', supervisor.getWebhookSecret(),
      ],
      expect.any(Function),
    )
  })

  test('generates a stable per-supervisor webhook secret', () => {
    const first = new Supervisor(userId),
     second = new Supervisor(userId)
    expect(first.getWebhookSecret()).toMatch(/^[0-9a-f]{64}$/)
    expect(first.getWebhookSecret()).toBe(first.getWebhookSecret())
    expect(second.getWebhookSecret()).not.toBe(first.getWebhookSecret())
  })

  test('starts an auth process when not authenticated', async () => {
    mockRunWacli.mockResolvedValue({ authenticated: false })
    const session = setupSupervisor(),
     supervisor = new Supervisor(userId),
     startPromise = supervisor.start()
    await vi.waitFor(() => { expect(session.handleEvent).toBeDefined() })
    session.handleEvent?.({ data: { code: 'QRCODE123' }, event: 'qr_code' })
    await expect(startPromise).resolves.toEqual({ qr: 'QRCODE123', type: 'needAuth' })
    expect(mockSpawnWacli).toHaveBeenCalledWith(storeDir, ['auth', '--events'], expect.any(Function))
  })

  test('starts the session once the long process spawn resolved', async () => {
    const session = setupSupervisor(),
     supervisor = new Supervisor(userId),
     startPromise = supervisor.start()
    await vi.waitFor(() => { expect(session.handleEvent).toBeDefined() })
    session.handleEvent?.({ event: 'connected' })
    await expect(startPromise).resolves.toEqual({ type: 'connected' })
    const stopPromise = supervisor.stop()
    await vi.waitFor(() => { expect(session.child.kill).toHaveBeenCalledWith('SIGTERM') })
    session.child.emitEvent('close')
    await stopPromise
  })

  test('returns the current status when already started', async () => {
    const session = setupSupervisor(),
     supervisor = new Supervisor(userId)
    await startConnected(supervisor, session)
    await expect(supervisor.start()).resolves.toEqual({ type: 'connected' })
    expect(mockSpawnWacli).toHaveBeenCalledTimes(1)
    expect(mockRunWacli).toHaveBeenCalledTimes(1)
  })

  test('rejects the start when wacli reports an error and keeps the session closed', async () => {
    const session = setupSupervisor(),
     supervisor = new Supervisor(userId),
     startPromise = supervisor.start()
    await vi.waitFor(() => { expect(session.handleEvent).toBeDefined() })
    session.handleEvent?.({ data: { message: 'boom' }, event: 'error' })
    await expect(startPromise).rejects.toThrow()
    expect(supervisor.getStatus()).toEqual({ type: 'closed' })
  })

  test('rejects the start on an LTHash mismatch and keeps the session closed', async () => {
    const session = setupSupervisor(),
     supervisor = new Supervisor(userId),
     startPromise = supervisor.start()
    await vi.waitFor(() => { expect(session.handleEvent).toBeDefined() })
    const message = 'warning: app state regular_low hit an LTHash mismatch; requesting recovery snapshot'
    session.handleEvent?.({ data: { code: 'app_state_lthash_mismatch', message, name: 'regular_low' }, event: 'warning' })
    await expect(startPromise).rejects.toThrow()
    expect(supervisor.getStatus()).toEqual({ type: 'closed' })
  })

  test('keeps the session running on an unrelated warning', async () => {
    const session = setupSupervisor(),
     supervisor = new Supervisor(userId),
     startPromise = supervisor.start()
    await vi.waitFor(() => { expect(session.handleEvent).toBeDefined() })
    session.handleEvent?.({ data: { code: 'something_else', message: 'just a warning' }, event: 'warning' })
    expect(supervisor.getStatus()).toEqual({ type: 'closed' })
    session.handleEvent?.({ event: 'connected' })
    await expect(startPromise).resolves.toEqual({ type: 'connected' })
  })

  test('rejects when wacli closes during start', async () => {
    const session = setupSupervisor(),
     supervisor = new Supervisor(userId),
     startPromise = supervisor.start()
    await vi.waitFor(() => { expect(session.handleEvent).toBeDefined() })
    session.handleEvent?.({ event: 'closed' })
    await expect(startPromise).rejects.toThrow('Could not start wacli')
    expect(supervisor.getStatus()).toEqual({ type: 'closed' })
  })

  test('ignores an error reported after the process stopped', async () => {
    const session = setupSupervisor(),
     supervisor = new Supervisor(userId)
    await startConnected(supervisor, session)
    session.handleEvent?.({ event: 'closed' })
    session.handleEvent?.({ data: { message: 'late failure' }, event: 'error' })
    expect(supervisor.getStatus()).toEqual({ type: 'closed' })
  })

  test('stops the child with SIGTERM', async () => {
    const session = setupSupervisor(),
     supervisor = new Supervisor(userId)
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
    const session = setupSupervisor(),
     supervisor = new Supervisor(userId),
     startPromise = supervisor.start()
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
          { jid: '123@s.whatsapp.net', last_message_ts: '2024-01-01T10:00:00Z', name: 'Alice' },
          { jid: '456@s.whatsapp.net', last_message_ts: '2024-01-02T10:00:00Z', name: 'Bob' },
          { jid: 'status@broadcast', last_message_ts: '2024-01-03T10:00:00Z', name: 'Status' },
        ]
      }
      if (args[0] === 'messages') {
        return {
          messages: [
            { ChatJID: '123@s.whatsapp.net', FromMe: false, MsgID: 'm1', Text: 'Hello', Timestamp: '2024-01-01T10:00:00Z' },
          ],
        }
      }
      return { authenticated: true }
    })
    const session = setupSupervisor(),
     supervisor = new Supervisor(userId)
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
            { ChatJID: '123@s.whatsapp.net', FromMe: true, MsgID: 'm1', Text: 'Hi there', Timestamp: '2024-01-01T10:00:00.123Z' },
          ],
        }
      }
      return { authenticated: true }
    })
    const session = setupSupervisor(),
     supervisor = new Supervisor(userId)
    await startConnected(supervisor, session)
    const messages = await supervisor.getMessages('123@s.whatsapp.net')
    expect(messages).toEqual([
      { chatId: '123@s.whatsapp.net', content: 'Hi there', fromMe: true, fromName: 'Me', id: 'm1', messageTimestamp: '2024-01-01T10:00:00Z' },
    ])
    expect(mockRunWacli).toHaveBeenCalledWith(storeDir, ['messages', 'list', '--chat', '123@s.whatsapp.net', '--asc', '--limit', '5000'], true)
  })

  test('getChats rejects when the session is not connected', async () => {
    mockRunWacli.mockResolvedValue({ authenticated: false })
    const session = setupSupervisor(),
     supervisor = new Supervisor(userId),
     startPromise = supervisor.start()
    await vi.waitFor(() => { expect(session.handleEvent).toBeDefined() })
    session.handleEvent?.({ data: { code: 'QR' }, event: 'qr_code' })
    await startPromise
    await expect(supervisor.getChats()).rejects.toThrow('Not connected')
  })

  test('sendMessage delegates to wacli send', async () => {
    const session = setupSupervisor(),
     supervisor = new Supervisor(userId)
    await startConnected(supervisor, session)
    await supervisor.sendMessage('123@s.whatsapp.net', 'Hello')
    expect(mockRunWacli).toHaveBeenCalledWith(storeDir, ['send', 'text', '--to', '123@s.whatsapp.net', '--message', 'Hello', '--post-send-wait', '0'], false)
  })

  test('archiveChat archives and unarchives', async () => {
    const session = setupSupervisor(),
     supervisor = new Supervisor(userId)
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

  test('isArchived reports whether the store has the chat archived', async () => {
    mockRunWacli.mockImplementation((_store: string, args: string[]) => {
      if (args[0] === 'chats' && args[1] === 'show') {return Promise.resolve({ archived: true, jid: '123@s.whatsapp.net' })}
      return Promise.resolve(null)
    })
    const supervisor = new Supervisor(userId)

    await expect(supervisor.isArchived('123@s.whatsapp.net')).resolves.toBe(true)
    expect(mockRunWacli).toHaveBeenCalledWith(storeDir, ['chats', 'show', '--jid', '123@s.whatsapp.net'], true)
  })

  test('isArchived is false for an unarchived or unknown chat', async () => {
    mockRunWacli.mockImplementation((_store: string, args: string[]) => {
      if (args[0] === 'chats' && args[1] === 'show') {return Promise.resolve({ archived: false, jid: '123@s.whatsapp.net' })}
      return Promise.resolve(null)
    })
    const supervisor = new Supervisor(userId)

    await expect(supervisor.isArchived('123@s.whatsapp.net')).resolves.toBe(false)
    await expect(supervisor.isArchived('456@s.whatsapp.net')).resolves.toBe(false)
  })

  test('fullSync runs a one-off sync and returns to closed', async () => {
    let resolveSync: ((value: unknown) => void) | undefined
    mockRunWacli.mockImplementation((_store: string, args: string[]) => {
      if (args[0] === 'sync') {return new Promise((resolve) => { resolveSync = resolve })}
      return { authenticated: true }
    })
    const session = setupSupervisor(),
     supervisor = new Supervisor(userId)
    await startConnected(supervisor, session)
    const fullSyncPromise = supervisor.fullSync()
    await vi.waitFor(() => { expect(session.child.kill).toHaveBeenCalledWith('SIGTERM') })
    session.child.emitEvent('close')
    await fullSyncPromise
    expect(supervisor.getStatus()).toEqual({ type: 'fullsync' })
    expect(mockRunWacli).toHaveBeenCalledWith(storeDir, ['sync', '--once', '--refresh-contacts', '--refresh-groups', '--refresh-channels', '--idle-exit', '10s'], false, 5 * 60 * 1000)
    resolveSync?.(null)
    await vi.waitFor(() => { expect(supervisor.getStatus()).toEqual({ type: 'closed' }) })
  })

  test('fullSync ignores concurrent calls while syncing', async () => {
    mockRunWacli.mockImplementation(async (_store: string, args: string[]) => {
      if (args[0] === 'sync') {return new Promise(() => { /* Never resolves */ })}
      if (args[0] === 'auth') {return { authenticated: true }}
      return null
    })
    const session = setupSupervisor(),
     supervisor = new Supervisor(userId)
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
    const session = setupSupervisor(),
     supervisor = new Supervisor(userId)
    await startConnected(supervisor, session)
    const disconnectPromise = supervisor.disconnect()
    await vi.waitFor(() => { expect(session.child.kill).toHaveBeenCalledWith('SIGTERM') })
    session.child.emitEvent('close')
    await disconnectPromise
    expect(mockRunWacli).toHaveBeenCalledWith(storeDirForUser, ['auth', 'logout'], false)
    await expect(fs.access(storeDirForUser)).rejects.toThrow()
    expect(supervisor.getStatus()).toEqual({ type: 'closed' })
  })

  test('disconnect tolerates a failing logout', async () => {
    mockRunWacli.mockImplementation((_store: string, args: string[]) => {
      if (args[0] === 'auth' && args[1] === 'logout') {return Promise.reject(new Error('logout failed'))}
      if (args[0] === 'auth' && args[1] === 'status') {return Promise.resolve({ authenticated: true })}
      return Promise.resolve(null)
    })
    const dataDir = join(tempDir, 'data-fail')
    testConfig.WHATSAPP_DATA_DIR = dataDir
    const storeDirForUser = join(dataDir, createHash('sha256').update(userId).digest('hex').slice(0, 32))
    await fs.mkdir(storeDirForUser, { recursive: true })
    const session = setupSupervisor(),
     supervisor = new Supervisor(userId)
    await startConnected(supervisor, session)
    const disconnectPromise = supervisor.disconnect()
    await vi.waitFor(() => { expect(session.child.kill).toHaveBeenCalledWith('SIGTERM') })
    session.child.emitEvent('close')
    await expect(disconnectPromise).resolves.toBeUndefined()
    expect(supervisor.getStatus()).toEqual({ type: 'closed' })
    await expect(fs.access(storeDirForUser)).rejects.toThrow()
  })
})
