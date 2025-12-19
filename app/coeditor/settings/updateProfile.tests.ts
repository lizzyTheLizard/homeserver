import { describe, expect, test } from 'vitest'
import { updateProfile } from './updateProfile'
import { findProfilesByOwner } from '../Profile'
import { pglite, setUser } from '../../../vitest.setup'

describe('Update Profile', () => {
  test('Create new profile', async ({ task }) => {
    setUser(task.id)

    const profilesBefore = await findProfilesByOwner(pglite, task.id)
    expect(profilesBefore.length).toBe(0)

    const input = { language: 'en', text: 'Original profile text' }
    await updateProfile(input)
    const profiles = await findProfilesByOwner(pglite, task.id)
    expect(profiles.length).toBe(1)
    expect(profiles[0]).toMatchObject(input)
  })

  test('Update existing profile', async ({ task }) => {
    setUser(task.id)
    const input = { language: 'en', text: 'Original profile text' }
    await updateProfile(input)
    const input2 = { language: 'en', text: 'New profile text' }
    await updateProfile(input2)

    const profiles = await findProfilesByOwner(pglite, task.id)
    expect(profiles.length).toBe(1)
    expect(profiles[0]).toMatchObject(input2)
  })

  test('Update invalid input', async ({ task }) => {
    setUser(task.id)
    expect(await updateProfile(undefined)).toEqual({ error: 'Language can\'t be blank' })
    expect(await updateProfile({})).toEqual({ error: 'Language can\'t be blank' })
    expect(await updateProfile({ language: 'en' })).toEqual({ error: 'Text can\'t be blank' })
    expect(await updateProfile({ language: '', text: 'Text' })).toEqual({ error: 'Language can\'t be blank' })
    expect(await updateProfile({ language: 'en', text: '' })).toEqual({ error: 'Text can\'t be blank' })

    const profiles = await findProfilesByOwner(pglite, task.id)
    expect(profiles.length).toBe(0)
  })
})
