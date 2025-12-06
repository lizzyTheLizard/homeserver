import { beforeAll, describe, expect, test } from 'vitest'
import type { Context, DatabaseHandle } from '../../Context.js'
import { type PoolClient } from 'pg'
import { migrateDatabase } from '../../migrateDatabase.js'
import { v4 as uuid } from 'uuid'
import { updateTemplate } from './updateTemplate.js'
import { deleteTemplate } from './deleteTemplate.js'
import { extractParameters, createContextString } from './extractParameters.js'
import { PGlite } from '@electric-sql/pglite'
import { getMyTemplates } from './getTemplates.js'
import type { Template } from './Template.js'

const defaultTemplates: Template[] = [
  {
    id: expect.any(String) as string,
    name: 'No Context',
    language: 'English',
    text: '',
    parameters: [],
    created_at: expect.any(Date) as Date,
    updated_at: expect.any(Date) as Date,
    owner_id: expect.any(String) as string,
  },
  {
    id: expect.any(String) as string,
    name: 'With Context',
    language: 'English',
    text: '{context:TEXT}',
    parameters: [{ name: 'context', type: 'TEXT', startPosition: 0, endPosition: 14, values: [] }],
    created_at: expect.any(Date) as Date,
    updated_at: expect.any(Date) as Date,
    owner_id: expect.any(String) as string,
  },
]

describe.concurrent('Template Integration Tests', () => {
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

  test('No Templates', async () => {
    const context = { user: { email: 'notemplates@template.com' }, db } as Context
    const result = await getMyTemplates(context)
    expect(result).toEqual(defaultTemplates)
  })

  test('Insert and Return', async () => {
    const input = { id: uuid(), name: 'Valid Template', language: 'en', text: 'Sample text' }
    const context = { user: { email: 'addandreturn@template.com' }, db } as Context
    await updateTemplate(context, input)
    const templates = await getMyTemplates(context)
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    expect(templates).toEqual([{ ...input, created_at: expect.any(Date), updated_at: expect.any(Date), owner_id: context.user.email, parameters: [] }])
  })

  test('Parameters', async () => {
    const input = { id: uuid(), name: 'Valid Template', language: 'en', text: 'Sample text with {param:SELECT:val1,val2}' }
    const context = { user: { email: 'parametersf@template.com' }, db } as Context
    await updateTemplate(context, input)
    const templates = await getMyTemplates(context)
    expect(templates[0]?.parameters).toEqual([{ name: 'param', type: 'SELECT', values: ['val1', 'val2'], startPosition: 17, endPosition: 41 }])
    await updateTemplate(context, { ...input, text: '{test:String}' })
    const templates2 = await getMyTemplates(context)
    expect(templates2[0]?.parameters).toEqual([{ name: 'test', type: 'STRING', startPosition: 0, endPosition: 13, values: [] }])
  })

  test('Invalid Input', async () => {
    const input = { id: uuid(), name: 'Valid Template', language: 'en', text: 'Sample text' }
    const context = { user: { email: 'invalidInput@template.com' }, db } as Context
    await expect(updateTemplate(context, { ...input, id: undefined })).rejects.toThrow('Id can\'t be blank')
    await expect(updateTemplate(context, { ...input, id: '1' })).rejects.toThrow('Id must be a valid UUID')
    await expect(updateTemplate(context, { ...input, name: undefined })).rejects.toThrow('Name can\'t be blank')
    await expect(updateTemplate(context, { ...input, name: '' })).rejects.toThrow('Name can\'t be blank')
    await expect(updateTemplate(context, { ...input, language: undefined })).rejects.toThrow('Language can\'t be blank')
    await expect(updateTemplate(context, { ...input, language: '' })).rejects.toThrow('Language can\'t be blank')
    await expect(updateTemplate(context, { ...input, text: undefined })).rejects.toThrow('Text can\'t be blank')
    const result = await getMyTemplates(context)
    expect(result).toEqual(defaultTemplates)
  })

  test('Update from other User', async () => {
    const input = { id: uuid(), name: 'Valid Template', language: 'en', text: 'Sample text' }
    const context1 = { user: { email: 'updatefromotheruser1@template.com' }, db } as Context
    await updateTemplate(context1, input)
    const context2 = { user: { email: 'updatefromotheruser2@template.com' }, db } as Context
    await expect(updateTemplate(context2, { ...input, name: 'Modified Name' })).rejects.toThrow('You do not have permission to modify this template')
  })

  test('Update from self', async () => {
    const input = { id: uuid(), name: 'Valid Template', language: 'en', text: 'Sample text' }
    const context = { user: { email: 'updatefromself@template.com' }, db } as Context
    await updateTemplate(context, input)
    await updateTemplate(context, { ...input, name: 'Modified Name' })
    const templates = await getMyTemplates(context)
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    expect(templates).toEqual([{ ...input, created_at: expect.any(Date), updated_at: expect.any(Date), name: 'Modified Name', owner_id: context.user.email, parameters: [] }])
  })

  test('Delete', async () => {
    const input = { id: uuid(), name: 'Valid Template', language: 'en', text: 'Sample text' }
    const context = { user: { email: 'delete@template.com' }, db } as Context
    await updateTemplate(context, input)
    await deleteTemplate(context, input.id)
    const templates = await getMyTemplates(context)
    expect(templates).toEqual([...defaultTemplates])
  })

  test('Delete non existing', async () => {
    const context = { user: { email: 'deleteNonExisting@template.com' }, db } as Context
    await deleteTemplate(context, uuid())
    const templates = await getMyTemplates(context)
    expect(templates).toEqual([...defaultTemplates])
  })

  test('Delete wrong user', async () => {
    const input = { id: uuid(), name: 'Valid Template', language: 'en', text: 'Sample text' }
    const context = { user: { email: 'deleteWrongUser1@template.com' }, db } as Context
    await updateTemplate(context, input)
    const context2 = { user: { email: 'deleteWrongUser2@template.com' }, db } as Context
    await expect(deleteTemplate(context2, input.id)).rejects.toThrow('You do not have permission to delete this template')
  })
})

