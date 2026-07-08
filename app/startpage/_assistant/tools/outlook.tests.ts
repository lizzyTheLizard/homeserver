import { describe, expect, test, vi, beforeEach } from 'vitest'
import { type UserSession } from '@/app/shared/auth/auth'
import * as microsoft from '../../_external/microsoft'
import { getOutlookTools, getOutlookContext } from './outlook'

vi.mock('../../_external/microsoft', async () => {
  const actual = await vi.importActual('../../_external/microsoft')
  return {
    ...actual,
    getInboxMessages: vi.fn(),
    getMessage: vi.fn(),
    searchArchiveMessages: vi.fn(),
    sendMail: vi.fn(),
    archiveMessage: vi.fn(),
    getUnreadInboxCount: vi.fn(),
  }
})

const executionOptions = { toolCallId: 'test', messages: [], context: {} }
const testUser: UserSession = { name: 'Test User', email: 'test@test.com', applications: ['startpage'] }

const inboxMessages = [
  {
    id: 'mail1', subject: 'Hello from John', from: { emailAddress: { address: 'john@example.com', name: 'John Doe' } },
    toRecipients: [{ emailAddress: { address: 'test@test.com', name: 'Test User' } }],
    receivedDateTime: '2025-07-08T10:00:00Z', isRead: false, bodyPreview: 'Hey, just wanted to check in...',
  },
  {
    id: 'mail2', subject: 'Meeting notes', from: { emailAddress: { address: 'boss@example.com', name: 'Boss' } },
    toRecipients: [{ emailAddress: { address: 'test@test.com', name: 'Test User' } }, { emailAddress: { address: 'colleague@example.com', name: 'Colleague' } }],
    receivedDateTime: '2025-07-07T15:30:00Z', isRead: true, bodyPreview: 'Here are the notes from today\'s meeting...',
  },
]

const fullMessage = {
  id: 'mail1', subject: 'Hello from John', from: { emailAddress: { address: 'john@example.com', name: 'John Doe' } },
  toRecipients: [{ emailAddress: { address: 'test@test.com', name: 'Test User' } }],
  receivedDateTime: '2025-07-08T10:00:00Z', isRead: false, bodyPreview: 'Hey, just wanted to check in...',
  body: { contentType: 'Text', content: 'Hey, just wanted to check in and see how things are going.' },
}

const archiveMessages = [
  {
    id: 'mail3', subject: 'Old newsletter', from: { emailAddress: { address: 'news@example.com', name: 'Newsletter' } },
    toRecipients: [{ emailAddress: { address: 'test@test.com', name: 'Test User' } }],
    receivedDateTime: '2025-01-15T08:00:00Z', isRead: true, bodyPreview: 'Your weekly update...',
  },
]

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(microsoft.getInboxMessages).mockResolvedValue(inboxMessages)
  vi.mocked(microsoft.getMessage).mockResolvedValue(fullMessage)
  vi.mocked(microsoft.searchArchiveMessages).mockResolvedValue(archiveMessages)
  vi.mocked(microsoft.sendMail).mockResolvedValue(undefined)
  vi.mocked(microsoft.archiveMessage).mockResolvedValue(undefined)
  vi.mocked(microsoft.getUnreadInboxCount).mockResolvedValue(3)
})

