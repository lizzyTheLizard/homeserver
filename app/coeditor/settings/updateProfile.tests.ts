import { describe, expect, test } from 'vitest'
import { updateProfile } from './updateProfile'
import { findProfilesByOwner, Profile } from '../Profile'
import { setUser } from '../../../vitest.setup'
import { transactional } from '@/app/shared/db'

describe('Update Profile', () => {
  test('Create new profile', async ({ task }) => {
    setUser(task.id)

    const profilesBefore = await transactional(c => findProfilesByOwner(c, task.id))
    expect(profilesBefore.length).toBe(0)

    const input = { language: 'en', text: 'Original profile text' }
    const result = await updateProfile(input)
    expect(result).toEqual({ success: true, data: expect.objectContaining(input) as Profile })
    const profiles = await transactional(c => findProfilesByOwner(c, task.id))
    expect(profiles.length).toBe(1)
    expect(profiles[0]).toMatchObject(input)
  })

  test('Update existing profile', async ({ task }) => {
    setUser(task.id)
    const input = { language: 'en', text: 'Original profile text' }
    await updateProfile(input)
    const input2 = { language: 'en', text: 'New profile text' }
    await updateProfile(input2)

    const profiles = await transactional(c => findProfilesByOwner(c, task.id))
    expect(profiles.length).toBe(1)
    expect(profiles[0]).toMatchObject(input2)
  })

  test('Update invalid input', async ({ task }) => {
    setUser(task.id)
    expect(await updateProfile(undefined)).toEqual({ success: false, error: 'Language can\'t be blank' })
    expect(await updateProfile({})).toEqual({ success: false, error: 'Language can\'t be blank' })
    expect(await updateProfile({ language: 'en' })).toEqual({ success: false, error: 'Text can\'t be blank' })
    expect(await updateProfile({ language: '', text: 'Text' })).toEqual({ success: false, error: 'Language can\'t be blank' })
    expect(await updateProfile({ language: 'en', text: '' })).toEqual({ success: false, error: 'Text can\'t be blank' })
    const profiles = await transactional(c => findProfilesByOwner(c, task.id))
    expect(profiles.length).toBe(0)
  })
})
