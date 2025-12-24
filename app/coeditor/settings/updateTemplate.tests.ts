import { describe, expect, test } from 'vitest'
import { findProfilesByOwner } from '../Profile'
import { setUser } from '../../../vitest.setup'
import { findTemplatesByOwner, Template } from '../Template'
import { updateTemplate } from './updateTemplate'
import { v4 as randomUUID } from 'uuid'
import { transactional } from '@/app/shared/db'

describe('Update Template', () => {
  test('Create new template', async ({ task }) => {
    setUser(task.id)

    const templatesBefore = await transactional(c => findTemplatesByOwner(c, task.id))
    expect(templatesBefore.length).toBe(2)

    const input = { id: randomUUID(), language: 'en', name: 'Test', text: 'Original template text' }
    expect(await updateTemplate(input)).toEqual({ success: true, data: expect.objectContaining(input) as Template })

    const templates = await transactional(c => findTemplatesByOwner(c, task.id))
    expect(templates.length).toBe(3)
    expect(templates[2]).toMatchObject(input)
  })

  test('Update existing template', async ({ task }) => {
    setUser(task.id)
    const input = { id: randomUUID(), language: 'en', name: 'Test', text: 'Original template text' }
    expect(await updateTemplate(input)).toEqual({ success: true, data: expect.objectContaining(input) as Template })
    const input2 = { id: input.id, language: 'en', name: 'Test2', text: 'New template text' }
    expect(await updateTemplate(input2)).toEqual({ success: true, data: expect.objectContaining(input2) as Template })

    const templates = await transactional(c => findTemplatesByOwner(c, task.id))
    expect(templates.length).toBe(1)
    expect(templates[0]).toMatchObject(input2)
  })

  test('Update invalid input', async ({ task }) => {
    setUser(task.id)
    expect(await updateTemplate(undefined)).toEqual({ success: false, error: 'Id can\'t be blank' })
    expect(await updateTemplate({})).toEqual({ success: false, error: 'Id can\'t be blank' })
    expect(await updateTemplate({ id: '', language: 'en', name: 'Test', text: '' })).toEqual({ success: false, error: 'Id can\'t be blank' })
    expect(await updateTemplate({ id: randomUUID(), language: '', name: 'Test', text: 'Text' })).toEqual({ success: false, error: 'Language can\'t be blank' })
    expect(await updateTemplate({ id: randomUUID(), language: 'en', name: '', text: 'Text' })).toEqual({ success: false, error: 'Name can\'t be blank' })
    const profiles = await transactional(c => findProfilesByOwner(c, task.id))
    expect(profiles.length).toBe(0)
  })
})