describe('getOutlookTools', () => {
  const tools = getOutlookTools(testUser)

  describe('get_outlook_inbox', () => {
    test('returns inbox emails with default pagination', async () => {
      const result = await tools.get_outlook_inbox.execute({}, executionOptions) as { id: string, subject: string, isRead: boolean }[]

      expect(result).toHaveLength(2)
      expect(microsoft.getInboxMessages).toHaveBeenCalledWith(testUser, 10, 0)
    })

    test('maps message fields correctly', async () => {
      const result = await tools.get_outlook_inbox.execute({}, executionOptions) as typeof inboxMessages

      expect(result[0].id).toBe('mail1')
      expect(result[0].subject).toBe('Hello from John')
      expect(result[0].from.emailAddress.address).toBe('john@example.com')
      expect(result[0].isRead).toBe(false)
      expect(result[0].bodyPreview).toBe('Hey, just wanted to check in...')
      expect(result[1].isRead).toBe(true)
      expect(result[1].toRecipients).toHaveLength(2)
    })

    test('passes pagination parameters', async () => {
      await tools.get_outlook_inbox.execute({ top: 5, skip: 10 }, executionOptions)

      expect(microsoft.getInboxMessages).toHaveBeenCalledWith(testUser, 5, 10)
    })
  })

  describe('get_outlook_mail', () => {
    test('returns full email by ID', async () => {
      const result = await tools.get_outlook_mail.execute({ mailId: 'mail1' }, executionOptions)

      expect(microsoft.getMessage).toHaveBeenCalledWith(testUser, 'mail1')
      expect(result).toHaveProperty('body')
      expect((result as typeof fullMessage).body.content).toBe('Hey, just wanted to check in and see how things are going.')
    })

    test('throws when email not found', async () => {
      vi.mocked(microsoft.getMessage).mockResolvedValue(undefined)

      await expect(tools.get_outlook_mail.execute({ mailId: 'nonexistent' }, executionOptions))
        .rejects.toThrow('Email with ID nonexistent not found')
    })
  })

  describe('search_outlook_archive', () => {
    test('searches archived emails with query', async () => {
      const result = await tools.search_outlook_archive.execute({ query: 'newsletter' }, executionOptions) as typeof archiveMessages

      expect(microsoft.searchArchiveMessages).toHaveBeenCalledWith(testUser, 'newsletter', 20)
      expect(result).toHaveLength(1)
      expect(result[0].subject).toBe('Old newsletter')
    })

    test('passes top parameter', async () => {
      await tools.search_outlook_archive.execute({ query: 'meeting', top: 5 }, executionOptions)

      expect(microsoft.searchArchiveMessages).toHaveBeenCalledWith(testUser, 'meeting', 5)
    })
  })

  describe('send_outlook_mail', () => {
    test('sends email with correct arguments', async () => {
      const result = await tools.send_outlook_mail.execute(
        { to: ['recipient@example.com'], subject: 'Test', body: 'Hello!' },
        executionOptions,
      )

      expect(microsoft.sendMail).toHaveBeenCalledWith(testUser, ['recipient@example.com'], 'Test', 'Hello!')
      expect(result).toBe('Email sent successfully to recipient@example.com')
    })

    test('handles multiple recipients', async () => {
      await tools.send_outlook_mail.execute(
        { to: ['a@example.com', 'b@example.com'], subject: 'Group', body: 'Hi all!' },
        executionOptions,
      )

      expect(microsoft.sendMail).toHaveBeenCalledWith(testUser, ['a@example.com', 'b@example.com'], 'Group', 'Hi all!')
    })
  })

  describe('archive_outlook_mail', () => {
    test('archives email by ID', async () => {
      const result = await tools.archive_outlook_mail.execute(
        { mailId: 'mail1' },
        executionOptions,
      )

      expect(microsoft.archiveMessage).toHaveBeenCalledWith(testUser, 'mail1')
      expect(result).toBe('Email archived successfully')
    })
  })
})

describe('getOutlookContext', () => {
  test('returns unread email count', async () => {
    const result = await getOutlookContext(testUser)

    expect(microsoft.getUnreadInboxCount).toHaveBeenCalledWith(testUser)
    expect(result).toEqual({ unreadCount: 3 })
  })

  test('returns zero when no unread emails', async () => {
    vi.mocked(microsoft.getUnreadInboxCount).mockResolvedValue(0)

    const result = await getOutlookContext(testUser)

    expect(result).toEqual({ unreadCount: 0 })
  })
})
