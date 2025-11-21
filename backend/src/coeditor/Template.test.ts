/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { type PoolClient } from 'pg'
import type { Context } from '../Context.js'
import { getMyTemplates, updateTemplate, type Template } from './Template.js'
import { jest } from '@jest/globals'

function fromClientQueryMock(clientQueryMock: jest.Mock): Context {
  const inTransactionMock = async <T>(cb: (client: PoolClient) => Promise<T>): Promise<T> => {
    const client = { query: clientQueryMock } as unknown as PoolClient
    return await cb(client)
  }
  return { user: { email: 'test@example.com' }, db: { inTransaction: inTransactionMock } } as Context
}

describe('getMyTemplates', () => {
  test('Correct Query', async () => {
    const clientQueryMock = jest.fn<() => Promise<{ rows: Template[] }>>().mockResolvedValue({ rows: [] })
    const context = fromClientQueryMock(clientQueryMock)
    await getMyTemplates(context)
    expect(clientQueryMock).toHaveBeenCalledTimes(1)
    expect(clientQueryMock).toHaveBeenCalledWith('SELECT * FROM template WHERE owner_id = $1', ['test@example.com'])
  })

  test('No templates', async () => {
    const clientQueryMock = jest.fn<() => Promise<{ rows: Template[] }>>().mockResolvedValue({ rows: [] })
    const context = fromClientQueryMock(clientQueryMock)
    const templates = await getMyTemplates(context)
    expect(templates).toEqual([])
  })

  test('Some templates', async () => {
    const template = { id: '1', name: 'Template 1', language: 'en', text: 'Sample text', parameters: [], owner_id: 'test@example.com', created_at: new Date(), updated_at: new Date() }
    const clientQueryMock = jest.fn<() => Promise<{ rows: Template[] }>>().mockResolvedValue({ rows: [template] })
    const context = fromClientQueryMock(clientQueryMock)
    const templates = await getMyTemplates(context)
    expect(templates).toEqual([template])
  })
})

const template = { id: '550e8400-e29b-41d4-a716-446655440000', name: 'Valid Template', language: 'en', text: 'Sample text' }

describe('updateTemplate', () => {
  test('Invalid Input', async () => {
    const clientQueryMock = jest.fn<() => Promise<{ rows: Template[] }>>().mockResolvedValue({ rows: [] })
    const context = fromClientQueryMock(clientQueryMock)
    await expect(updateTemplate(context, { ...template, id: undefined } as any)).rejects.toThrow('Invalid template ID')
    await expect(updateTemplate(context, { ...template, id: '1' })).rejects.toThrow('Invalid template ID')
    await expect(updateTemplate(context, { ...template, name: undefined } as any)).rejects.toThrow('Template name is required')
    await expect(updateTemplate(context, { ...template, name: '' })).rejects.toThrow('Template name is required')
    await expect(updateTemplate(context, { ...template, language: undefined } as any)).rejects.toThrow('Template language is required')
    await expect(updateTemplate(context, { ...template, language: '' })).rejects.toThrow('Template language is required')
    await expect(updateTemplate(context, { ...template, text: undefined } as any)).rejects.toThrow('Template text is required')
    await expect(updateTemplate(context, { ...template, text: '' })).rejects.toThrow('Template text is required')
    await updateTemplate(context, template)
  })

  test('Other User', async () => {
    const existingTemplate = { ...template, owner_id: 'other@example.com', parameters: [], created_at: new Date(), updated_at: new Date() }
    const clientQueryMock = jest.fn<() => Promise<{ rows: Template[] }>>().mockResolvedValue({ rows: [existingTemplate] })
    const context = fromClientQueryMock(clientQueryMock)
    await expect(updateTemplate(context, { ...template })).rejects.toThrow('You do not have permission to modify this template')
  })

  // eslint-disable-next-line jest/no-commented-out-tests
  /*
  //TODO

  test('Update', async () => {
  })

  test('Insert', async () => {
  })
  */
})

describe('extractParameters', () => {
  // TODO: Tests for extractParameters are now in TemplateUtils.test.ts
})
