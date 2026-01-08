// TODO Create tests, here are just the old tests from Profile.tests.ts as a placeholder

import { describe, expect, test } from 'vitest'
import { nontransactional, transactional } from '@/app/shared/db'
import { createOrModifyProfile, findProfileByOwnerAndLanguage, findProfilesByOwner, removeProfile } from '../_data/Profile'
import { createOrModifyTemplate, findNumberOfUsersWithTemplates, findTemplateById, findTemplatesByOwner, removeTemplate } from '../_data/Template'
import { v4 as randomUUID } from 'uuid'
import { BackendError } from '@/app/shared/_helper/BackendError'

describe('Find Profiles', () => {
  test('Empty', async ({ task }) => {
    await expect(nontransactional(c => findProfileByOwnerAndLanguage(c, task.id, 'en'))).resolves.toEqual(undefined)
    await expect(nontransactional(c => findProfilesByOwner(c, task.id))).resolves.toEqual([])
  })

  test('Single', async ({ task }) => {
    const input = { id: randomUUID(), language: 'en', text: 'Original profile text XXX2' }
    const result = await transactional(tx => createOrModifyProfile(tx, task.id, input))

    await expect(nontransactional(c => findProfileByOwnerAndLanguage(c, task.id, input.language))).resolves.toEqual(result)
    await expect(nontransactional(c => findProfileByOwnerAndLanguage(c, task.id, 'other'))).resolves.toEqual(undefined)
    await expect(nontransactional(c => findProfilesByOwner(c, task.id))).resolves.toEqual([result])
  })
})

describe('Create Or Modify Profile', () => {
  test('Create new profile', async ({ task }) => {
    const input = { id: randomUUID(), language: 'en', text: 'Original profile text XXX2' }
    const result = await transactional(tx => createOrModifyProfile(tx, task.id, input))

    expect(result).toEqual(expect.objectContaining(input))
    await expect(nontransactional(c => findProfileByOwnerAndLanguage(c, task.id, input.language))).resolves.toEqual(result)
  })

  test('Update existing profile', async ({ task }) => {
    const input = { id: randomUUID(), language: 'en', text: 'Original profile text XXX2' }
    const input2 = { id: input.id, language: 'de', text: 'New profile text' }

    await transactional(tx => createOrModifyProfile(tx, task.id, input))
    const result = await transactional(tx => createOrModifyProfile(tx, task.id, input2))

    expect(result).toEqual(expect.objectContaining(input2))
    await expect(nontransactional(c => findProfileByOwnerAndLanguage(c, task.id, input2.language))).resolves.toEqual(result)
  })

  test('Update profile of other user', async ({ task }) => {
    const otherUser = randomUUID()
    const input = { id: randomUUID(), language: 'en', text: 'Original profile text XXX2' }
    const input2 = { id: input.id, language: 'de', text: 'New profile text' }

    await transactional(tx => createOrModifyProfile(tx, otherUser, input))
    await expect(transactional(tx => createOrModifyProfile(tx, task.id, input2))).rejects.not.toThrow(BackendError)
  })

  test('Create profile in same language', async ({ task }) => {
    const input = { id: randomUUID(), language: 'en', text: 'Original profile text XXX2' }
    const input2 = { id: randomUUID(), language: 'en', text: 'New profile text' }

    await transactional(tx => createOrModifyProfile(tx, task.id, input))
    await expect(transactional(tx => createOrModifyProfile(tx, task.id, input2))).rejects.toThrow(BackendError)
  })

  test('Update profile to same language', async ({ task }) => {
    const input = { id: randomUUID(), language: 'en', text: 'Original profile text XXX2' }
    const input2 = { id: randomUUID(), language: 'de', text: 'New profile text' }
    const input3 = { id: input2.id, language: 'en', text: 'Original profile text XXX2' }

    await transactional(async (tx) => {
      await createOrModifyProfile(tx, task.id, input)
      await createOrModifyProfile(tx, task.id, input2)
    })
    await expect(transactional(tx => createOrModifyProfile(tx, task.id, input3))).rejects.toThrow(BackendError)
  })
})

describe('Remove Profile', () => {
  test('Delete existing profile', async ({ task }) => {
    const input = { id: randomUUID(), language: 'en', text: 'Original profile text' }

    await expect(transactional(async (c) => {
      await createOrModifyProfile(c, task.id, input)
      return findProfileByOwnerAndLanguage(c, task.id, input.language)
    })).resolves.toBeTruthy()

    await expect(transactional(async (c) => {
      await removeProfile(c, task.id, input.id)
      return findProfileByOwnerAndLanguage(c, task.id, input.language)
    })).resolves.toBeFalsy()
  })

  test('Delete non existing profile', async ({ task }) => {
    const input = { id: randomUUID(), language: 'en', text: 'Original profile text' }

    await expect(transactional(async (c) => {
      await removeProfile(c, task.id, input.id)
      return findProfileByOwnerAndLanguage(c, task.id, input.language)
    })).resolves.toBeFalsy()
  })

  test('Delete profile of other user', async ({ task }) => {
    const otherUser = randomUUID()
    const input = { id: randomUUID(), language: 'en', text: 'Original profile text' }

    await transactional(tx => createOrModifyProfile(tx, otherUser, input))

    await transactional(tx => removeProfile(tx, task.id, input.id))

    // Still exists
    await expect(nontransactional(c => findProfileByOwnerAndLanguage(c, otherUser, input.language))).resolves.toBeTruthy()
  })
})

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
