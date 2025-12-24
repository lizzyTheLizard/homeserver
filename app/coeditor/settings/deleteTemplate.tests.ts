import { describe, expect, test } from 'vitest'
import { updateTemplate } from './updateTemplate'
import { deleteTemplate } from './deleteTemplate'
import { setUser } from '../../../vitest.setup'
import { v4 as randomUUID } from 'uuid'
import { findTemplatesByOwner } from '../Template'
import { transactional } from '@/app/shared/db'

describe('Delete Template', () => {
  test('Delete existing template', async ({ task }) => {
    setUser(task.id)
    const beforeAdd = await transactional(c => findTemplatesByOwner(c, task.id))
    expect(beforeAdd.length).toBe(2)

    const input = { id: randomUUID(), language: 'en', name: 'Template', text: 'Original template text' }
    await updateTemplate(input)
    const templates = await transactional(c => findTemplatesByOwner(c, task.id))
    expect(templates.length).toBe(3)

    const result = await deleteTemplate(input.id)
    expect(result).toEqual({ success: true, data: undefined })
    const templatesAfterDelete = await transactional(c => findTemplatesByOwner(c, task.id))
    expect(templatesAfterDelete.length).toBe(2)
  })

  test('Delete non existing template', async ({ task }) => {
    setUser(task.id)
    const input = { id: randomUUID(), language: 'en', name: 'Template', text: 'Original template text' }
    const result = await deleteTemplate(input.id)
    expect(result).toEqual({ success: true, data: undefined })
  })

  test('Delete invalid input', async ({ task }) => {
    setUser(task.id)
    const result = await deleteTemplate('')
    expect(result).toEqual({ success: false, error: 'Id must be a non-empty string' })
  })
})
