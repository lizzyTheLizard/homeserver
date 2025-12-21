import { describe, expect, test } from 'vitest'
import { updateProfile } from './updateProfile'
import { deleteProfile } from './deleteProfile'
import { findProfilesByOwner } from '../Profile'
import { pglite, setUser } from '../../../vitest.setup'

describe('Delete Profile', () => {
  test('Delete existing profile', async ({ task }) => {
    setUser(task.id)
    const input = { language: 'en', text: 'Original profile text' }
    await updateProfile(input)
    const profiles = await findProfilesByOwner(pglite, task.id)
    expect(profiles.length).toBe(1)

    const result = await deleteProfile(input.language)
    expect(result).toEqual({})
    const profilesAfterDelete = await findProfilesByOwner(pglite, task.id)
    expect(profilesAfterDelete.length).toBe(0)
  })

  test('Delete non existing profile', async ({ task }) => {
    setUser(task.id)
    const input = { language: 'en', text: 'Original profile text' }
    const result = await deleteProfile(input.language)
    expect(result).toEqual({})
  })

  test('Delete invalid input', async ({ task }) => {
    setUser(task.id)
    const result = await deleteProfile('')
    expect(result).toEqual({ error: 'Language must be a non-empty string' })
  })
})
