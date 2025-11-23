import { beforeAll, describe, expect, test } from 'vitest'
import type { Context, DatabaseHandle } from '../../Context.js'
import { type PoolClient } from 'pg'
import { migrateDatabase } from '../../migrateDatabase.js'
import { v4 as uuid } from 'uuid'
import { executeCommand } from './executeCommand.js'
import { updateTemplate } from '../template/updateTemplate.js'
import { PGlite } from '@electric-sql/pglite'
import { startDiscussion } from '../discussion/startDiscussion.js'

describe.todo('Command Integration Tests', () => {
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

  test('Execute Command - Custom Command', async () => {
    const templateInput = {
      id: uuid(),
      name: 'Test Template',
      language: 'en',
      text: 'Template with {param:STRING}',
    }
    const context = { user: { email: 'executecommand@discussion.com' }, db } as Context

    // Create template and discussion
    await updateTemplate(context, templateInput)

    const discussionInput = {
      id: uuid(),
      text: 'Initial text',
      template_id: templateInput.id,
      parameters: { param: 'initial value' },
    }

    await startDiscussion(context, discussionInput)

    // Execute custom command
    const commandInput = {
      id: uuid(),
      discussionId: discussionInput.id,
      currentText: 'Updated text',
      parameters: { param: 'updated value' },
      selectionStart: 0,
      selectionEnd: 5,
      command: 'Make this better',
    }

    const updatedDiscussion = await executeCommand(context, commandInput)
    expect(updatedDiscussion.text).toBe('Updated text')
    expect(updatedDiscussion.parameters).toEqual({ param: 'updated value' })
    expect(updatedDiscussion.context).toBe('Template with updated value')
  })

  test('Execute Command - Predefined Command', async () => {
    const templateInput = {
      id: uuid(),
      name: 'Test Template',
      language: 'en',
      text: 'Simple template',
    }
    const context = { user: { email: 'executepredefined@discussion.com' }, db } as Context

    // Create template and discussion
    await updateTemplate(context, templateInput)

    const discussionInput = {
      id: uuid(),
      text: 'Initial text',
      template_id: templateInput.id,
      parameters: {},
    }

    await startDiscussion(context, discussionInput)

    // Execute predefined command
    const commandInput = {
      id: uuid(),
      discussionId: discussionInput.id,
      currentText: 'Text to improve',
      parameters: {},
      predefinedCommand: 'IMPROVE' as const,
    }

    const updatedDiscussion = await executeCommand(context, commandInput)
    expect(updatedDiscussion.text).toBe('Text to improve')
  })

  test('Execute Command - Invalid Input', async () => {
    const context = { user: { email: 'invalidcommand@discussion.com' }, db } as Context

    // Test various invalid inputs
    await expect(executeCommand(context, {})).rejects.toThrow('ID is required')
    await expect(executeCommand(context, { id: 'invalid' })).rejects.toThrow('Invalid ID')
    await expect(executeCommand(context, { id: uuid() })).rejects.toThrow('Discussion ID is required')
    await expect(executeCommand(context, { id: uuid(), discussionId: 'invalid' })).rejects.toThrow('Invalid Discussion ID')
    await expect(executeCommand(context, {
      id: uuid(),
      discussionId: uuid(),
    })).rejects.toThrow('Parameters are required')
    await expect(executeCommand(context, {
      id: uuid(),
      discussionId: uuid(),
      parameters: {},
    })).rejects.toThrow('Either command or predefinedCommand is required')
    await expect(executeCommand(context, {
      id: uuid(),
      discussionId: uuid(),
      parameters: {},
      command: '',
    })).rejects.toThrow('Command cannot be empty')
    await expect(executeCommand(context, {
      id: uuid(),
      discussionId: uuid(),
      parameters: {},
      predefinedCommand: 'INVALID',
    })).rejects.toThrow('Invalid predefinedCommand')
  })

  test('Execute Command - Discussion Not Found', async () => {
    const context = { user: { email: 'commandnotfound@discussion.com' }, db } as Context
    const nonExistentDiscussionId = uuid()

    const commandInput = {
      id: uuid(),
      discussionId: nonExistentDiscussionId,
      currentText: 'Some text',
      parameters: {},
      command: 'Some command',
    }

    await expect(executeCommand(context, commandInput)).rejects.toThrow('Discussion Not Found')
  })

  test('Execute Command - Template Not Found', async () => {
    const templateInput = {
      id: uuid(),
      name: 'Test Template',
      language: 'en',
      text: 'Template text',
    }
    const context1 = { user: { email: 'templateowner@discussion.com' }, db } as Context
    const context2 = { user: { email: 'otheruser@discussion.com' }, db } as Context

    // Create template with user 1
    await updateTemplate(context1, templateInput)

    // Start discussion with user 1
    const discussionInput = {
      id: uuid(),
      text: 'Initial text',
      template_id: templateInput.id,
      parameters: {},
    }

    await startDiscussion(context1, discussionInput)

    // Try to execute command as user 2 (who doesn't own the template)
    const commandInput = {
      id: uuid(),
      discussionId: discussionInput.id,
      currentText: 'Updated text',
      parameters: {},
      command: 'Some command',
    }

    await expect(executeCommand(context2, commandInput)).rejects.toThrow('Template not found')
  })
})
