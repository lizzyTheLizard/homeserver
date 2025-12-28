import { beforeEach, describe, expect, Mock, test, vi } from 'vitest'
import { v4 as randomUUID } from 'uuid'
import { findDiscussionByOwner } from './Discussion'
import { aiPort } from './AiPort'
import { transactional } from '@/app/shared/db'
import { createOrModifyTemplate } from './Template'
import { CommandInput, executeCommand, findNumberOfCommands } from './Command'
import { createOrModifyProfile } from './Profile'
import { BackendError } from '../shared/BackendError'

const { fn } = await vi.hoisted(async () => await import('storybook/test'))

vi.mock('./AiPort', () => ({
  aiPort: fn().mockReturnValue({ text: 'Text', title: 'Title', durationMs: 100 }),
}))

describe('Find Number of Commands', () => {
  test('Incement', async ({ task }) => {
    const templateInput = { id: randomUUID(), name: 'Template 1', text: 'A test template', language: 'en' }
    const input: CommandInput = { id: randomUUID(), discussion_id: randomUUID(), template_id: templateInput.id, text: 'New text', parameters: {}, predefined_command: 'INITIALIZE' }

    const beforeTest = await transactional(async (client) => {
      return await findNumberOfCommands(client)
    })

    const result = await transactional(async (client) => {
      await createOrModifyTemplate(client, task.id, templateInput)
      await executeCommand(client, task.id, input)
      return await findNumberOfCommands(client)
    })

    expect(result).toEqual(beforeTest + 1)
  })
})

