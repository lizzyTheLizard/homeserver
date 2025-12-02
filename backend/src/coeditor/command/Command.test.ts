import { beforeAll, beforeEach, describe, expect, test, Mock, vi } from 'vitest'
import type { Context, DatabaseHandle } from '../../Context.js'
import { type PoolClient } from 'pg'
import { migrateDatabase } from '../../migrateDatabase.js'
import { v4 as uuid } from 'uuid'
import { executeCommand } from './executeCommand.js'
import { updateTemplate } from '../template/updateTemplate.js'
import { PGlite } from '@electric-sql/pglite'
import { startDiscussion } from '../discussion/startDiscussion.js'
import { Template } from '../template/Template.js'
import { Discussion } from '../discussion/Discussion.js'
import { aiPort } from './aiPort.js'
import { getMyDiscussions } from '../discussion/getDiscussion.js'
import { findCommandById } from './getCommand.js'
import { CommandResult, CommandWithoutResult } from './Command.js'
import { updateProfile } from '../profile/updateProfile.js'
import { Profile } from '../profile/Profile.js'

vi.mock(import('./aiPort.js'), () => {
  const mock = vi.fn()
  return {
    aiPort: mock,
  }
})

async function createTemplate(context: Context): Promise<Template> {
  const templateInput = {
    id: uuid(),
    name: 'Test Template',
    language: 'en',
    text: 'This is a template with {param:STRING} parameter',
  }
  return await updateTemplate(context, templateInput)
}

async function createDiscussion(context: Context, template: Template): Promise<Discussion> {
  const discussionInput = {
    id: uuid(),
    text: 'Initial discussion text',
    template_id: template.id,
    parameters: { param: 'value' },
  }
  return await startDiscussion(context, discussionInput)
}

async function createProfile(context: Context, language: string): Promise<Profile> {
  const profileInput = {
    language,
    text: 'This is a profile text',
  }
  return await updateProfile(context, profileInput)
}

