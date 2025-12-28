import { describe, expect, test } from 'vitest'
import { transactional } from '@/app/shared/db'
import { createOrModifyProfile, findProfileByOwnerAndLanguage, findProfilesByOwner, removeProfile } from './Profile'
import { v4 as randomUUID } from 'uuid'
import { BackendError } from '../shared/BackendError'

describe('Find Profiles', () => {
  test('Empty', async ({ task }) => {
    await expect(transactional(c => findProfileByOwnerAndLanguage(c, task.id, 'en'))).resolves.toEqual(undefined)
    await expect(transactional(c => findProfilesByOwner(c, task.id))).resolves.toEqual([])
  })

  test('Single', async ({ task }) => {
    const input = { id: randomUUID(), language: 'en', text: 'Original profile text XXX2' }
    const result = await transactional(c => createOrModifyProfile(c, task.id, input))

    await expect(transactional(c => findProfileByOwnerAndLanguage(c, task.id, input.language))).resolves.toEqual(result)
    await expect(transactional(c => findProfileByOwnerAndLanguage(c, task.id, 'other'))).resolves.toEqual(undefined)
    await expect(transactional(c => findProfilesByOwner(c, task.id))).resolves.toEqual([result])
  })
})

describe('Create Or Modify Profile', () => {
  test('Create new profile', async ({ task }) => {
    const input = { id: randomUUID(), language: 'en', text: 'Original profile text XXX2' }
    const result = await transactional(c => createOrModifyProfile(c, task.id, input))

    expect(result).toEqual(expect.objectContaining(input))
    await expect(transactional(c => findProfileByOwnerAndLanguage(c, task.id, input.language))).resolves.toEqual(result)
  })

  test('Update existing profile', async ({ task }) => {
    const input = { id: randomUUID(), language: 'en', text: 'Original profile text XXX2' }
    const input2 = { id: input.id, language: 'de', text: 'New profile text' }

    await transactional(c => createOrModifyProfile(c, task.id, input))
    const result = await transactional(c => createOrModifyProfile(c, task.id, input2))

    expect(result).toEqual(expect.objectContaining(input2))
    await expect(transactional(c => findProfileByOwnerAndLanguage(c, task.id, input2.language))).resolves.toEqual(result)
  })

  test('Update profile of other user', async ({ task }) => {
    const otherUser = randomUUID()
    const input = { id: randomUUID(), language: 'en', text: 'Original profile text XXX2' }
    const input2 = { id: input.id, language: 'de', text: 'New profile text' }

    await transactional(c => createOrModifyProfile(c, otherUser, input))
    await expect(transactional(c => createOrModifyProfile(c, task.id, input2))).rejects.not.toThrow(BackendError)
  })

  test('Create profile in same language', async ({ task }) => {
    const input = { id: randomUUID(), language: 'en', text: 'Original profile text XXX2' }
    const input2 = { id: randomUUID(), language: 'en', text: 'New profile text' }

    await transactional(c => createOrModifyProfile(c, task.id, input))
    await expect(transactional(c => createOrModifyProfile(c, task.id, input2))).rejects.toThrow(BackendError)
  })

  test('Update profile to same language', async ({ task }) => {
    const input = { id: randomUUID(), language: 'en', text: 'Original profile text XXX2' }
    const input2 = { id: randomUUID(), language: 'de', text: 'New profile text' }
    const input3 = { id: input2.id, language: 'en', text: 'Original profile text XXX2' }

    await transactional(async (c) => {
      await createOrModifyProfile(c, task.id, input)
      await createOrModifyProfile(c, task.id, input2)
    })
    await expect(transactional(c => createOrModifyProfile(c, task.id, input3))).rejects.toThrow(BackendError)
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

    await transactional(c => createOrModifyProfile(c, otherUser, input))

    await transactional(c => removeProfile(c, task.id, input.id))

    // Still exists
    await expect(transactional(c => findProfileByOwnerAndLanguage(c, otherUser, input.language))).resolves.toBeTruthy()
  })
})
