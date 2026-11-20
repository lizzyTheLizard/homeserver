import { createHmac } from 'node:crypto'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import type { Mock } from 'vitest'
import { handleInternalWebhook } from './internalWebhook'
import type { Supervisor } from './supervisor'

const { mockWarn } = vi.hoisted(() => ({ mockWarn: vi.fn<(message: string, err?: unknown) => void>() }))

vi.mock('./logger', () => ({ logger: { info: vi.fn(), warn: mockWarn } }))

const secret = 'test-secret'
const chatId = '123@s.whatsapp.net'
const incomingBody = JSON.stringify({ Chat: chatId, FromMe: false })

function sign(payload: string, signingSecret = secret): string {
  return `sha256=${createHmac('sha256', signingSecret).update(payload).digest('hex')}`
}

interface FakeSupervisor {
  supervisor: Supervisor
  isArchived: Mock
  archiveChat: Mock
}

function makeSupervisor(): FakeSupervisor {
  const isArchived = vi.fn().mockResolvedValue(true)
  const archiveChat = vi.fn().mockResolvedValue(undefined)
  const supervisor = {
    userId: 'user@example.com',
    getWebhookSecret: () => secret,
    isArchived,
    archiveChat,
  } as unknown as Supervisor
  return { supervisor, isArchived, archiveChat }
}

describe('handleInternalWebhook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('unarchives a chat for a valid signed incoming message', async () => {
    const { supervisor, isArchived, archiveChat } = makeSupervisor()

    await handleInternalWebhook(supervisor, Buffer.from(incomingBody), sign(incomingBody))

    expect(isArchived).toHaveBeenCalledWith(chatId)
    expect(archiveChat).toHaveBeenCalledWith(chatId, false)
  })

  test('ignores a message the user sent themselves', async () => {
    const { supervisor, isArchived, archiveChat } = makeSupervisor()
    const outgoingBody = JSON.stringify({ Chat: chatId, FromMe: true })

    await handleInternalWebhook(supervisor, outgoingBody, sign(outgoingBody))

    expect(isArchived).not.toHaveBeenCalled()
    expect(archiveChat).not.toHaveBeenCalled()
  })

  test('does not unarchive a chat that is not archived', async () => {
    const { supervisor, isArchived, archiveChat } = makeSupervisor()
    isArchived.mockResolvedValue(false)

    await handleInternalWebhook(supervisor, incomingBody, sign(incomingBody))

    expect(isArchived).toHaveBeenCalledWith(chatId)
    expect(archiveChat).not.toHaveBeenCalled()
  })

  test('ignores a payload without a chat', async () => {
    const { supervisor, isArchived, archiveChat } = makeSupervisor()
    const payload = JSON.stringify({ FromMe: false })

    await handleInternalWebhook(supervisor, payload, sign(payload))

    expect(isArchived).not.toHaveBeenCalled()
    expect(archiveChat).not.toHaveBeenCalled()
  })

  test('rejects a signature computed with a different secret', async () => {
    const { supervisor } = makeSupervisor()

    await expect(handleInternalWebhook(supervisor, incomingBody, sign(incomingBody, 'other-secret')))
      .rejects.toThrow('invalid webhook signature')
  })

  test('rejects a missing, malformed or wrong signature', async () => {
    const { supervisor } = makeSupervisor()

    await expect(handleInternalWebhook(supervisor, incomingBody, undefined)).rejects.toThrow('invalid webhook signature')
    await expect(handleInternalWebhook(supervisor, incomingBody, 'not-a-signature')).rejects.toThrow('invalid webhook signature')
    await expect(handleInternalWebhook(supervisor, incomingBody, 'sha256=zzzz')).rejects.toThrow('invalid webhook signature')
    await expect(handleInternalWebhook(supervisor, incomingBody, `sha256=${'0'.repeat(64)}`)).rejects.toThrow('invalid webhook signature')
  })

  test('rejects an unparsable body with a valid signature', async () => {
    const { supervisor } = makeSupervisor()

    await expect(handleInternalWebhook(supervisor, 'not-json', sign('not-json'))).rejects.toThrow()
  })

  test('coalesces concurrent deliveries for the same chat', async () => {
    const { supervisor, isArchived, archiveChat } = makeSupervisor()
    let resolveArchived: ((value: boolean) => void) | undefined
    isArchived.mockImplementation(() => new Promise<boolean>((resolve) => { resolveArchived = resolve }))

    const first = handleInternalWebhook(supervisor, incomingBody, sign(incomingBody))
    await vi.waitFor(() => { expect(resolveArchived).toBeDefined() })
    await handleInternalWebhook(supervisor, incomingBody, sign(incomingBody))

    resolveArchived?.(true)
    await first

    expect(isArchived).toHaveBeenCalledTimes(1)
    expect(archiveChat).toHaveBeenCalledTimes(1)
  })

  test('logs but does not throw when unarchiving fails', async () => {
    const { supervisor, archiveChat } = makeSupervisor()
    archiveChat.mockRejectedValue(new Error('wacli exited with code 1'))

    await expect(handleInternalWebhook(supervisor, incomingBody, sign(incomingBody))).resolves.toBeUndefined()

    expect(mockWarn).toHaveBeenCalledTimes(1)
    expect(mockWarn.mock.calls[0][0]).toContain('could not auto-unarchive')
  })
})