describe('Execute Command', () => {
  beforeEach(() => {
    const aiPortMock: Mock = aiPort as Mock
    aiPortMock.mockClear()
  })

  test('New Discussion', async ({ task }) => {
    const templateInput = { id: randomUUID(), name: 'Template 1', text: 'A test template', language: 'en' }
    const input: CommandInput = { id: randomUUID(), discussion_id: randomUUID(), template_id: templateInput.id, text: 'New text', parameters: {}, predefined_command: 'INITIALIZE' }

    const result = await transactional(async (client) => {
      await createOrModifyTemplate(client, task.id, templateInput)
      return await executeCommand(client, task.id, input)
    })

    expect(result).toEqual({
      id: input.discussion_id,
      template_id: templateInput.id,
      text: 'Text', title: 'Title',
      parameters: {},
      owner_id: task.id,
      context: 'A test template',
      created_at: expect.any(Date) as Date,
      updated_at: expect.any(Date) as Date },
    )
  })

  test('New Discussion Created', async ({ task }) => {
    const templateInput = { id: randomUUID(), name: 'Template 1', text: 'A test template', language: 'en' }
    const input: CommandInput = { id: randomUUID(), discussion_id: randomUUID(), template_id: templateInput.id, text: 'New text', parameters: {}, predefined_command: 'INITIALIZE' }

    const result = await transactional(async (client) => {
      await createOrModifyTemplate(client, task.id, templateInput)
      return await executeCommand(client, task.id, input)
    })

    const discussions = await transactional(c => findDiscussionByOwner(c, task.id))
    expect(discussions.length).toBe(1)
    expect(discussions[0]).toEqual(result)
  })

  test('Existing Discussion', async ({ task }) => {
    const templateInput = { id: randomUUID(), name: 'Template 1', text: 'A test template', language: 'en' }
    const input1: CommandInput = { id: randomUUID(), discussion_id: randomUUID(), template_id: templateInput.id, text: 'Original text', parameters: {}, predefined_command: 'INITIALIZE' }
    const input: CommandInput = { id: randomUUID(), discussion_id: input1.discussion_id, template_id: templateInput.id, text: 'New text', parameters: {}, predefined_command: 'IMPROVE' }

    const result = await transactional(async (client) => {
      await createOrModifyTemplate(client, task.id, templateInput)
      await executeCommand(client, task.id, input1)
      return await executeCommand(client, task.id, input)
    })

    expect(result).toEqual({
      id: input.discussion_id,
      template_id: templateInput.id,
      text: 'Text', title: 'Title',
      parameters: {},
      owner_id: task.id,
      context: 'A test template',
      created_at: expect.any(Date) as Date,
      updated_at: expect.any(Date) as Date },
    )
  })

  test('Existing Discussion Updated', async ({ task }) => {
    const templateInput = { id: randomUUID(), name: 'Template 1', text: 'A test template', language: 'en' }
    const input1: CommandInput = { id: randomUUID(), discussion_id: randomUUID(), template_id: templateInput.id, text: 'Original text', parameters: {}, predefined_command: 'INITIALIZE' }
    const input: CommandInput = { id: randomUUID(), discussion_id: input1.discussion_id, template_id: templateInput.id, text: 'New text', parameters: {}, predefined_command: 'IMPROVE' }

    const result = await transactional(async (client) => {
      await createOrModifyTemplate(client, task.id, templateInput)
      await executeCommand(client, task.id, input1)
      return await executeCommand(client, task.id, input)
    })

    const discussions = await transactional(c => findDiscussionByOwner(c, task.id))
    expect(discussions.length).toBe(1)
    expect(discussions[0]).toEqual(result)
  })

  test('AiPort', async ({ task }) => {
    const templateInput = { id: randomUUID(), name: 'Template 1', text: 'A test template', language: 'en' }
    const input: CommandInput = { id: randomUUID(), discussion_id: randomUUID(), template_id: templateInput.id, text: 'New text', parameters: {}, predefined_command: 'INITIALIZE' }

    await transactional(async (client) => {
      await createOrModifyTemplate(client, task.id, templateInput)
      return await executeCommand(client, task.id, input)
    })

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
    const templateInput = { id: randomUUID(), name: 'Template 1', text: 'A test template', language: 'en' }
    const profileInput = { id: randomUUID(), text: 'Profile Text', language: 'en' }
    const input: CommandInput = { id: randomUUID(), discussion_id: randomUUID(), template_id: templateInput.id, text: 'New text', parameters: {}, predefined_command: 'INITIALIZE' }

    await transactional(async (client) => {
      await createOrModifyTemplate(client, task.id, templateInput)
      await createOrModifyProfile(client, task.id, profileInput)
      return await executeCommand(client, task.id, input)
    })

    expect(aiPort).toHaveBeenCalledWith(expect.objectContaining({
      profile: 'Profile Text',
    }), [])
  })

  test('Selection', async ({ task }) => {
    const templateInput = { id: randomUUID(), name: 'Template 1', text: 'A test template', language: 'en' }
    const input: CommandInput = { id: randomUUID(), discussion_id: randomUUID(), template_id: templateInput.id, text: 'New text', parameters: {}, predefined_command: 'INITIALIZE', selection_start: 5, selection_end: 10 }

    await transactional(async (client) => {
      await createOrModifyTemplate(client, task.id, templateInput)
      return await executeCommand(client, task.id, input)
    })

    expect(aiPort).toHaveBeenCalledWith(expect.objectContaining({
      selection_start: 5,
      selection_end: 10,
    }), [])
  })

  test('Custom Command', async ({ task }) => {
    const templateInput = { id: randomUUID(), name: 'Template 1', text: 'A test template', language: 'en' }
    const input = { id: randomUUID(), discussion_id: randomUUID(), template_id: templateInput.id, text: 'New text', parameters: {}, custom_command: 'Custom Command Text' }

    await transactional(async (client) => {
      await createOrModifyTemplate(client, task.id, templateInput)
      return await executeCommand(client, task.id, input)
    })

    expect(aiPort).toHaveBeenCalledWith(expect.objectContaining({
      predefined_command: undefined,
      custom_command: 'Custom Command Text',
    }), [])
  })

  test('No old Commands', async ({ task }) => {
    const templateInput = { id: randomUUID(), name: 'Template 1', text: 'A test template', language: 'en' }
    const input = { id: randomUUID(), discussion_id: randomUUID(), template_id: templateInput.id, text: 'New text', parameters: {}, custom_command: 'Custom Command Text' }

    await transactional(async (client) => {
      await createOrModifyTemplate(client, task.id, templateInput)
      return await executeCommand(client, task.id, input)
    })

    expect(aiPort).toHaveBeenCalledWith(expect.anything(), [])
  })

  test('Old Commands', async ({ task }) => {
    const templateInput = { id: randomUUID(), name: 'Template 1', text: 'A test template', language: 'en' }
    const input1: CommandInput = { id: randomUUID(), discussion_id: randomUUID(), template_id: templateInput.id, text: 'New text', parameters: {}, predefined_command: 'INITIALIZE' }
    const input = { id: randomUUID(), discussion_id: input1.discussion_id, template_id: templateInput.id, text: 'New text 2', parameters: {}, custom_command: 'Custom Command Text' }
    const aiPortMock: Mock = aiPort as Mock

    await transactional(async (client) => {
      await createOrModifyTemplate(client, task.id, templateInput)
      await executeCommand(client, task.id, input1)
      aiPortMock.mockClear()
      return await executeCommand(client, task.id, input)
    })

    expect(aiPort).toHaveBeenCalledWith(expect.anything(), [{
      id: input1.id,
      discussion_id: input1.discussion_id,
      created_at: expect.any(Date) as Date,
      custom_command: undefined,
      title: undefined,
      context: 'A test template',
      language: 'en',
      predefined_command: 'INITIALIZE',
      result: { text: 'Text', title: 'Title', durationMs: 100 },
      profile: undefined,
      selection_start: undefined,
      selection_end: undefined,
      text: 'New text',
    }])
  })

  test('Template not found', async ({ task }) => {
    const input: CommandInput = { id: randomUUID(), discussion_id: randomUUID(), template_id: randomUUID(), text: 'New text', parameters: {}, predefined_command: 'INITIALIZE' }

    await expect(transactional(client => executeCommand(client, task.id, input))).rejects.toThrow(BackendError)
  })

  test('Template other user', async ({ task }) => {
    const otherUser = randomUUID()
    const templateInput = { id: randomUUID(), name: 'Template 1', text: 'A test template', language: 'en' }
    const input: CommandInput = { id: randomUUID(), discussion_id: randomUUID(), template_id: templateInput.id, text: 'New text', parameters: {}, predefined_command: 'INITIALIZE' }

    await expect(transactional(async (client) => {
      await createOrModifyTemplate(client, otherUser, templateInput)
      return await executeCommand(client, task.id, input)
    })).rejects.toThrow(BackendError)
  })

  test('Discussion other user', async ({ task }) => {
    const otherUser = randomUUID()
    const templateInput1 = { id: randomUUID(), name: 'Template 1', text: 'A test template', language: 'en' }
    const templateInput = { id: randomUUID(), name: 'Template 1', text: 'A test template', language: 'en' }
    const input1: CommandInput = { id: randomUUID(), discussion_id: randomUUID(), template_id: templateInput1.id, text: 'New text', parameters: {}, predefined_command: 'INITIALIZE' }
    const input: CommandInput = { id: randomUUID(), discussion_id: input1.discussion_id, template_id: templateInput.id, text: 'New text', parameters: {}, predefined_command: 'INITIALIZE' }

    await transactional(async (client) => {
      await createOrModifyTemplate(client, otherUser, templateInput1)
      await executeCommand(client, otherUser, input1)
    })

    await expect(transactional(async (client) => {
      await createOrModifyTemplate(client, task.id, templateInput)
      return await executeCommand(client, task.id, input)
    })).rejects.not.toThrow(BackendError)
  })
})
