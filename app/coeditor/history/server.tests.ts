import { describe, expect, test, vi } from 'vitest'
import { transactional } from '@/app/shared/_external/db/access'
import { v4 as randomUUID } from 'uuid'
import type { UserSession } from '@/app/common/auth/auth'
import { getAuthenticatedUserSession } from '@/app/common/auth/auth'
import { createOrModifyTemplate } from '../_data/Template'
import { loadHistory } from './server'
import { createDiscussion, DiscussionInput } from '../_data/Discussion'

// Mock the auth module
vi.mock('@/app/common/auth/auth', async () => {
  const actual = await vi.importActual('@/app/common/auth/auth')
  return {
    ...actual,
    getAuthenticatedUserSession: vi.fn(),
  }
})

// Mock AI
vi.mock('../_external/AiPort', () => {
  return {
    aiPort: vi.fn().mockReturnValue({ text: 'Text', title: 'Title', durationMs: 100 }),
  }
})

describe('loadHistory', () => {
  test('Empty list', async ({ task }) => {
    const user: UserSession = { sub: task.id, name: 'Test User', email: 'test@example.com', applications: ['cash'] }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    const result = await loadHistory()

    expect(result).toEqual([])
  })

  test('Existing Discussions', async ({ task }) => {
    const user: UserSession = { sub: task.id, name: 'Test User', email: 'test@example.com', applications: ['cash'] }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)
    const templateInput = { id: randomUUID(), name: 'Template 1', text: 'A test template', language: 'en' }
    const input = { id: randomUUID(), text: 'New text', title: 'New Title', context: 'context', template_id: templateInput.id, parameters: {} } as DiscussionInput
    await transactional(async (tx) => {
      await createOrModifyTemplate(tx, task.id, templateInput)
      await createDiscussion(tx, task.id, input)
    })

    const result = await loadHistory()

    expect(result).toHaveLength(1)
    expect(result[0]).toEqual(expect.objectContaining(input))
  })

  test('Discussions from other users not loaded', async ({ task }) => {
    const user: UserSession = { sub: task.id, name: 'Test User', email: 'test@example.com', applications: ['cash'] }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)
    const templateInput = { id: randomUUID(), name: 'Template 1', text: 'A test template', language: 'en' }
    const input = { id: randomUUID(), text: 'New text', title: 'New Title', context: 'context', template_id: templateInput.id, parameters: {} } as DiscussionInput
    await transactional(async (tx) => {
      await createOrModifyTemplate(tx, task.id, templateInput)
      await createDiscussion(tx, task.id, input)
    })

    const otherUser: UserSession = { sub: 'other-user-id', name: 'Other User', email: 'other@example.com', applications: ['cash'] }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(otherUser)
    const result = await loadHistory()

    expect(result).toEqual([])
  })
})
