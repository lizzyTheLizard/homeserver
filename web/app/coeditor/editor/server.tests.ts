import { beforeEach, describe, expect, Mock, test, vi } from 'vitest'
import { nontransactional, transactional } from '@/app/shared/_external/db/access'
import { v4 as randomUUID } from 'uuid'
import type { UserSession } from '@/app/shared/auth/session'
import { getAuthenticatedUserSession } from '@/app/shared/auth/auth'
import { CommandInput, createCommand } from '../_data/Command'
import { ExecuteCommandInput } from './server'
import { createOrModifyTemplate } from '../_data/Template'
import { createOrModifyProfile } from '../_data/Profile'
import { executeCommand, loadEditorData } from './server'
import { aiPort } from '../_external/AiPort'
import { createDiscussion, findDiscussionByOwner } from '../_data/Discussion'

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

describe('loadEditorData', () => {
  test('Empty template list', async ({ task }) => {
    const user: UserSession = { name: 'Test User', email: task.id, applications: ['cash'] }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    const result = await loadEditorData(undefined)

    // If no other templates exist, two default templates are created
    expect(result.templates).toHaveLength(2)
  })

  test('Existing Templates', async ({ task }) => {
    const user: UserSession = { name: 'Test User', email: task.id, applications: ['cash'] }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)
    const templateInput = { id: randomUUID(), name: 'Template 1', text: 'A test template', language: 'en' }
    await transactional(async tx => await createOrModifyTemplate(tx, task.id, templateInput))

    const result = await loadEditorData(undefined)

    expect(result.templates).toHaveLength(1)
    expect(result.templates[0]).toEqual(expect.objectContaining(templateInput))
  })

  test('Templates from other users not loaded', async ({ task }) => {
    const user: UserSession = { name: 'Test User', email: task.id, applications: ['cash'] }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)
    const templateInput = { id: randomUUID(), name: 'Template 1', text: 'A test template', language: 'en' }
    await transactional(async tx => await createOrModifyTemplate(tx, task.id, templateInput))

    const otherUser: UserSession = { name: 'Other User', email: 'other-user-id', applications: ['cash'] }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(otherUser)
    const result = await loadEditorData(undefined)

    // If no other templates exist, two default templates are created
    expect(result.templates).toHaveLength(2)
  })

  test('Existing Discussion', async ({ task }) => {
    const user: UserSession = { name: 'Test User', email: task.id, applications: ['cash'] }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)
    const templateInput = { id: randomUUID(), name: 'Template 1', text: 'A test template', language: 'en' }
    const input = { id: randomUUID(), text: 'New text', title: 'New Title', context: 'context', template_id: templateInput.id, parameters: {} }
    await transactional(async (tx) => {
      await createOrModifyTemplate(tx, task.id, templateInput)
      await createDiscussion(tx, task.id, input)
    })

    const result = await loadEditorData(input.id)

    expect(result.discussion).toEqual(expect.objectContaining(input))
  })

  test('Not existing Discussion', async ({ task }) => {
    const user: UserSession = { name: 'Test User', email: task.id, applications: ['cash'] }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    await expect(loadEditorData(randomUUID())).rejects.toThrow()
  })

  test('Discussion from other users not loaded', async ({ task }) => {
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
    await expect(loadEditorData(randomUUID())).rejects.toThrow()
  })
})

