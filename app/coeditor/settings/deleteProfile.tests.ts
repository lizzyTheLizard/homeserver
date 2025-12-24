import { describe, expect, test } from 'vitest'
import { updateProfile } from './updateProfile'
import { deleteProfile } from './deleteProfile'
import { findProfilesByOwner, Profile } from '../Profile'
import { setUser } from '../../../vitest.setup'
import { transactional } from '@/app/shared/db'

describe('Delete Profile', () => {
  test('Delete existing profile', async ({ task }) => {
    setUser(task.id)
    const input = { language: 'en', text: 'Original profile text XXX2' }
    const response = await updateProfile(input)
    expect(response).toEqual({ success: true, data: expect.objectContaining({ language: input.language, text: input.text, owner_id: task.id }) as Profile })
    const profiles = await transactional(c => findProfilesByOwner(c, task.id))
    expect(profiles.length).toBe(1)

    const result = await deleteProfile(input.language)
    expect(result).toEqual({ success: true, data: undefined })
    const profilesAfterDelete = await transactional(c => findProfilesByOwner(c, task.id))
    expect(profilesAfterDelete.length).toBe(0)
  })

  test('Delete non existing profile', async ({ task }) => {
    setUser(task.id)
    const input = { language: 'en', text: 'Original profile text' }
    const result = await deleteProfile(input.language)
    expect(result).toEqual({ success: true, data: undefined })
  })

  test('Delete invalid input', async ({ task }) => {
    setUser(task.id)
    const result = await deleteProfile('')
    expect(result).toEqual({ success: false, error: 'Language must be a non-empty string' })
  })
})
