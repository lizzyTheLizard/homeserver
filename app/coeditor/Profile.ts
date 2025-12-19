import { PoolClient } from 'pg'
import { expectedError } from '../BackendError'
import { logger } from '@/logger'

export interface Profile {
  owner_id: string
  language: string
  updated_at: Date
  create_at: Date
  text: string
}

export interface ProfileInput {
  language: string
  text: string
}

export async function findProfilesByOwner(client: PoolClient, owner: string): Promise<Profile[]> {
  const result = await client.query<Profile>('SELECT * FROM profile WHERE owner_id = $1', [owner])
  logger.debug(`Found ${result.rows.length.toString()} profiles for owner ${owner}`)
  return result.rows
}

export async function findProfileByOwnerAndLanguage(client: PoolClient, owner: string, language: string): Promise<Profile | undefined> {
  const result = await client.query<Profile>(
    'SELECT * FROM profile WHERE owner_id = $1 AND language = $2 LIMIT 1',
    [owner, language],
  )
  logger.debug(`Found ${result.rows[0] ? '' : 'no '}profile ${language} for owner ${owner}`)
  return result.rows[0]
}

export async function createProfile(client: PoolClient, owner: string, input: ProfileInput): Promise<Profile> {
  const result = await client.query<Profile>(
    'INSERT INTO profile (language, text, owner_id) VALUES ($1, $2, $3) RETURNING *',
    [input.language, input.text, owner],
  )
  if (!result.rows[0]) throw expectedError('Failed to create profile', 500, 'Internal Server Error')
  logger.info(`Created profile ${input.language} for owner ${owner}`)
  return result.rows[0]
}

export async function modifyProfile(client: PoolClient, owner: string, input: ProfileInput): Promise<Profile> {
  const result = await client.query<Profile>(
    'UPDATE profile SET text = $1, updated_at = NOW() WHERE owner_id = $2 AND language = $3 RETURNING *',
    [input.text, owner, input.language],
  )
  if (!result.rows[0]) throw expectedError('Failed to modify profile', 500, 'Internal Server Error')
  logger.info(`Modified profile ${input.language} for owner ${owner}`)
  return result.rows[0]
}

export async function deleteProfile(client: PoolClient, owner: string, language: string): Promise<void> {
  const result = await client.query(
    'DELETE FROM profile WHERE owner_id = $1 AND language = $2',
    [owner, language],
  )
  if (result.rowCount === 0) throw expectedError('Failed to delete profile', 500, 'Internal Server Error')
  logger.info(`Deleted profile ${language} for owner ${owner}`)
}
