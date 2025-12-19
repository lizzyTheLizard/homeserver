'use server'

import { getUserSession, UserSession } from '@/app/common/auth/auth'
import { transactional } from '@/app/db'
import { PoolClient } from 'pg'
import { validate } from 'validate.js'
import { expectedError, isBackendError } from '@/app/BackendError'
import { createProfile, findProfileByOwnerAndLanguage, modifyProfile, Profile, ProfileInput } from '../Profile'
import { logger } from '@/logger'

const ProfileInputConstraints = {
  language: {
    presence: { allowEmpty: false },
    type: 'string',
  },
  text: {
    presence: { allowEmpty: false },
    type: 'string',
  },
}

export async function updateProfile(input: unknown): Promise<{ error?: string }> {
  return transactional(async (client) => {
    const user = await getUser()
    if (!validateInput(input)) throw expectedError('Invalid input', 400)
    if (await getExistingProfile(client, user, input)) await modifyProfile(client, user.sub, input)
    else await createProfile(client, user.sub, input)
  })
    .then(() => ({}))
    .catch((error: unknown) => {
      if (isBackendError(error) && error.showStack) {
        logger.error('Error in updateProfile', error)
        return { error: error.userMessage }
      }
      else if (isBackendError(error)) {
        logger.error('Error in updateProfile: ' + error.message)
        return { error: error.userMessage }
      }
      logger.error('Unknown error in updateProfile:', error)
      console.error(error)
      return { error: error instanceof Error ? error.message : 'Unknown error' }
    })
}

async function getUser(): Promise<UserSession> {
  const user = await getUserSession()
  if (!user) throw expectedError('Unauthorized', 401)
  return user
}

function validateInput(input: unknown): input is ProfileInput {
  const validationResult = validate(input, ProfileInputConstraints, { format: 'flat' }) as string[] | undefined
  if (validationResult?.[0]) throw expectedError(validationResult[0], 400)
  return true
}

async function getExistingProfile(client: PoolClient, user: UserSession, input: ProfileInput): Promise<Profile | undefined> {
  const existingProfile = await findProfileByOwnerAndLanguage(client, user.sub, input.language)
  if (existingProfile && existingProfile.owner_id !== user.sub)
    throw expectedError('You do not have permission to modify this profile', 403)
  return existingProfile
}
