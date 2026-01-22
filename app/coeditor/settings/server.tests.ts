import { describe, expect, test, vi } from 'vitest'
import { v4 as randomUUID } from 'uuid'
import type { UserSession } from '@/app/common/auth/auth'
import { getAuthenticatedUserSession } from '@/app/common/auth/auth'
import { createOrModifyTemplate, findTemplateById } from '../_data/Template'
import { deleteProfile, deleteTemplate, loadSettings, saveProfile, saveTemplate } from './server'
import { nontransactional, transactional } from '@/app/shared/db'
import { createOrModifyProfile, findProfileByOwnerAndLanguage } from '../_data/Profile'

// Mock the auth module
vi.mock('@/app/common/auth/auth', async () => {
  const actual = await vi.importActual('@/app/common/auth/auth')
  return {
    ...actual,
    getAuthenticatedUserSession: vi.fn(),
  }
})

describe('loadSettings', () => {
  test('Empty Templates', async ({ task }) => {
    const user: UserSession = { sub: task.id, name: 'Test User', email: 'test@example.com', applications: ['cash'] }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    const result = await loadSettings()

    // If no templates exist, two default templates are created
    expect(result.templates).toHaveLength(2)
  })

  test('Existing Templates', async ({ task }) => {
    const user: UserSession = { sub: task.id, name: 'Test User', email: 'test@example.com', applications: ['cash'] }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)
    const input = { id: randomUUID(), name: 'Template 1', text: 'A test template', language: 'en' }
    await transactional(async tx => createOrModifyTemplate(tx, task.id, input))

    const result = await loadSettings()

    expect(result.templates).toHaveLength(1)
    expect(result.templates[0]).toEqual(expect.objectContaining(input))
  })

  test('Templates from other users not loaded', async ({ task }) => {
    const user: UserSession = { sub: task.id, name: 'Test User', email: 'test@example.com', applications: ['cash'] }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)
    const input = { id: randomUUID(), name: 'Template 1', text: 'A test template', language: 'en' }
    await transactional(async tx => createOrModifyTemplate(tx, task.id, input))

    const otherUser: UserSession = { sub: 'other-user-id', name: 'Other User', email: 'other@example.com', applications: ['cash'] }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(otherUser)
    const result = await loadSettings()

    // If no templates exist, two default templates are created
    expect(result.templates).toHaveLength(2)
  })

  test('Empty Profiles', async ({ task }) => {
    const user: UserSession = { sub: task.id, name: 'Test User', email: 'test@example.com', applications: ['cash'] }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    const result = await loadSettings()

    expect(result.profiles).toEqual([])
  })

  test('Existing Profiles', async ({ task }) => {
    const user: UserSession = { sub: task.id, name: 'Test User', email: 'test@example.com', applications: ['cash'] }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)
    const input = { id: randomUUID(), text: 'A test profile', language: 'en' }
    await transactional(async tx => createOrModifyProfile(tx, task.id, input))

    const result = await loadSettings()

    expect(result.profiles).toHaveLength(1)
    expect(result.profiles[0]).toEqual(expect.objectContaining(input))
  })

  test('Profiles from other users not loaded', async ({ task }) => {
    const user: UserSession = { sub: task.id, name: 'Test User', email: 'test@example.com', applications: ['cash'] }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)
    const input = { id: randomUUID(), name: 'Profile 1', text: 'A test profile', language: 'en' }
    await transactional(async tx => createOrModifyProfile(tx, task.id, input))

    const otherUser: UserSession = { sub: 'other-user-id', name: 'Other User', email: 'other@example.com', applications: ['cash'] }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(otherUser)
    const result = await loadSettings()

    expect(result.profiles).toEqual([])
  })
})

describe('deleteProfile', () => {
  test('Delete existing profile', async ({ task }) => {
    const user: UserSession = { sub: task.id, name: 'Test User', email: 'test@example.com', applications: ['cash'] }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)
    const input = { id: randomUUID(), language: 'en', text: 'A test profile' }
    await transactional(async tx => createOrModifyProfile(tx, task.id, input))

    const result = await deleteProfile(input.id)

    expect(result.success).toBe(true)
    await expect(nontransactional(c => findProfileByOwnerAndLanguage(c, task.id, input.language))).resolves.toBeUndefined()
  })

  test('Delete non existing profile', async ({ task }) => {
    const user: UserSession = { sub: task.id, name: 'Test User', email: 'test@example.com', applications: ['cash'] }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)
    const input = { id: randomUUID(), language: 'en', text: 'A test profile' }

    const result = await deleteProfile(input.id)

    // No error
    expect(result.success).toBe(true)
    await expect(nontransactional(c => findProfileByOwnerAndLanguage(c, task.id, input.language))).resolves.toBeUndefined()
  })

  test('Delete profile of other user', async ({ task }) => {
    const user: UserSession = { sub: task.id, name: 'Test User', email: 'test@example.com', applications: ['cash'] }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)
    const input = { id: randomUUID(), language: 'en', text: 'A test profile' }
    await transactional(async tx => createOrModifyProfile(tx, task.id, input))

    const otherUser: UserSession = { sub: 'other-user-id', name: 'Other User', email: 'other@example.com', applications: ['cash'] }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(otherUser)
    const result = await deleteProfile(input.id)

    // Still exists
    expect(result.success).toBe(true)
    await expect(nontransactional(c => findProfileByOwnerAndLanguage(c, task.id, input.language))).resolves.toEqual(expect.objectContaining(input))
  })
})

