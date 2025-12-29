import { describe, expect, test } from 'vitest'
import { nontransactional, transactional } from '@/app/shared/db'
import { v4 as randomUUID } from 'uuid'
import { BackendError } from '../shared/BackendError'
import { createOrModifyTemplate, findNumberOfUsersWithTemplates, findTemplateById, findTemplatesByOwner, removeTemplate } from './Template'

describe('Find Templates', () => {
  test('Empty', async ({ task }) => {
    await expect(nontransactional(c => findTemplateById(c, task.id, randomUUID()))).resolves.toEqual(undefined)
    // Should have default templates
    await expect(transactional(c => findTemplatesByOwner(c, task.id))).resolves.length(2)
  })

  test('Single', async ({ task }) => {
    const input = { id: randomUUID(), name: 'Test', language: 'en', text: 'Original profile text' }
    const result = await transactional(tx => createOrModifyTemplate(tx, task.id, input))

    await expect(nontransactional(tx => findTemplateById(tx, task.id, input.id))).resolves.toEqual(result)
    await expect(nontransactional(tx => findTemplateById(tx, task.id, randomUUID()))).resolves.toEqual(undefined)
    await expect(nontransactional(tx => findTemplatesByOwner(tx, task.id))).resolves.toEqual([result])
  })

  test('Increment', async ({ task }) => {
    const before = await nontransactional(tx => findNumberOfUsersWithTemplates(tx))
    const input = { id: randomUUID(), name: 'Test', language: 'en', text: 'Original profile text' }

    await transactional(tx => createOrModifyTemplate(tx, task.id, input))
    const after = await nontransactional(c => findNumberOfUsersWithTemplates(c))

    expect(after).toEqual(before + 1)
  })
})

describe('Create Or Modify Template', () => {
  test('Create new template', async ({ task }) => {
    const input = { id: randomUUID(), name: 'Test', language: 'en', text: 'Original profile text' }
    const result = await transactional(tx => createOrModifyTemplate(tx, task.id, input))

    expect(result).toEqual(expect.objectContaining(input))
    await expect(nontransactional(c => findTemplateById(c, task.id, input.id))).resolves.toEqual(result)
  })

  test('Update existing template', async ({ task }) => {
    const input = { id: randomUUID(), name: 'Test', language: 'en', text: 'Original profile text' }
    const input2 = { id: input.id, name: 'Test2', language: 'en', text: 'New profile text' }

    await transactional(tx => createOrModifyTemplate(tx, task.id, input))
    const result = await transactional(tx => createOrModifyTemplate(tx, task.id, input2))

    expect(result).toEqual(expect.objectContaining(input2))
    await expect(nontransactional(c => findTemplateById(c, task.id, input2.id))).resolves.toEqual(result)
  })

  test('Update template of other user', async ({ task }) => {
    const otherUser = randomUUID()
    const input = { id: randomUUID(), name: 'Test', language: 'en', text: 'Original profile text' }
    const input2 = { id: input.id, name: 'Test2', language: 'en', text: 'New profile text' }

    await transactional(tx => createOrModifyTemplate(tx, otherUser, input))
    await expect(transactional(tx => createOrModifyTemplate(tx, task.id, input2))).rejects.not.toThrow(BackendError)
  })
})

describe('Remove Template', () => {
  test('Delete existing template', async ({ task }) => {
    const input = { id: randomUUID(), name: 'Test', language: 'en', text: 'Original profile text' }

    await expect(transactional(async (c) => {
      await createOrModifyTemplate(c, task.id, input)
      return findTemplateById(c, task.id, input.id)
    })).resolves.toBeTruthy()

    await expect(transactional(async (c) => {
      await removeTemplate(c, task.id, input.id)
      return findTemplateById(c, task.id, input.id)
    })).resolves.toBeFalsy()
  })

  test('Delete non existing template', async ({ task }) => {
    const input = { id: randomUUID(), name: 'Test', language: 'en', text: 'Original profile text' }

    await expect(transactional(async (c) => {
      await removeTemplate(c, task.id, input.id)
      return findTemplateById(c, task.id, input.id)
    })).resolves.toBeFalsy()
  })

  test('Delete profile of other user', async ({ task }) => {
    const otherUser = randomUUID()
    const input = { id: randomUUID(), name: 'Test', language: 'en', text: 'Original profile text' }

    await transactional(tx => createOrModifyTemplate(tx, otherUser, input))

    await transactional(tx => removeTemplate(tx, task.id, input.id))

    // Still exists
    await expect(nontransactional(c => findTemplateById(c, otherUser, input.id))).resolves.toBeTruthy()
  })
})
