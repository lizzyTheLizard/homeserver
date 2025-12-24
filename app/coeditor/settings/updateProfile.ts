'use server'

import { getUserSession, UserSession } from '@/app/common/auth/auth'
import { transactional } from '@/app/shared/db'
import { PoolClient } from 'pg'
import { validate } from 'validate.js'
import { expectedError } from '@/app/shared/BackendError'
import { createProfile, findProfileByOwnerAndLanguage, modifyProfile, Profile, ProfileInput } from '../Profile'
import { ActionResponse, toResponse } from '@/app/shared/ActionResponse'

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

export async function updateProfile(input: unknown): ActionResponse<Profile> {
  return await toResponse(transactional(async (client) => {
    const user = await getUser()
    if (!validateInput(input)) throw expectedError('Invalid input', 400)
    if (await getExistingProfile(client, user, input)) return await modifyProfile(client, user.sub, input)
    else return await createProfile(client, user.sub, input)
  }))
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
