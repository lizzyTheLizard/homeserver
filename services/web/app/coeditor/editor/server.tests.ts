import { type CommandInput, createCommand } from '../_data/Command';
import { type ExecuteCommandInput, executeCommand, loadEditorData } from './server'
import { type Mock, beforeEach, describe, expect, test, vi } from 'vitest'
import { createDiscussion, findDiscussionByOwner } from '../_data/Discussion'
import { nontransactional, transactional } from '@/app/shared/_external/db/access'
import type { UserSession } from '@/app/shared/auth/session'
import { aiPort } from '../_external/AiPort'
import { createOrModifyProfile } from '../_data/Profile'
import { createOrModifyTemplate } from '../_data/Template'
import { getAuthenticatedUserSession } from '@/app/shared/auth/auth'
import { v4 as randomUUID } from 'uuid'

// Mock the auth module
vi.mock('@/app/shared/auth/auth', async () => {
  const actual = await vi.importActual('@/app/shared/auth/auth')
  return {
    ...actual,
    getAuthenticatedUserSession: vi.fn(),
  }
})

// Mock AI
vi.mock('../_external/AiPort', () => (
  {
    aiPort: vi.fn().mockReturnValue({ text: 'Text', title: 'Title' }),
  }
))

describe('loadEditorData', () => {
  test('Empty template list', async ({ task }) => {
    const user: UserSession = { applications: ['cash'], email: task.id, name: 'Test User' }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    const result = await loadEditorData(undefined)

    // If no other templates exist, two default templates are created
    expect(result.templates).toHaveLength(2)
  })

  test('Existing Templates', async ({ task }) => {
    const user: UserSession = { applications: ['cash'], email: task.id, name: 'Test User' }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)
    const templateInput = { id: randomUUID(), language: 'en', name: 'Template 1', text: 'A test template' }
    await transactional(async tx => await createOrModifyTemplate(tx, task.id, templateInput))

    const result = await loadEditorData(undefined)

    expect(result.templates).toHaveLength(1)
    expect(result.templates[0]).toEqual(expect.objectContaining(templateInput))
  })

  test('Templates from other users not loaded', async ({ task }) => {
    const user: UserSession = { applications: ['cash'], email: task.id, name: 'Test User' }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)
    const templateInput = { id: randomUUID(), language: 'en', name: 'Template 1', text: 'A test template' }
    await transactional(async tx => await createOrModifyTemplate(tx, task.id, templateInput))

    const otherUser: UserSession = { applications: ['cash'], email: 'other-user-id', name: 'Other User' }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(otherUser)
    const result = await loadEditorData(undefined)

    // If no other templates exist, two default templates are created
    expect(result.templates).toHaveLength(2)
  })

  test('Existing Discussion', async ({ task }) => {
    const user: UserSession = { applications: ['cash'], email: task.id, name: 'Test User' }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)
    const templateInput = { id: randomUUID(), language: 'en', name: 'Template 1', text: 'A test template' },
     input = { context: 'context', id: randomUUID(), parameters: {}, template_id: templateInput.id, text: 'New text', title: 'New Title' }
    await transactional(async (tx) => {
      await createOrModifyTemplate(tx, task.id, templateInput)
      await createDiscussion(tx, task.id, input)
    })

    const result = await loadEditorData(input.id)

    expect(result.discussion).toEqual(expect.objectContaining(input))
  })

  test('Not existing Discussion', async ({ task }) => {
    const user: UserSession = { applications: ['cash'], email: task.id, name: 'Test User' }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    await expect(loadEditorData(randomUUID())).rejects.toThrow()
  })

  test('Discussion from other users not loaded', async ({ task }) => {
    const user: UserSession = { applications: ['cash'], email: task.id, name: 'Test User' }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)
    const templateInput = { id: randomUUID(), language: 'en', name: 'Template 1', text: 'A test template' },
     input = { context: 'context', id: randomUUID(), parameters: {}, template_id: templateInput.id, text: 'New text', title: 'New Title' }
    await transactional(async (tx) => {
      await createOrModifyTemplate(tx, task.id, templateInput)
      await createDiscussion(tx, task.id, input)
    })

    const otherUser: UserSession = { applications: ['cash'], email: 'other-user-id', name: 'Other User' }
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
    const user: UserSession = { applications: ['cash'], email: task.id, name: 'Test User' }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)
    const templateInput = { id: randomUUID(), language: 'en', name: 'Template 1', text: 'A test template' }
    await transactional(tx => createOrModifyTemplate(tx, task.id, templateInput))

    const input = { discussion_id: randomUUID(), id: randomUUID(), parameters: {}, predefined_command: 'INITIALIZE', template_id: templateInput.id, text: 'New text' } as ExecuteCommandInput,
     result = await executeCommand(input)

    if (!result.success) {throw new Error(`Expected success response: ${  result.error}`)}
    expect(result.data).toEqual({
      context: 'A test template',
      created_at: expect.any(String) as string,
      id: input.discussion_id,
      owner_email: task.id,
      parameters: {},
      template_id: templateInput.id,
      text: 'Text',
      title: 'Title',
      updated_at: expect.any(String) as string,
    })
    const discussions = await nontransactional(c => findDiscussionByOwner(c, task.id))
    expect(discussions.length).toBe(1)
    expect(discussions[0]).toEqual(result.data)
  })

  test('Existing Discussion', async ({ task }) => {
    const user: UserSession = { applications: ['cash'], email: task.id, name: 'Test User' }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)
    const templateInput = { id: randomUUID(), language: 'en', name: 'Template 1', text: 'A test template' },
     input1 = { context: 'context', id: randomUUID(), parameters: {}, template_id: templateInput.id, text: 'New text', title: 'New Title' }
    await transactional(async (tx) => {
      await createOrModifyTemplate(tx, task.id, templateInput)
      await createDiscussion(tx, task.id, input1)
    })

    const input = { discussion_id: input1.id, id: randomUUID(), parameters: {}, predefined_command: 'IMPROVE', template_id: templateInput.id, text: 'New text' } as ExecuteCommandInput,
     result = await executeCommand(input)

    if (!result.success) {throw new Error(`Expected success response: ${  result.error}`)}
    expect(result.data).toEqual({
      context: 'A test template',
      created_at: expect.any(String) as string,
      id: input.discussion_id,
      owner_email: task.id,
      parameters: {},
      template_id: templateInput.id,
      text: 'Text',
      title: 'Title',
      updated_at: expect.any(String) as string,
    })
    const discussions = await nontransactional(c => findDiscussionByOwner(c, task.id))
    expect(discussions.length).toBe(1)
    expect(discussions[0]).toEqual(result.data)
  })

  test('Template not found', async ({ task }) => {
    const user: UserSession = { applications: ['cash'], email: task.id, name: 'Test User' }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)

    const input = { discussion_id: randomUUID(), id: randomUUID(), parameters: {}, predefined_command: 'INITIALIZE', template_id: randomUUID(), text: 'New text' } as ExecuteCommandInput,
     result = await executeCommand(input)

    expect(result).toEqual({ error: `Given template ${input.template_id} not found`, success: false })
  })

  test('Template other user', async ({ task }) => {
    const user: UserSession = { applications: ['cash'], email: task.id, name: 'Test User' }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)
    const templateInput = { id: randomUUID(), language: 'en', name: 'Template 1', text: 'A test template' }
    await transactional(tx => createOrModifyTemplate(tx, task.id, templateInput))

    const otherUser: UserSession = { applications: ['cash'], email: 'other-user-id', name: 'Test User' }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(otherUser)
    const input = { discussion_id: randomUUID(), id: randomUUID(), parameters: {}, predefined_command: 'INITIALIZE', template_id: templateInput.id, text: 'New text' } as ExecuteCommandInput,
     result = await executeCommand(input)

    expect(result).toEqual({ error: `Given template ${input.template_id} not found`, success: false })
  })

  test('Discussion other user', async ({ task }) => {
    const user: UserSession = { applications: ['cash'], email: task.id, name: 'Test User' }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)
    const templateInput = { id: randomUUID(), language: 'en', name: 'Template 1', text: 'A test template' },
     input1 = { context: 'context', id: randomUUID(), parameters: {}, template_id: templateInput.id, text: 'New text', title: 'New Title' }
    await transactional(async (tx) => {
      await createOrModifyTemplate(tx, task.id, templateInput)
      await createDiscussion(tx, task.id, input1)
    })
    const otherUser: UserSession = { applications: ['cash'], email: 'other-user-id', name: 'Test User' }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(otherUser)
    const templateInput2 = { id: randomUUID(), language: 'en', name: 'Template 1', text: 'A test template' }
    await transactional(async (tx) => {
      await createOrModifyTemplate(tx, otherUser.email, templateInput2)
    })
    const input = { discussion_id: input1.id, id: randomUUID(), parameters: {}, predefined_command: 'IMPROVE', template_id: templateInput2.id, text: 'New text' } as ExecuteCommandInput,
     result = await executeCommand(input)

    expect(result).toEqual({ error: expect.any(String) as string, success: false })
  })
})
describe('executeCommandAction AI integration', () => {
  test('AiPort', async ({ task }) => {
    const user: UserSession = { applications: ['cash'], email: task.id, name: 'Test User' }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)
    const templateInput = { id: randomUUID(), language: 'en', name: 'Template 1', text: 'A test template' }
    await transactional(tx => createOrModifyTemplate(tx, task.id, templateInput))

    const input = { discussion_id: randomUUID(), id: randomUUID(), parameters: {}, predefined_command: 'INITIALIZE', template_id: templateInput.id, text: 'New text' } as ExecuteCommandInput
    await executeCommand(input)

    expect(aiPort).toHaveBeenCalledWith({
      context: 'A test template',
      custom_command: undefined,
      language: 'en',
      predefined_command: 'INITIALIZE',
      profile: undefined,
      selection_end: undefined,
      selection_start: undefined,
      text: input.text,
      title: undefined,
    }, [])
  })

  test('Profile', async ({ task }) => {
    const user: UserSession = { applications: ['cash'], email: task.id, name: 'Test User' }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)
    const profileInput = { id: randomUUID(), language: 'en', text: 'Profile Text' },
     templateInput = { id: randomUUID(), language: 'en', name: 'Template 1', text: 'A test template' }
    await transactional(async (tx) => {
      await createOrModifyTemplate(tx, task.id, templateInput)
      await createOrModifyProfile(tx, task.id, profileInput)
    })

    const input = { discussion_id: randomUUID(), id: randomUUID(), parameters: {}, predefined_command: 'INITIALIZE', template_id: templateInput.id, text: 'New text' } as ExecuteCommandInput
    await executeCommand(input)

    expect(aiPort).toHaveBeenCalledWith(expect.objectContaining({
      profile: 'Profile Text',
    }), [])
  })

  test('Selection', async ({ task }) => {
    const user: UserSession = { applications: ['cash'], email: task.id, name: 'Test User' }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)
    const templateInput = { id: randomUUID(), language: 'en', name: 'Template 1', text: 'A test template' }
    await transactional(tx => createOrModifyTemplate(tx, task.id, templateInput))

    const input = { discussion_id: randomUUID(), id: randomUUID(), parameters: {}, predefined_command: 'INITIALIZE', selection_end: 10, selection_start: 5, template_id: templateInput.id, text: 'New text' } as ExecuteCommandInput
    await executeCommand(input)

    expect(aiPort).toHaveBeenCalledWith(expect.objectContaining({
      selection_end: 10,
      selection_start: 5,
    }), [])
  })

  test('Custom Command', async ({ task }) => {
    const user: UserSession = { applications: ['cash'], email: task.id, name: 'Test User' }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)
    const templateInput = { id: randomUUID(), language: 'en', name: 'Template 1', text: 'A test template' }
    await transactional(tx => createOrModifyTemplate(tx, task.id, templateInput))

    const input = { custom_command: 'Custom Command Text', discussion_id: randomUUID(), id: randomUUID(), parameters: {}, template_id: templateInput.id, text: 'New text' }
    await executeCommand(input)

    expect(aiPort).toHaveBeenCalledWith(expect.objectContaining({
      custom_command: 'Custom Command Text',
      predefined_command: undefined,
    }), [])
  })

  test('No old Commands', async ({ task }) => {
    const user: UserSession = { applications: ['cash'], email: task.id, name: 'Test User' }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)
    const templateInput = { id: randomUUID(), language: 'en', name: 'Template 1', text: 'A test template' }
    await transactional(tx => createOrModifyTemplate(tx, task.id, templateInput))

    const input = { custom_command: 'Custom Command Text', discussion_id: randomUUID(), id: randomUUID(), parameters: {}, template_id: templateInput.id, text: 'New text' }
    await executeCommand(input)

    expect(aiPort).toHaveBeenCalledWith(expect.anything(), [])
  })

  test('Old Commands', async ({ task }) => {
    const user: UserSession = { applications: ['cash'], email: task.id, name: 'Test User' }
    vi.mocked(getAuthenticatedUserSession).mockResolvedValue(user)
    const templateInput = { id: randomUUID(), language: 'en', name: 'Template 1', text: 'A test template' },
     input1 = { context: 'context', id: randomUUID(), parameters: {}, template_id: templateInput.id, text: 'New text', title: 'New Title' },
     input2 = { context: 'context', discussion_id: input1.id, id: randomUUID(), language: 'en', predefined_command: 'INITIALIZE', result: { text: 'Result text', title: 'Result title' }, text: 'New text' } as CommandInput
    await transactional(async (tx) => {
      await createOrModifyTemplate(tx, task.id, templateInput)
      await createDiscussion(tx, task.id, input1)
      await createCommand(tx, task.id, input2)
    })
    const aiPortMock: Mock = aiPort as Mock
    aiPortMock.mockClear()

    const input = { custom_command: 'Custom Command Text', discussion_id: input1.id, id: randomUUID(), parameters: {}, template_id: templateInput.id, text: 'New text 2' } as ExecuteCommandInput
    await executeCommand(input)

    expect(aiPort).toHaveBeenCalledWith(expect.anything(), [expect.objectContaining(input2)])
  })
})
