import { beforeAll, describe, expect, test } from 'vitest'
import type { Context, DatabaseHandle } from '../Context.js'
import { extractParameters, getMyTemplates, updateTemplate, type TemplateInput } from './Template.js'
import { Pool, type PoolClient } from 'pg'
import { migrateDatabase } from '../migrateDatabase.js'
import { PostgresMock } from 'pgmock'
import { v4 as uuid } from 'uuid'

const mock = await PostgresMock.create()
const connectionString = await mock.listen(5432)

describe('Templates', () => {
  let db: DatabaseHandle | undefined = undefined

  beforeAll(async () => {
    const pool = new Pool({ connectionString })
    const client = await pool.connect()
    await migrateDatabase(client)
    client.release()
    db = {
      inTransaction: async <T>(fn: (client: PoolClient) => Promise<T>): Promise<T> => {
        const client = await pool.connect()
        const result = await fn(client)
        client.release()
        return result
      },
    }
  }, 100000)

  test('No Templates', async () => {
    const context = { user: { email: 'notemplates@example.com' }, db } as Context
    const result = await getMyTemplates(context)
    expect(result).toEqual([])
  })

  test('Insert and Return', async () => {
    const input = { id: uuid(), name: 'Valid Template', language: 'en', text: 'Sample text' }
    const context = { user: { email: 'addandreturn@example.com' }, db } as Context
    await updateTemplate(context, input)
    const templates = await getMyTemplates(context)
    expect(templates.length).toBe(1)
    expect(templates[0]?.id).toBe(input.id)
    expect(templates[0]?.name).toBe(input.name)
    expect(templates[0]?.language).toBe(input.language)
    expect(templates[0]?.text).toBe(input.text)
    expect(templates[0]?.owner_id).toBe(context.user.email)
    expect(templates[0]?.parameters).toEqual([])
  })

  test('Invalid Input', async () => {
    const input = { id: uuid(), name: 'Valid Template', language: 'en', text: 'Sample text' }
    const context = { user: { email: 'invalidInput@example.com' }, db } as Context
    await expect(updateTemplate(context, { ...input, id: undefined } as unknown as TemplateInput)).rejects.toThrow('Invalid template ID')
    await expect(updateTemplate(context, { ...input, id: '1' })).rejects.toThrow('Invalid template ID')
    await expect(updateTemplate(context, { ...input, name: undefined } as unknown as TemplateInput)).rejects.toThrow('Template name is required')
    await expect(updateTemplate(context, { ...input, name: '' })).rejects.toThrow('Template name is required')
    await expect(updateTemplate(context, { ...input, language: undefined } as unknown as TemplateInput)).rejects.toThrow('Template language is required')
    await expect(updateTemplate(context, { ...input, language: '' })).rejects.toThrow('Template language is required')
    await expect(updateTemplate(context, { ...input, text: undefined } as unknown as TemplateInput)).rejects.toThrow('Template text is required')
    await expect(updateTemplate(context, { ...input, text: '' })).rejects.toThrow('Template text is required')
    const result = await getMyTemplates(context)
    expect(result).toEqual([])
  })

  test('Update from other User', async () => {
    const input = { id: uuid(), name: 'Valid Template', language: 'en', text: 'Sample text' }
    const context1 = { user: { email: 'updatefromotheruser1@example.com' }, db } as Context
    await updateTemplate(context1, input)
    const context2 = { user: { email: 'updatefromotheruser2@example.com' }, db } as Context
    await expect(updateTemplate(context2, { ...input, name: 'Modified Name' })).rejects.toThrow('You do not have permission to modify this template')
  })

  test('Update from self', async () => {
    const input = { id: uuid(), name: 'Valid Template', language: 'en', text: 'Sample text' }
    const context = { user: { email: 'updatefromself@example.com' }, db } as Context
    await updateTemplate(context, input)
    await updateTemplate(context, { ...input, name: 'Modified Name' })
    const templates = await getMyTemplates(context)
    expect(templates.length).toBe(1)
    expect(templates[0]?.id).toBe(input.id)
    expect(templates[0]?.name).toBe('Modified Name')
    expect(templates[0]?.language).toBe(input.language)
    expect(templates[0]?.text).toBe(input.text)
    expect(templates[0]?.owner_id).toBe(context.user.email)
    expect(templates[0]?.parameters).toEqual([])
  })
})

describe('extractParameters', () => {
  test('Empty Text', () => {
    const result = extractParameters('')
    expect(result).toEqual([])
  })

  test('Only Param', () => {
    const result = extractParameters('{param1:STRING}')
    expect(result).toEqual([{ name: 'param1', type: 'STRING', startPosition: 0, endPosition: 15, values: undefined }])
  })

  test('Single Param', () => {
    const result = extractParameters('This is a {param1:STRING} in a text')
    expect(result).toEqual([{ name: 'param1', type: 'STRING', startPosition: 10, endPosition: 25, values: undefined }])
  })

  test('Multiple Parameters', () => {
    const result = extractParameters('Params: {p1:STRING}, {p2:SELECT:val1,val2}, and {p3:TEXT}')
    expect(result).toEqual([
      { name: 'p1', type: 'STRING', startPosition: 8, endPosition: 19, values: undefined },
      { name: 'p2', type: 'SELECT', startPosition: 21, endPosition: 42, values: ['val1', 'val2'] },
      { name: 'p3', type: 'TEXT', startPosition: 48, endPosition: 57, values: undefined },
    ])
  })
})
