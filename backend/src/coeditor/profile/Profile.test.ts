import { beforeAll, describe, expect, test } from 'vitest'
import type { Context, DatabaseHandle } from '../../Context.js'
import { type PoolClient } from 'pg'
import { migrateDatabase } from '../../migrateDatabase.js'
import { updateProfile } from './updateProfile.js'
import { PGlite } from '@electric-sql/pglite'
import { getMyProfiles } from './getProfiles.js'

describe.concurrent('Profile Integration Tests', () => {
  let db: DatabaseHandle | undefined = undefined

  beforeAll(async () => {
    const pglite = new PGlite() as unknown as PoolClient
    await migrateDatabase(pglite)
    db = {
      inTransaction: async <T>(fn: (client: PoolClient) => Promise<T>): Promise<T> => {
        const result = await fn(pglite)
        return result
      },
    }
  })

  test('No Profiles', async () => {
    const context = { user: { email: 'noprofiles@profile.com' }, db } as Context
    const result = await getMyProfiles(context)
    expect(result).toEqual([])
  })

  test('Insert and Return', async () => {
    const input = { language: 'en', text: 'Sample profile text' }
    const context = { user: { email: 'addandreturn@profile.com' }, db } as Context
    await updateProfile(context, input)
    const profiles = await getMyProfiles(context)
    expect(profiles).toEqual([{
      ...input,
      created_at: expect.any(Date) as Date,
      updated_at: expect.any(Date) as Date,
      owner_id: context.user.email,
    }])
  })

  test('Invalid Input', async () => {
    const input = { language: 'en', text: 'Sample profile text' }
    const context = { user: { email: 'invalidInput@profile.com' }, db } as Context
    await expect(updateProfile(context, { ...input, language: undefined })).rejects.toThrow('Language can\'t be blank')
    await expect(updateProfile(context, { ...input, language: '' })).rejects.toThrow('Language can\'t be blank')
    await expect(updateProfile(context, { ...input, text: undefined })).rejects.toThrow('Text can\'t be blank')
    await expect(updateProfile(context, { ...input, text: '' })).rejects.toThrow('Text can\'t be blank')
    const result = await getMyProfiles(context)
    expect(result).toEqual([])
  })

  test('Update existing profile', async () => {
    const input = { language: 'en', text: 'Original profile text' }
    const context = { user: { email: 'updateprofile@profile.com' }, db } as Context
    await updateProfile(context, input)
    await updateProfile(context, { ...input, text: 'Modified profile text' })
    const profiles = await getMyProfiles(context)
    expect(profiles.length).toBe(1)
    expect(profiles[0]?.text).toBe('Modified profile text')
    expect(profiles).toEqual([{
      ...input,
      created_at: expect.any(Date) as Date,
      updated_at: expect.any(Date) as Date,
      text: 'Modified profile text',
      owner_id: context.user.email,
    }])
  })

  test('Multiple profiles for different languages', async () => {
    const context = { user: { email: 'multiprofiles@profile.com' }, db } as Context
    await updateProfile(context, { language: 'en', text: 'English profile' })
    await updateProfile(context, { language: 'de', text: 'German profile' })
    const profiles = await getMyProfiles(context)
    expect(profiles.length).toBe(2)
    expect(profiles.find(p => p.language === 'en')?.text).toBe('English profile')
    expect(profiles.find(p => p.language === 'de')?.text).toBe('German profile')
  })

  test('Different users have separate profiles', async () => {
    const input = { language: 'en', text: 'Profile text' }
    const context1 = { user: { email: 'user1@profile.com' }, db } as Context
    const context2 = { user: { email: 'user2@profile.com' }, db } as Context
    await updateProfile(context1, input)
    await updateProfile(context2, { ...input, text: 'Different profile text' })

    const profiles1 = await getMyProfiles(context1)
    const profiles2 = await getMyProfiles(context2)

    expect(profiles1.length).toBe(1)
    expect(profiles2.length).toBe(1)
    expect(profiles1[0]?.text).toBe('Profile text')
    expect(profiles2[0]?.text).toBe('Different profile text')
  })
})