describe('executeCommand', () => {
  beforeEach(() => {
    const aiPortMock: Mock = aiPort as Mock
    aiPortMock.mockClear()
  })

  test('New Discussion', async ({ task }) => {
    const user: UserSession = { name: 'Test User', email: task.id, applications: ['cash'] }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)
    const templateInput = { id: randomUUID(), name: 'Template 1', text: 'A test template', language: 'en' }
    await transactional(tx => createOrModifyTemplate(tx, task.id, templateInput))

    const input = { id: randomUUID(), discussion_id: randomUUID(), template_id: templateInput.id, text: 'New text', parameters: {}, predefined_command: 'INITIALIZE' } as ExecuteCommandInput
    const result = await executeCommand(input)

    if (!result.success) throw new Error('Expected success response: ' + result.error)
    expect(result.data).toEqual({
      id: input.discussion_id,
      template_id: templateInput.id,
      text: 'Text', title: 'Title',
      parameters: {},
      owner_email: task.id,
      context: 'A test template',
      created_at: expect.any(String) as string,
      updated_at: expect.any(String) as string,
    })
    const discussions = await nontransactional(c => findDiscussionByOwner(c, task.id))
    expect(discussions.length).toBe(1)
    expect(discussions[0]).toEqual(result.data)
  })

  test('Existing Discussion', async ({ task }) => {
    const user: UserSession = { name: 'Test User', email: task.id, applications: ['cash'] }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)
    const templateInput = { id: randomUUID(), name: 'Template 1', text: 'A test template', language: 'en' }
    const input1 = { id: randomUUID(), text: 'New text', title: 'New Title', context: 'context', template_id: templateInput.id, parameters: {} }
    await transactional(async (tx) => {
      await createOrModifyTemplate(tx, task.id, templateInput)
      await createDiscussion(tx, task.id, input1)
    })

    const input = { id: randomUUID(), discussion_id: input1.id, template_id: templateInput.id, text: 'New text', parameters: {}, predefined_command: 'IMPROVE' } as ExecuteCommandInput
    const result = await executeCommand(input)

    if (!result.success) throw new Error('Expected success response: ' + result.error)
    expect(result.data).toEqual({
      id: input.discussion_id,
      template_id: templateInput.id,
      text: 'Text', title: 'Title',
      parameters: {},
      owner_email: task.id,
      context: 'A test template',
      created_at: expect.any(String) as string,
      updated_at: expect.any(String) as string,
    })
    const discussions = await nontransactional(c => findDiscussionByOwner(c, task.id))
    expect(discussions.length).toBe(1)
    expect(discussions[0]).toEqual(result.data)
  })

  test('Template not found', async ({ task }) => {
    const user: UserSession = { name: 'Test User', email: task.id, applications: ['cash'] }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    const input = { id: randomUUID(), discussion_id: randomUUID(), template_id: randomUUID(), text: 'New text', parameters: {}, predefined_command: 'INITIALIZE' } as ExecuteCommandInput
    const result = await executeCommand(input)

    expect(result).toEqual({ success: false, error: `Given template ${input.template_id} not found` })
  })

  test('Template other user', async ({ task }) => {
    const user: UserSession = { name: 'Test User', email: task.id, applications: ['cash'] }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)
    const templateInput = { id: randomUUID(), name: 'Template 1', text: 'A test template', language: 'en' }
    await transactional(tx => createOrModifyTemplate(tx, task.id, templateInput))

    const otherUser: UserSession = { name: 'Test User', email: 'other-user-id', applications: ['cash'] }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(otherUser)
    const input = { id: randomUUID(), discussion_id: randomUUID(), template_id: templateInput.id, text: 'New text', parameters: {}, predefined_command: 'INITIALIZE' } as ExecuteCommandInput
    const result = await executeCommand(input)

    expect(result).toEqual({ success: false, error: `Given template ${input.template_id} not found` })
  })

  test('Discussion other user', async ({ task }) => {
    const user: UserSession = { name: 'Test User', email: task.id, applications: ['cash'] }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)
    const templateInput = { id: randomUUID(), name: 'Template 1', text: 'A test template', language: 'en' }
    const input1 = { id: randomUUID(), text: 'New text', title: 'New Title', context: 'context', template_id: templateInput.id, parameters: {} }
    await transactional(async (tx) => {
      await createOrModifyTemplate(tx, task.id, templateInput)
      await createDiscussion(tx, task.id, input1)
    })
    const otherUser: UserSession = { name: 'Test User', email: 'other-user-id', applications: ['cash'] }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(otherUser)
    const templateInput2 = { id: randomUUID(), name: 'Template 1', text: 'A test template', language: 'en' }
    await transactional(async (tx) => {
      await createOrModifyTemplate(tx, otherUser.email, templateInput2)
    })
    const input = { id: randomUUID(), discussion_id: input1.id, template_id: templateInput2.id, text: 'New text', parameters: {}, predefined_command: 'IMPROVE' } as ExecuteCommandInput
    const result = await executeCommand(input)

    expect(result).toEqual({ success: false, error: expect.any(String) as string })
  })
})
describe('executeCommandAction AI integration', () => {
  test('AiPort', async ({ task }) => {
    const user: UserSession = { name: 'Test User', email: task.id, applications: ['cash'] }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)
    const templateInput = { id: randomUUID(), name: 'Template 1', text: 'A test template', language: 'en' }
    await transactional(tx => createOrModifyTemplate(tx, task.id, templateInput))

    const input = { id: randomUUID(), discussion_id: randomUUID(), template_id: templateInput.id, text: 'New text', parameters: {}, predefined_command: 'INITIALIZE' } as ExecuteCommandInput
    await executeCommand(input)

    expect(aiPort).toHaveBeenCalledWith({
      text: input.text,
      title: undefined,
      context: 'A test template',
      language: 'en',
      profile: undefined,
      selection_start: undefined,
      selection_end: undefined,
      predefined_command: 'INITIALIZE',
      custom_command: undefined,
    }, [])
  })

  test('Profile', async ({ task }) => {
    const user: UserSession = { name: 'Test User', email: task.id, applications: ['cash'] }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)
    const profileInput = { id: randomUUID(), text: 'Profile Text', language: 'en' }
    const templateInput = { id: randomUUID(), name: 'Template 1', text: 'A test template', language: 'en' }
    await transactional(async (tx) => {
      await createOrModifyTemplate(tx, task.id, templateInput)
      await createOrModifyProfile(tx, task.id, profileInput)
    })

    const input = { id: randomUUID(), discussion_id: randomUUID(), template_id: templateInput.id, text: 'New text', parameters: {}, predefined_command: 'INITIALIZE' } as ExecuteCommandInput
    await executeCommand(input)

    expect(aiPort).toHaveBeenCalledWith(expect.objectContaining({
      profile: 'Profile Text',
    }), [])
  })

  test('Selection', async ({ task }) => {
    const user: UserSession = { name: 'Test User', email: task.id, applications: ['cash'] }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)
    const templateInput = { id: randomUUID(), name: 'Template 1', text: 'A test template', language: 'en' }
    await transactional(tx => createOrModifyTemplate(tx, task.id, templateInput))

    const input = { id: randomUUID(), discussion_id: randomUUID(), template_id: templateInput.id, text: 'New text', parameters: {}, predefined_command: 'INITIALIZE', selection_start: 5, selection_end: 10 } as ExecuteCommandInput
    await executeCommand(input)

    expect(aiPort).toHaveBeenCalledWith(expect.objectContaining({
      selection_start: 5,
      selection_end: 10,
    }), [])
  })

  test('Custom Command', async ({ task }) => {
    const user: UserSession = { name: 'Test User', email: task.id, applications: ['cash'] }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)
    const templateInput = { id: randomUUID(), name: 'Template 1', text: 'A test template', language: 'en' }
    await transactional(tx => createOrModifyTemplate(tx, task.id, templateInput))

    const input = { id: randomUUID(), discussion_id: randomUUID(), template_id: templateInput.id, text: 'New text', parameters: {}, custom_command: 'Custom Command Text' }
    await executeCommand(input)

    expect(aiPort).toHaveBeenCalledWith(expect.objectContaining({
      predefined_command: undefined,
      custom_command: 'Custom Command Text',
    }), [])
  })

  test('No old Commands', async ({ task }) => {
    const user: UserSession = { name: 'Test User', email: task.id, applications: ['cash'] }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)
    const templateInput = { id: randomUUID(), name: 'Template 1', text: 'A test template', language: 'en' }
    await transactional(tx => createOrModifyTemplate(tx, task.id, templateInput))

    const input = { id: randomUUID(), discussion_id: randomUUID(), template_id: templateInput.id, text: 'New text', parameters: {}, custom_command: 'Custom Command Text' }
    await executeCommand(input)

    expect(aiPort).toHaveBeenCalledWith(expect.anything(), [])
  })

  test('Old Commands', async ({ task }) => {
    const user: UserSession = { name: 'Test User', email: task.id, applications: ['cash'] }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)
    const templateInput = { id: randomUUID(), name: 'Template 1', text: 'A test template', language: 'en' }
    const input1 = { id: randomUUID(), text: 'New text', title: 'New Title', context: 'context', template_id: templateInput.id, parameters: {} }
    const input2 = { id: randomUUID(), discussion_id: input1.id, text: 'New text', predefined_command: 'INITIALIZE', context: 'context', language: 'en', result: { text: 'Result text', title: 'Result title', durationMs: 100 } } as CommandInput
    await transactional(async (tx) => {
      await createOrModifyTemplate(tx, task.id, templateInput)
      await createDiscussion(tx, task.id, input1)
      await createCommand(tx, task.id, input2)
    })
    const aiPortMock: Mock = aiPort as Mock
    aiPortMock.mockClear()

    const input = { id: randomUUID(), discussion_id: input1.id, template_id: templateInput.id, text: 'New text 2', parameters: {}, custom_command: 'Custom Command Text' } as ExecuteCommandInput
    await executeCommand(input)

    expect(aiPort).toHaveBeenCalledWith(expect.anything(), [expect.objectContaining(input2)])
  })
})
