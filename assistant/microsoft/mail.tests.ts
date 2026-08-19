import { describe, expect, test, beforeAll } from 'vitest'
import { Temporal } from '@js-temporal/polyfill'
import { transactional } from '@/app/shared/_external/db/access'
import { setMicrosoftToken } from './data'
import { getMicrosoftMailWorker } from './mail'
import type { UserSession } from '@/app/shared/auth/session'

const TEST_MICROSOFT_REFRESH_TOKEN = process.env.TEST_MICROSOFT_REFRESH_TOKEN

describe.skipIf(!TEST_MICROSOFT_REFRESH_TOKEN)('microsoft-mail', () => {
  const token = TEST_MICROSOFT_REFRESH_TOKEN!  // eslint-disable-line
  let user: UserSession

  beforeAll(async () => {
    user = { name: 'Test', email: 'mail-test@test.com', applications: ['startpage'] }
    await transactional(db => setMicrosoftToken(db, user.email, {
      access_token: '',
      refresh_token: token,
      expires_at: 0,
    }))
  })

  test('getInboxMessages returns messages', async () => {
    const worker = await getMicrosoftMailWorker(user)
    const messages = worker.getInboxMessages()

    expect(Array.isArray(messages)).toBe(true)
    if (messages.length > 0) {
      expect(messages[0]).toHaveProperty('id')
      expect(messages[0]).toHaveProperty('subject')
      expect(messages[0].receivedDateTime).toBeInstanceOf(Temporal.Instant)
      expect(typeof messages[0].isRead).toBe('boolean')
    }
  }, 30000)

  test('getInboxCount returns counts', async () => {
    const worker = await getMicrosoftMailWorker(user)
    const counts = worker.getInboxCount()

    expect(typeof counts.focused).toBe('number')
    expect(typeof counts.focusedUnread).toBe('number')
    expect(typeof counts.other).toBe('number')
    expect(typeof counts.otherUnread).toBe('number')
  })

  test('getMessage returns full message', async () => {
    const worker = await getMicrosoftMailWorker(user)
    const messages = worker.getInboxMessages()
    if (messages.length === 0) return

    const message = await worker.getMessage(messages[0].id)

    expect(message).toBeDefined()
    if (message) {
      expect(message.id).toBe(messages[0].id)
      expect(message.body).toBeDefined()
      expect(message.body.contentType).toBeDefined()
      expect(message.body.content).toBeDefined()
    }
  })
})
