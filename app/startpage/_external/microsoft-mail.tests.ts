import { describe, expect, test, beforeAll } from 'vitest'
import { Temporal } from '@js-temporal/polyfill'
import { transactional } from '@/app/shared/_external/db/access'
import { setMicrosoftToken } from '../_data/Microsoft'
import { getInboxMessages, getMessage, searchArchiveMessages, getInboxCount, sendMail, archiveMessage } from './microsoft-mail'
import type { UserSession } from '@/app/shared/auth/auth'

const TEST_MICROSOFT_REFRESH_TOKEN = process.env.TEST_MICROSOFT_REFRESH_TOKEN
const TEST_TO_MAIL_ADDRESS = process.env.TEST_TO_MAIL_ADDRESS

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
    const messages = await getInboxMessages(user)

    expect(Array.isArray(messages)).toBe(true)
    if (messages.length > 0) {
      expect(messages[0]).toHaveProperty('id')
      expect(messages[0]).toHaveProperty('subject')
      expect(messages[0].receivedDateTime).toBeInstanceOf(Temporal.Instant)
      expect(typeof messages[0].isRead).toBe('boolean')
    }
  })

  test('getInboxCount returns counts', async () => {
    const counts = await getInboxCount(user)

    expect(typeof counts.focused).toBe('number')
    expect(typeof counts.focusedUnread).toBe('number')
    expect(typeof counts.other).toBe('number')
    expect(typeof counts.otherUnread).toBe('number')
  })

  test('getMessage returns full message', async () => {
    const messages = await getInboxMessages(user)
    if (messages.length === 0) return

    const message = await getMessage(user, messages[0].id)

    expect(message).toBeDefined()
    if (message) {
      expect(message.id).toBe(messages[0].id)
      expect(message.body).toBeDefined()
      expect(message.body.contentType).toBeDefined()
      expect(message.body.content).toBeDefined()
    }
  })

  test('searchArchiveMessages returns results', async () => {
    const results = await searchArchiveMessages(user, 'test')

    expect(Array.isArray(results)).toBe(true)
  })

  test.skipIf(!TEST_TO_MAIL_ADDRESS)('sendMail sends email and archives it', async () => {
    const uniqueSubject = `Test email ${String(Date.now())}`
    await sendMail(user, [TEST_TO_MAIL_ADDRESS!], uniqueSubject, 'This is an automated test email.')  // eslint-disable-line

    let sent = undefined
    for (let i = 0; i < 15; i++) {
      await new Promise((resolve) => { setTimeout(resolve, 2000) })
      const messages = await getInboxMessages(user)
      sent = messages.find(m => m.subject === uniqueSubject)
      if (sent) break
    }

    if (sent) {
      await archiveMessage(user, sent.id)
    }
    expect(sent).toBeDefined()
  }, 90000)
})
