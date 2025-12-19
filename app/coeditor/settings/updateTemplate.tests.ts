import { describe, expect, test } from 'vitest'
import { findProfilesByOwner } from '../Profile'
import { pglite, setUser } from '../../../vitest.setup'
import { findTemplatesByOwner } from '../Template'
import { updateTemplate } from './updateTemplate'
import { v4 as randomUUID } from 'uuid'

describe('Update Template', () => {
  test('Create new template', async ({ task }) => {
    setUser(task.id)

    const templatesBefore = await findTemplatesByOwner(pglite, task.id)
    expect(templatesBefore.length).toBe(2)

    const input = { id: randomUUID(), language: 'en', name: 'Test', text: 'Original template text' }
    expect(await updateTemplate(input)).toEqual({})

    const templates = await findTemplatesByOwner(pglite, task.id)
    expect(templates.length).toBe(3)
    expect(templates[2]).toMatchObject(input)
  })

  test('Update existing template', async ({ task }) => {
    setUser(task.id)
    const input = { id: randomUUID(), language: 'en', name: 'Test', text: 'Original template text' }
    expect(await updateTemplate(input)).toEqual({})
    const input2 = { id: input.id, language: 'en', name: 'Test2', text: 'New template text' }
    expect(await updateTemplate(input2)).toEqual({})

    const templates = await findTemplatesByOwner(pglite, task.id)
    expect(templates.length).toBe(1)
    expect(templates[0]).toMatchObject(input2)
  })

  test('Update invalid input', async ({ task }) => {
    setUser(task.id)
    expect(await updateTemplate(undefined)).toEqual({ error: 'Id can\'t be blank' })
    expect(await updateTemplate({})).toEqual({ error: 'Id can\'t be blank' })
    expect(await updateTemplate({ id: '', language: 'en', name: 'Test', text: '' })).toEqual({ error: 'Id can\'t be blank' })
    expect(await updateTemplate({ id: randomUUID(), language: '', name: 'Test', text: 'Text' })).toEqual({ error: 'Language can\'t be blank' })
    expect(await updateTemplate({ id: randomUUID(), language: 'en', name: '', text: 'Text' })).toEqual({ error: 'Name can\'t be blank' })

    const profiles = await findProfilesByOwner(pglite, task.id)
    expect(profiles.length).toBe(0)
  })
})