describe('Command Integration Tests', () => {
  const aiPortMock = aiPort as unknown as Mock<(input: CommandWithoutResult) => Promise<CommandResult>>
  let db: DatabaseHandle | undefined = undefined

  beforeAll(async () => {
    const pglite = new PGlite() as unknown as PoolClient
    await migrateDatabase(pglite)
    db = {
      inTransaction: async <T>(fn: (client: PoolClient) => Promise<T>): Promise<T> => {
        const result = await fn(pglite)
        return result
      },
    }
  })

  beforeEach(() => {
    aiPortMock.mockReset()
    aiPortMock.mockReturnValue(Promise.resolve({
      newText: 'AI Generated Content',
      newTitle: 'AI Generated Title',
      durationMs: 500,
    }))
  })

  test('Invalid Input', async () => {
    const context = { user: { email: 'invalidInput@command.com' }, db } as Context
    const template = await createTemplate(context)
    const discussion = await createDiscussion(context, template)
    const input = { id: uuid(), discussion_id: discussion.id, template_id: template.id, text: 'Some text', parameters: { param: 'value2' }, predefinedCommand: 'IMPROVE' }
    await expect(executeCommand(context, { ...input, predefinedCommand: undefined })).rejects.toThrow('No command given')
    await expect(executeCommand(context, { ...input, id: undefined })).rejects.toThrow('Id can\'t be blank')
    await expect(executeCommand(context, { ...input, id: '1' })).rejects.toThrow('Id must be a valid UUID')
    await expect(executeCommand(context, { ...input, discussion_id: undefined })).rejects.toThrow('Discussion id can\'t be blank')
    await expect(executeCommand(context, { ...input, discussion_id: '1' })).rejects.toThrow('Discussion id must be a valid UUID')
    await expect(executeCommand(context, { ...input, template_id: undefined })).rejects.toThrow('Template id can\'t be blank')
    await expect(executeCommand(context, { ...input, template_id: '1' })).rejects.toThrow('Template id must be a valid UUID')
    await expect(executeCommand(context, { ...input, parameters: undefined })).rejects.toThrow('Parameters can\'t be blank')
    await expect(executeCommand(context, { ...input, parameters: {} })).rejects.toThrow('Missing parameter \'param\'')
    await expect(executeCommand(context, input)).resolves.toBeDefined()
  })

  test('Missing Discussion', async () => {
    const context = { user: { email: 'missingDiscussion@command.com' }, db } as Context
    const input = { id: uuid(), discussion_id: uuid(), template_id: uuid(), text: 'Some text', parameters: { param: 'value2' }, customCommand: 'This is a test' }
    await expect(executeCommand(context, input)).rejects.toThrow(`Discussion '${input.discussion_id}' Not Found`)
  })

  test('Missing Template', async () => {
    const context = { user: { email: 'missingTemplate@command.com' }, db } as Context
    const template = await createTemplate(context)
    const discussion = await createDiscussion(context, template)
    const input = { id: uuid(), discussion_id: discussion.id, template_id: uuid(), text: 'Some text', parameters: { param: 'value2' }, customCommand: 'This is a test' }
    await expect(executeCommand(context, input)).rejects.toThrow(`Template '${input.template_id}' Not Found`)
  })

  test('Discussion from other user', async () => {
    const context1 = { user: { email: 'discussionfromother@command.com' }, db } as Context
    const template = await createTemplate(context1)
    const discussion = await createDiscussion(context1, template)
    const input = { id: uuid(), discussion_id: discussion.id, template_id: template.id, text: 'Some text', parameters: { param: 'value2' }, customCommand: 'This is a test' }
    const context2 = { user: { email: 'discussionfromother2@command.com' }, db } as Context
    await expect(executeCommand(context2, input)).rejects.toThrow(`You do not have permission to modify discussion '${input.discussion_id}'`)
  })

  test('Custom Command', async () => {
    const context = { user: { email: 'custom@command.com' }, db } as Context
    const template = await createTemplate(context)
    const discussion = await createDiscussion(context, template)
    const profile = await createProfile(context, 'en')
    const input = { id: uuid(), discussion_id: discussion.id, template_id: template.id, text: 'Some text', parameters: { param: 'value2' }, customCommand: 'This is a test' }
    const result = await executeCommand(context, input)
    expect(result).toEqual({
      ...discussion,
      text: 'AI Generated Content',
      title: 'AI Generated Title',
      context: 'This is a template with value2 parameter',
      parameters: { param: 'value2' },
      updated_at: expect.any(Date) as Date,
    })
    expect(aiPortMock).toHaveBeenCalledExactlyOnceWith({
      id: input.id,
      text: input.text,
      discussion_id: discussion.id,
      template_id: template.id,
      custom_command: 'This is a test',
      title: discussion.title,
      language: template.language,
      profile: profile.text,
      context: 'This is a template with value2 parameter',
    }, [])
  })

  test('Selection', async () => {
    const context = { user: { email: 'selection@command.com' }, db } as Context
    const template = await createTemplate(context)
    const discussion = await createDiscussion(context, template)
    const input = { id: uuid(), discussion_id: discussion.id, template_id: template.id, text: 'Some text', parameters: { param: 'value2' }, customCommand: 'This is a test', selection_start: 3, selection_end: 7 }
    await executeCommand(context, input)
    expect(aiPortMock).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({
      selection_start: input.selection_start,
      selection_end: input.selection_end,
    }), [])
  })

  test('No Profile', async () => {
    const context = { user: { email: 'noprofile@command.com' }, db } as Context
    const template = await createTemplate(context)
    const discussion = await createDiscussion(context, template)
    const input = { id: uuid(), discussion_id: discussion.id, template_id: template.id, text: 'Some text', parameters: { param: 'value2' }, customCommand: 'This is a test', selection_start: 3, selection_end: 7 }
    await executeCommand(context, input)
    expect(aiPortMock).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({
      profile: undefined,
    }), [])
  })

  test('Predefined Command', async () => {
    const context = { user: { email: 'predefined@command.com' }, db } as Context
    const template = await createTemplate(context)
    const discussion = await createDiscussion(context, template)
    const input = { id: uuid(), discussion_id: discussion.id, template_id: template.id, text: 'Some text', parameters: { param: 'value2' }, predefinedCommand: 'IMPROVE' }
    await executeCommand(context, input)
    expect(aiPortMock).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({
      predefined_command: 'IMPROVE',
      custom_command: undefined,
    }), [])
  })

  test('Updated Discussion', async () => {
    const context = { user: { email: 'updated@command.com' }, db } as Context
    const template = await createTemplate(context)
    const template2 = await createTemplate(context)
    const discussion = await createDiscussion(context, template)
    const input = { id: uuid(), discussion_id: discussion.id, template_id: template2.id, text: 'Some text', parameters: { param: 'value2' }, predefinedCommand: 'IMPROVE' }
    const result = await executeCommand(context, input)

    const receivedDiscussions = await getMyDiscussions(context)
    expect(receivedDiscussions).toEqual([result])
  })

  test('Insert Command', async () => {
    const context = { user: { email: 'updated@command.com' }, db } as Context
    const template = await createTemplate(context)
    const discussion = await createDiscussion(context, template)
    const profile = await createProfile(context, 'en')
    const input = { id: uuid(), discussion_id: discussion.id, template_id: template.id, text: 'Some text', parameters: { param: 'value2' }, predefinedCommand: 'IMPROVE' }
    await executeCommand(context, input)

    const insertedCommand = await db?.inTransaction(async client => findCommandById(client, input.id))
    expect(insertedCommand).toEqual({
      id: input.id,
      discussion_id: input.discussion_id,
      template_id: input.template_id,
      text: input.text,
      title: discussion.title,
      context: 'This is a template with value2 parameter',
      language: template.language,
      profile: profile.text,
      selection_end: undefined,
      selection_start: undefined,
      result: { newText: 'AI Generated Content', newTitle: 'AI Generated Title', durationMs: 500 },
      predefined_command: 'IMPROVE',
    })
  })

  test('Commands So Far', async () => {
    const context = { user: { email: 'commandsSoFar@command.com' }, db } as Context
    const template = await createTemplate(context)
    const discussion = await createDiscussion(context, template)
    const input = { id: uuid(), discussion_id: discussion.id, template_id: template.id, text: 'Some text', parameters: { param: 'value2' }, customCommand: 'This is a test' }
    const oldInput = { ...input, id: uuid() }
    await executeCommand(context, oldInput)
    const oldCommand = await db?.inTransaction(c => findCommandById(c, oldInput.id))
    aiPortMock.mockClear()
    await executeCommand(context, input)
    expect(aiPortMock).toHaveBeenCalledExactlyOnceWith(expect.anything(), [oldCommand])
  })
})
