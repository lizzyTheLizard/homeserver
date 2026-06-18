import { describe, expect, test, vi } from 'vitest'
import { transactional } from '@/app/shared/_external/db/access'
import { v4 as randomUUID } from 'uuid'
import type { UserSession } from '@/app/shared/auth/auth'
import { getAuthenticatedUserSession } from '@/app/shared/auth/auth'
import { createOrModifyTemplate } from '../_data/Template'
import { loadHistory } from './server'
import { createDiscussion } from '../_data/Discussion'

// Mock the auth module
vi.mock('@/app/shared/auth/auth', async () => {
  const actual = await vi.importActual('@/app/shared/auth/auth')
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
    const user: UserSession = { name: 'Test User', email: task.id, applications: ['cash'] }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    const result = await loadHistory()

    expect(result).toEqual([])
  })

  test('Existing Discussions', async ({ task }) => {
    const user: UserSession = { name: 'Test User', email: task.id, applications: ['cash'] }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)
    const templateInput = { id: randomUUID(), name: 'Template 1', text: 'A test template', language: 'en' }
    const input = { id: randomUUID(), text: 'New text', title: 'New Title', context: 'context', template_id: templateInput.id, parameters: {} }
    await transactional(async (tx) => {
      await createOrModifyTemplate(tx, task.id, templateInput)
      await createDiscussion(tx, task.id, input)
    })

    const result = await loadHistory()

    expect(result).toHaveLength(1)
    expect(result[0]).toEqual(expect.objectContaining(input))
  })

  test('Discussions from other users not loaded', async ({ task }) => {
    const user: UserSession = { name: 'Test User', email: task.id, applications: ['cash'] }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)
    const templateInput = { id: randomUUID(), name: 'Template 1', text: 'A test template', language: 'en' }
    const input = { id: randomUUID(), text: 'New text', title: 'New Title', context: 'context', template_id: templateInput.id, parameters: {} }
    await transactional(async (tx) => {
      await createOrModifyTemplate(tx, task.id, templateInput)
      await createDiscussion(tx, task.id, input)
    })

    const otherUser: UserSession = { name: 'Other User', email: 'other-user-id', applications: ['cash'] }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(otherUser)
    const result = await loadHistory()

    expect(result).toEqual([])
  })
})
