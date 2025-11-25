import { beforeAll, describe, expect, test } from 'vitest'
import type { Context, DatabaseHandle } from '../../Context.js'
import { type PoolClient } from 'pg'
import { migrateDatabase } from '../../migrateDatabase.js'
import { v4 as uuid } from 'uuid'
import { getDiscussion, getMyDiscussions } from './getDiscussion.js'
import { startDiscussion } from './startDiscussion.js'
import { updateTemplate } from '../template/updateTemplate.js'
import { PGlite } from '@electric-sql/pglite'
import { Template } from '../template/Template.js'

async function createTemplate(context: Context): Promise<Template> {
  const templateInput = {
    id: uuid(),
    name: 'Test Template',
    language: 'en',
    text: 'This is a template with {param:STRING} parameter',
  }
  return await updateTemplate(context, templateInput)
}

describe('Discussion Integration Tests', () => {
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

  test('No Discussions', async () => {
    const context = { user: { email: 'nodiscussions@discussion.com' }, db } as Context
    const result = await getMyDiscussions(context)
    expect(result).toEqual([])
  })

  test('Start and Get Discussion', async () => {
    const context = { user: { email: 'startandget@discussion.com' }, db } as Context
    const template = await createTemplate(context)

    // Start first discussion
    const input = { id: uuid(), text: 'Initial discussion text', template_id: template.id, parameters: { param: 'test value' } }
    const discussion = await startDiscussion(context, input)
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    expect(discussion).toEqual({ ...input, owner_id: context.user.email, title: 'New Discussion', context: 'This is a template with test value parameter', created_at: expect.any(Date), updated_at: expect.any(Date) })

    // Check
    const retrievedDiscussion = await getDiscussion(context, discussion.id)
    expect(retrievedDiscussion).toEqual(discussion)
    const retrievedDiscussions = await getMyDiscussions(context)
    expect(retrievedDiscussions).toEqual([discussion])

    // Start 2nd discussion
    const input1 = { id: uuid(), text: 'Discussion 1', template_id: template.id, parameters: { param: 'other' } }
    const discussion1 = await startDiscussion(context, input1)
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    expect(discussion1).toEqual({ ...input1, owner_id: context.user.email, title: 'New Discussion', context: 'This is a template with other parameter', created_at: expect.any(Date), updated_at: expect.any(Date) })

    // Check
    const retrievedDiscussion1 = await getDiscussion(context, discussion1.id)
    expect(retrievedDiscussion1).toEqual(discussion1)
    const retrievedDiscussions1 = await getMyDiscussions(context)
    expect(retrievedDiscussions1).toEqual([discussion, discussion1])
  })

  test('Start Discussion Twice', async () => {
    const context = { user: { email: 'starttwice@discussion.com' }, db } as Context
    const template = await createTemplate(context)
    const input = { id: uuid(), text: 'Initial discussion text', template_id: template.id, parameters: { param: 'test value' } }
    const discussion = await startDiscussion(context, input)
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    expect(discussion).toEqual({ ...input, owner_id: context.user.email, title: 'New Discussion', context: 'This is a template with test value parameter', created_at: expect.any(Date), updated_at: expect.any(Date) })
    const discussion2 = await startDiscussion(context, input)
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    expect(discussion2).toEqual({ ...input, owner_id: context.user.email, title: 'New Discussion', context: 'This is a template with test value parameter', created_at: expect.any(Date), updated_at: expect.any(Date) })

    // Check
    const retrievedDiscussion1 = await getDiscussion(context, discussion.id)
    expect(retrievedDiscussion1).toEqual(discussion2)
    const retrievedDiscussions1 = await getMyDiscussions(context)
    expect(retrievedDiscussions1).toEqual([discussion2])
  })

  test('Get invalid Discussion', async () => {
    const context = { user: { email: 'getfromother1@discussion.com' }, db } as Context
    const notFoundDiscussionId = uuid()
    await expect(getDiscussion(context, notFoundDiscussionId)).rejects.toThrow(`Discussion '${notFoundDiscussionId}' not found`)
    const template = await createTemplate(context)
    const input = { id: uuid(), text: 'Initial discussion text', template_id: template.id, parameters: { param: 'test value' } }
    await startDiscussion(context, input)
    const context2 = { user: { email: 'getfromother2@discussion.com' }, db } as Context
    await expect(getDiscussion(context2, input.id)).rejects.toThrow('You do not have permission to read this discussion')
  })

  test('Invalid Input', async () => {
    const contextOther = { user: { email: 'invalidInputOther@discussion.com' }, db } as Context
    const templateOther = await createTemplate(contextOther)

    const context = { user: { email: 'invalidInput@discussion.com' }, db } as Context
    const template = await createTemplate(context)
    const input = { id: uuid(), text: 'Initial discussion text', template_id: template.id, parameters: { param: 'test value' } }

    await expect(startDiscussion(context, { ...input, id: undefined })).rejects.toThrow('Id can\'t be blank')
    await expect(startDiscussion(context, { ...input, id: '1' })).rejects.toThrow('Id must be a valid UUID')
    await expect(startDiscussion(context, { ...input, text: undefined })).rejects.toThrow('Text can\'t be blank')
    await expect(startDiscussion(context, { ...input, text: '' })).rejects.toThrow('Text can\'t be blank')
    await expect(startDiscussion(context, { ...input, template_id: undefined })).rejects.toThrow('Template id can\'t be blank')
    await expect(startDiscussion(context, { ...input, template_id: '1' })).rejects.toThrow('Template id must be a valid UUID')
    await expect(startDiscussion(context, { ...input, template_id: uuid() })).rejects.toThrow('Template not found')
    await expect(startDiscussion(context, { ...input, template_id: templateOther.id })).rejects.toThrow('You do not have permission to use this template')
    await expect(startDiscussion(context, { ...input, parameters: undefined })).rejects.toThrow('Parameters can\'t be blank')
    await expect(startDiscussion(context, { ...input, parameters: {} })).rejects.toThrow('Missing parameter \'param\'')

    await startDiscussion(context, input)
  })
})
