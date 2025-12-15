'use server'

import { getUserSession, UserSession } from '@/app/common/auth/auth'
import { transactional } from '@/app/db'
import { PoolClient } from 'pg'
import { expectedError, isBackendError } from '@/app/BackendError'
import { findProfileByOwnerAndLanguage, Profile, deleteProfile as deleteProfileInt } from '../../Profile'

export async function deleteProfile(language: unknown): Promise<{ error?: string }> {
  return transactional(async (client) => {
    const user = await getUser()
    if (!validateInput(language)) throw expectedError('Invalid input', 400)
    if (await getExistingProfile(client, user, language)) await deleteProfileInt(client, user.sub, language)
  })
    .then(() => ({}))
    .catch((error: unknown) => {
      if (isBackendError(error)) {
        console.error('Error in deleteProfile:', error.showStack ? error : error.message)
        return { error: error.userMessage }
      }
      console.error('Error in deleteProfile:', error)
      return { error: error instanceof Error ? error.message : 'Unknown error' }
    })
}

async function getUser(): Promise<UserSession> {
  const user = await getUserSession()
  if (!user) throw expectedError('Unauthorized', 401)
  return user
}

function validateInput(input: unknown): input is string {
  if (typeof input !== 'string' || input.trim() === '') {
    throw expectedError('Language must be a non-empty string', 400)
  }
  return true
}

async function getExistingProfile(client: PoolClient, user: UserSession, language: string): Promise<Profile | undefined> {
  const existingProfile = await findProfileByOwnerAndLanguage(client, user.sub, language)
  if (existingProfile && existingProfile.owner_id !== user.sub)
    throw expectedError('You do not have permission to modify this profile', 403)
  return existingProfile
}
