import { validate } from 'validate.js'
import { expectedError } from '../../BackendError.js'
import type { Context } from '../../Context.js'
import { findProfileByUserAndLanguage } from './getProfiles.js'
import type { Profile } from './Profile.js'
import { ProfileInputConstraints, type ProfileInput } from './ProfileInput.js'
import type { PoolClient } from 'pg'

export async function updateProfile(context: Context, input: unknown): Promise<Profile> {
  console.debug(`Starting discussion for ${context.user.email}`)
  if (!validateInput(input)) throw expectedError('Invalid profile input', 400, 'Bad Request')

  return context.db.inTransaction<Profile>(async (client) => {
    const existing = await findProfileByUserAndLanguage(client, context.user.email, input.language)
    if (existing)
      return await updateExistingProfile(client, input, context.user.email)
    return await createNewProfile(client, input, context.user.email)
  })
}

function validateInput(input: unknown): input is ProfileInput {
  const result = validate(input, ProfileInputConstraints, { format: 'flat' }) as string[] | undefined
  if (!result?.[0]) return true
  throw expectedError(result[0], 400)
}

async function updateExistingProfile(client: PoolClient, input: ProfileInput, ownerId: string): Promise<Profile> {
  const result = await client.query<Profile>(
    'UPDATE profile SET text = $1, updated_at = NOW() WHERE owner_id = $2 AND language = $3 RETURNING *',
    [input.text, ownerId, input.language],
  )
  if (!result.rows[0]) throw expectedError('Failed to update profile', 500, 'Internal Server Error')
  return result.rows[0]
}

async function createNewProfile(client: PoolClient, input: ProfileInput, ownerId: string): Promise<Profile> {
  const result = await client.query<Profile>(
    'INSERT INTO profile (language, text, owner_id) VALUES ($1, $2, $3) RETURNING *',
    [input.language, input.text, ownerId],
  )
  if (!result.rows[0]) throw expectedError('Failed to create profile', 500, 'Internal Server Error')
  return result.rows[0]
}