describe('saveProfile', () => {
  test('Create new profile', async ({ task }) => {
    const user: UserSession = { sub: task.id, name: 'Test User', email: 'test@example.com', applications: ['cash'] }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)
    const input = { id: randomUUID(), language: 'en', text: 'Original profile text XXX2' }

    const result = await saveProfile(input)

    if (!result.success) throw new Error('Update profile failed unexpectedly')
    expect(result.data).toEqual(expect.objectContaining(input))
    await expect(nontransactional(c => findProfileByOwnerAndLanguage(c, task.id, input.language))).resolves.toEqual(result.data)
  })

  test('Update existing profile', async ({ task }) => {
    const user: UserSession = { sub: task.id, name: 'Test User', email: 'test@example.com', applications: ['cash'] }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)
    const input1 = { id: randomUUID(), language: 'en', text: 'Original profile text XXX2' }
    await transactional(tx => createOrModifyProfile(tx, task.id, input1))
    const input = { id: input1.id, language: 'de', text: 'New profile text' }

    const result = await saveProfile(input)

    if (!result.success) throw new Error('Update profile failed unexpectedly')
    expect(result.data).toEqual(expect.objectContaining(input))
    await expect(nontransactional(c => findProfileByOwnerAndLanguage(c, task.id, input.language))).resolves.toEqual(result.data)
  })

  test('Update profile of other user', async ({ task }) => {
    const user: UserSession = { sub: task.id, name: 'Test User', email: 'test@example.com', applications: ['cash'] }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)
    const input1 = { id: randomUUID(), language: 'en', text: 'Original profile text XXX2' }
    await transactional(tx => createOrModifyProfile(tx, task.id, input1))
    const input = { id: input1.id, language: 'de', text: 'New profile text' }

    const otherUser: UserSession = { sub: 'other-user-id', name: 'Other User', email: 'other@example.com', applications: ['cash'] }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(otherUser)
    const result = await saveProfile(input)

    expect(result.success).toBe(false)
    await expect(nontransactional(c => findProfileByOwnerAndLanguage(c, task.id, input1.language))).resolves.toEqual(expect.objectContaining(input1))
  })

  test('Create profile in same language', async ({ task }) => {
    const user: UserSession = { sub: task.id, name: 'Test User', email: 'test@example.com', applications: ['cash'] }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)
    const input1 = { id: randomUUID(), language: 'en', text: 'Original profile text XXX2' }
    await transactional(tx => createOrModifyProfile(tx, task.id, input1))
    const input = { id: randomUUID(), language: 'en', text: 'New profile text' }

    const result = await saveProfile(input)

    expect(result.success).toBe(false)
    await expect(nontransactional(c => findProfileByOwnerAndLanguage(c, task.id, input.language))).resolves.toEqual(expect.objectContaining(input1))
  })

  test('Update profile to same language', async ({ task }) => {
    const user: UserSession = { sub: task.id, name: 'Test User', email: 'test@example.com', applications: ['cash'] }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)
    const input1 = { id: randomUUID(), language: 'en', text: 'Original profile text XXX2' }
    const input2 = { id: randomUUID(), language: 'de', text: 'Original profile text XXX2' }
    await transactional(async (tx) => {
      await createOrModifyProfile(tx, task.id, input1)
      await createOrModifyProfile(tx, task.id, input2)
    })
    const input = { id: input1.id, language: 'de', text: 'New profile text' }

    const result = await saveProfile(input)

    expect(result.success).toBe(false)
    await expect(nontransactional(c => findProfileByOwnerAndLanguage(c, task.id, input1.language))).resolves.toEqual(expect.objectContaining(input1))
  })

  test('Invalid input', async ({ task }) => {
    const user: UserSession = { sub: task.id, name: 'Test User', email: 'test@example.com', applications: ['cash'] }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)
    const input = { id: randomUUID(), language: 'en', text: 'New profile text' }

    await expect(saveProfile({ ...input, id: '' })).resolves.toEqual({ success: false, error: expect.any(String) as string })
    await expect(saveProfile({ ...input, id: 'ddd' })).resolves.toEqual({ success: false, error: expect.any(String) as string })
    await expect(saveProfile({ ...input, language: '' })).resolves.toEqual({ success: false, error: expect.any(String) as string })
    await expect(saveProfile({ ...input, text: '' })).resolves.toEqual({ success: false, error: expect.any(String) as string })
  })
})