describe.concurrent('extractParameters', () => {
  test('Empty Text', () => {
    const result = extractParameters('')
    expect(result).toEqual([])
  })

  test('Only Param', () => {
    const result = extractParameters('{param1:STRING}')
    expect(result).toEqual([{ name: 'param1', type: 'STRING', startPosition: 0, endPosition: 15, values: [] }])
  })

  test('Single Param', () => {
    const result = extractParameters('This is a {param1:STRING} in a text')
    expect(result).toEqual([{ name: 'param1', type: 'STRING', startPosition: 10, endPosition: 25, values: [] }])
  })

  test('Multiple Parameters', () => {
    const result = extractParameters('Params: {p1:STRING}, {p2:SELECT:val1,val2}, and {p3:TEXT}')
    expect(result).toEqual([
      { name: 'p1', type: 'STRING', startPosition: 8, endPosition: 19, values: [] },
      { name: 'p2', type: 'SELECT', startPosition: 21, endPosition: 42, values: ['val1', 'val2'] },
      { name: 'p3', type: 'TEXT', startPosition: 48, endPosition: 57, values: [] },
    ])
  })
})

describe.concurrent('createContextString', () => {
  test('Empty Template', () => {
    const template: Template = {
      id: uuid(),
      name: 'Test',
      language: 'en',
      text: '',
      parameters: [],
      owner_id: 'test@test.com',
      created_at: new Date(),
      updated_at: new Date(),
    }
    const result = createContextString(template, {})
    expect(result).toBe('')
  })

  test('Template Without Parameters', () => {
    const template: Template = {
      id: uuid(),
      name: 'Test',
      language: 'en',
      text: 'Simple text without parameters',
      parameters: [],
      owner_id: 'test@test.com',
      created_at: new Date(),
      updated_at: new Date(),
    }
    const result = createContextString(template, {})
    expect(result).toBe('Simple text without parameters')
  })

  test('Single Parameter Replacement', () => {
    const template: Template = {
      id: uuid(),
      name: 'Test',
      language: 'en',
      text: 'Hello {name:STRING}',
      parameters: [{ name: 'name', type: 'STRING', startPosition: 6, endPosition: 19, values: [] }],
      owner_id: 'test@test.com',
      created_at: new Date(),
      updated_at: new Date(),
    }
    const result = createContextString(template, { name: 'World' })
    expect(result).toBe('Hello World')
  })

  test('Multiple Parameters Replacement', () => {
    const template: Template = {
      id: uuid(),
      name: 'Test',
      language: 'en',
      text: 'Hello {name:STRING}, you are {age:STRING} years old',
      parameters: [
        { name: 'name', type: 'STRING', startPosition: 6, endPosition: 19, values: [] },
        { name: 'age', type: 'STRING', startPosition: 29, endPosition: 41, values: [] },
      ],
      owner_id: 'test@test.com',
      created_at: new Date(),
      updated_at: new Date(),
    }
    const result = createContextString(template, { name: 'John', age: '25' })
    expect(result).toBe('Hello John, you are 25 years old')
  })

  test('SELECT Parameter Type', () => {
    const template: Template = {
      id: uuid(),
      name: 'Test',
      language: 'en',
      text: 'Your choice: {option:SELECT:val1,val2}',
      parameters: [{ name: 'option', type: 'SELECT', startPosition: 13, endPosition: 38, values: ['val1', 'val2'] }],
      owner_id: 'test@test.com',
      created_at: new Date(),
      updated_at: new Date(),
    }
    const result = createContextString(template, { option: 'val1' })
    expect(result).toBe('Your choice: val1')
  })

  test('TEXT Parameter Type', () => {
    const template: Template = {
      id: uuid(),
      name: 'Test',
      language: 'en',
      text: 'Description: {desc:TEXT}',
      parameters: [{ name: 'desc', type: 'TEXT', startPosition: 13, endPosition: 24, values: [] }],
      owner_id: 'test@test.com',
      created_at: new Date(),
      updated_at: new Date(),
    }
    const result = createContextString(template, { desc: 'Long text description' })
    expect(result).toBe('Description: Long text description')
  })

  test('Missing Parameter Throws Error', () => {
    const template: Template = {
      id: uuid(),
      name: 'Test',
      language: 'en',
      text: 'Hello {name:STRING}',
      parameters: [{ name: 'name', type: 'STRING', startPosition: 6, endPosition: 19, values: [] }],
      owner_id: 'test@test.com',
      created_at: new Date(),
      updated_at: new Date(),
    }
    expect(() => createContextString(template, {})).toThrow('Missing parameter \'name\'')
  })

  test('Missing One of Multiple Parameters', () => {
    const template: Template = {
      id: uuid(),
      name: 'Test',
      language: 'en',
      text: 'Hello {name:STRING}, you are {age:STRING} years old',
      parameters: [
        { name: 'name', type: 'STRING', startPosition: 6, endPosition: 19, values: [] },
        { name: 'age', type: 'STRING', startPosition: 30, endPosition: 42, values: [] },
      ],
      owner_id: 'test@test.com',
      created_at: new Date(),
      updated_at: new Date(),
    }
    expect(() => createContextString(template, { name: 'John' })).toThrow('Missing parameter \'age\'')
  })

  test('Extra Values Are Ignored', () => {
    const template: Template = {
      id: uuid(),
      name: 'Test',
      language: 'en',
      text: 'Hello {name:STRING}',
      parameters: [{ name: 'name', type: 'STRING', startPosition: 6, endPosition: 19, values: [] }],
      owner_id: 'test@test.com',
      created_at: new Date(),
      updated_at: new Date(),
    }
    const result = createContextString(template, { name: 'World', extra: 'ignored' })
    expect(result).toBe('Hello World')
  })
})
