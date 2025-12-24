import { describe, expect, Mock, test, vi } from 'vitest'
import { setUser } from '../../../vitest.setup'
import { executeCommand } from './executeCommand'
import { updateTemplate } from '../settings/updateTemplate'
import { v4 as randomUUID } from 'uuid'
import { findDiscussionByOwner } from '../Discussion'
import { aiPort } from './aiPort'
import { updateProfile } from '../settings/updateProfile'
import { transactional } from '@/app/shared/db'

const { fn } = await vi.hoisted(async () => await import('storybook/test'))

vi.mock('./aiPort', () => ({
  aiPort: fn().mockReturnValue({ text: 'Text', title: 'Title', durationMs: 100 }),
}))

describe('Execute Command', () => {
  test('New Discussion', async ({ task }) => {
    setUser(task.id)
    const templateInput = { id: randomUUID(), name: 'Template 1', text: 'A test template', language: 'en' }
    await updateTemplate(templateInput)
    const input = { id: randomUUID(), discussion_id: randomUUID(), template_id: templateInput.id, text: 'New text', parameters: {}, predefinedCommand: 'INITIALIZE' }
    const result = await executeCommand(input)

    const expectedDiscussion = {
      id: input.discussion_id,
      template_id: templateInput.id,
      text: 'Text', title: 'Title',
      parameters: {},
      owner_id: task.id,
      context: 'A test template',
      created_at: expect.any(Date) as Date,
      updated_at: expect.any(Date) as Date }

    expect(result).toEqual({ success: true, data: expectedDiscussion })
    const discussions = await transactional(c => findDiscussionByOwner(c, task.id))
    expect(discussions.length).toBe(1)
    expect(discussions[0]).toEqual(expectedDiscussion)
  })

  test('Existing Discussion', async ({ task }) => {
    setUser(task.id)
    const templateInput = { id: randomUUID(), name: 'Template 1', text: 'A test template', language: 'en' }
    await updateTemplate(templateInput)
    const input1 = { id: randomUUID(), discussion_id: randomUUID(), template_id: templateInput.id, text: 'Original text', parameters: {}, predefinedCommand: 'INITIALIZE' }
    await executeCommand(input1)
    const input = { id: randomUUID(), discussion_id: input1.discussion_id, template_id: templateInput.id, text: 'New text', parameters: {}, predefinedCommand: 'IMPROVE' }
    const result = await executeCommand(input)

    const expectedDiscussion = {
      id: input.discussion_id,
      template_id: templateInput.id,
      text: 'Text', title: 'Title',
      parameters: {},
      owner_id: task.id,
      context: 'A test template',
      created_at: expect.any(Date) as Date,
      updated_at: expect.any(Date) as Date }

    expect(result).toEqual({ success: true, data: expectedDiscussion })
    const discussions = await transactional(c => findDiscussionByOwner(c, task.id))
    expect(discussions.length).toBe(1)
    expect(discussions[0]).toEqual(expectedDiscussion)
  })

  test('AiPort', async ({ task }) => {
    setUser(task.id)
    const templateInput = { id: randomUUID(), name: 'Template 1', text: 'A test template', language: 'en' }
    await updateTemplate(templateInput)
    const input = { id: randomUUID(), discussion_id: randomUUID(), template_id: templateInput.id, text: 'New text', parameters: {}, predefinedCommand: 'INITIALIZE' }
    await executeCommand(input)

    expect(aiPort).toHaveBeenCalledWith({
      id: input.id,
      discussion_id: input.discussion_id,
      text: input.text,
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
    setUser(task.id)
    const templateInput = { id: randomUUID(), name: 'Template 1', text: 'A test template', language: 'en' }
    await updateTemplate(templateInput)
    const profileInput = { text: 'Profile Text', language: 'en' }
    await updateProfile(profileInput)
    const input = { id: randomUUID(), discussion_id: randomUUID(), template_id: templateInput.id, text: 'New text', parameters: {}, predefinedCommand: 'INITIALIZE' }
    await executeCommand(input)

    expect(aiPort).toHaveBeenCalledWith(expect.objectContaining({
      profile: 'Profile Text',
    }), [])
  })

  test('Selection', async ({ task }) => {
    setUser(task.id)
    const templateInput = { id: randomUUID(), name: 'Template 1', text: 'A test template', language: 'en' }
    await updateTemplate(templateInput)
    const input = { id: randomUUID(), discussion_id: randomUUID(), template_id: templateInput.id, text: 'New text', parameters: {}, predefinedCommand: 'INITIALIZE', selection_start: 5, selection_end: 10 }
    await executeCommand(input)

    expect(aiPort).toHaveBeenCalledWith(expect.objectContaining({
      selection_start: 5,
      selection_end: 10,
    }), [])
  })

  test('Custom Command', async ({ task }) => {
    setUser(task.id)
    const templateInput = { id: randomUUID(), name: 'Template 1', text: 'A test template', language: 'en' }
    await updateTemplate(templateInput)
    const input = { id: randomUUID(), discussion_id: randomUUID(), template_id: templateInput.id, text: 'New text', parameters: {}, customCommand: 'Custom Command Text' }
    await executeCommand(input)

    expect(aiPort).toHaveBeenCalledWith(expect.objectContaining({
      predefined_command: undefined,
      custom_command: 'Custom Command Text',
    }), [])
  })

  test('Old Commands', async ({ task }) => {
    const aiPortMock: Mock = aiPort as Mock
    setUser(task.id)
    const templateInput = { id: randomUUID(), name: 'Template 1', text: 'A test template', language: 'en' }
    await updateTemplate(templateInput)
    const input1 = { id: randomUUID(), discussion_id: randomUUID(), template_id: templateInput.id, text: 'New text', parameters: {}, predefinedCommand: 'INITIALIZE' }
    await executeCommand(input1)
    aiPortMock.mockClear()
    const input2 = { id: randomUUID(), discussion_id: input1.discussion_id, template_id: templateInput.id, text: 'New text 2', parameters: {}, customCommand: 'Custom Command Text' }
    await executeCommand(input2)

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
})