describe('saveTemplate', () => {
  test('Create new template', async ({ task }) => {
    const user: UserSession = { sub: task.id, name: 'Test User', email: 'test@example.com', applications: ['cash'] }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)
    const input = { id: randomUUID(), name: 'Test Template', language: 'en', text: 'Original template text' }

    const result = await saveTemplate(input)

    if (!result.success) throw new Error('Update template failed unexpectedly')
    expect(result.data).toEqual(expect.objectContaining(input))
    await expect(nontransactional(c => findTemplateById(c, task.id, input.id))).resolves.toEqual(result.data)
  })

  test('Update existing template', async ({ task }) => {
    const user: UserSession = { sub: task.id, name: 'Test User', email: 'test@example.com', applications: ['cash'] }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)
    const input1 = { id: randomUUID(), name: 'Test Template', language: 'en', text: 'Original template text' }
    await transactional(tx => createOrModifyTemplate(tx, task.id, input1))
    const input = { id: input1.id, name: 'Updated Template', language: 'de', text: 'New template text' }

    const result = await saveTemplate(input)

    if (!result.success) throw new Error('Update template failed unexpectedly')
    expect(result.data).toEqual(expect.objectContaining(input))
    await expect(nontransactional(c => findTemplateById(c, task.id, input.id))).resolves.toEqual(result.data)
  })

  test('Update template of other user', async ({ task }) => {
    const user: UserSession = { sub: task.id, name: 'Test User', email: 'test@example.com', applications: ['cash'] }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)
    const input1 = { id: randomUUID(), name: 'Test Template', language: 'en', text: 'Original template text' }
    await transactional(tx => createOrModifyTemplate(tx, task.id, input1))
    const input = { id: input1.id, name: 'Updated Template', language: 'de', text: 'New template text' }

    const otherUser: UserSession = { sub: 'other-user-id', name: 'Other User', email: 'other@example.com', applications: ['cash'] }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(otherUser)
    const result = await saveTemplate(input)

    expect(result.success).toBe(false)
    await expect(nontransactional(c => findTemplateById(c, task.id, input1.id))).resolves.toEqual(expect.objectContaining(input1))
  })

  test('Invalid input', async ({ task }) => {
    const user: UserSession = { sub: task.id, name: 'Test User', email: 'test@example.com', applications: ['cash'] }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)
    const input = { id: randomUUID(), name: 'Test Template', language: 'en', text: 'Template text' }

    await expect(saveTemplate({ ...input, id: '' })).resolves.toEqual({ success: false, error: expect.any(String) as string })
    await expect(saveTemplate({ ...input, id: 'ddd' })).resolves.toEqual({ success: false, error: expect.any(String) as string })
    await expect(saveTemplate({ ...input, name: '' })).resolves.toEqual({ success: false, error: expect.any(String) as string })
    await expect(saveTemplate({ ...input, language: '' })).resolves.toEqual({ success: false, error: expect.any(String) as string })
  })
})

describe('deleteTemplate', () => {
  test('Delete existing template', async ({ task }) => {
    const user: UserSession = { sub: task.id, name: 'Test User', email: 'test@example.com', applications: ['cash'] }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)
    const input = { id: randomUUID(), name: 'Test', language: 'en', text: 'Original profile text' }
    await transactional(async tx => createOrModifyTemplate(tx, task.id, input))

    const result = await deleteTemplate(input.id)

    expect(result.success).toBe(true)
    await expect(nontransactional(c => findTemplateById(c, task.id, input.id))).resolves.toBeUndefined()
  })

  test('Delete non existing template', async ({ task }) => {
    const user: UserSession = { sub: task.id, name: 'Test User', email: 'test@example.com', applications: ['cash'] }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)
    const input = { id: randomUUID(), name: 'Test', language: 'en', text: 'Original profile text' }

    const result = await deleteTemplate(input.id)

    // No error
    expect(result.success).toBe(true)
    await expect(nontransactional(c => findTemplateById(c, task.id, input.id))).resolves.toBeUndefined()
  })

  test('Delete profile of other user', async ({ task }) => {
    const user: UserSession = { sub: task.id, name: 'Test User', email: 'test@example.com', applications: ['cash'] }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)
    const input = { id: randomUUID(), name: 'Test', language: 'en', text: 'Original profile text' }
    await transactional(async tx => createOrModifyTemplate(tx, task.id, input))

    const otherUser: UserSession = { sub: 'other-user-id', name: 'Other User', email: 'other@example.com', applications: ['cash'] }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(otherUser)
    const result = await deleteTemplate(input.id)

    // Still exists
    expect(result.success).toBe(true)
    await expect(nontransactional(c => findTemplateById(c, task.id, input.id))).resolves.toBeDefined()
  })
})
