'use server'

import { getUserSession, UserSession } from '@/app/common/auth/auth'
import { transactional } from '@/app/shared/db'
import { PoolClient } from 'pg'
import { expectedError } from '@/app/shared/BackendError'
import { findProfileByOwnerAndLanguage, Profile, removeProfile } from '../Profile'
import { ActionResponse, toResponse } from '@/app/shared/ActionResponse'

export async function deleteProfile(language: unknown): ActionResponse<void> {
  return await toResponse(transactional(async (client) => {
    const user = await getUser()
    if (!validateInput(language)) throw expectedError('Invalid input', 400)
    if (await getExistingProfile(client, user, language)) await removeProfile(client, user.sub, language)
  }))
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
