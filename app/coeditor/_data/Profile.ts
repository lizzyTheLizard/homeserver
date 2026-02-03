import { PoolClient } from 'pg'
import { invalidInput } from '../../shared/_helper/BackendError'
import { logger } from '@/app/shared/logger'
import { Entity } from '@/app/shared/_external/db/access'

export interface ProfileInput {
  id: string
  language: string
  text: string
}
export type Profile = Entity<ProfileInput>

export async function findProfilesByOwner(client: PoolClient, owner: string): Promise<Profile[]> {
  const result = await client.query<Profile>(
    'SELECT * FROM profile WHERE owner_id = $1',
    [owner],
  )
  logger.debug(`Found ${result.rows.length.toString()} profiles for owner ${owner}`)
  return result.rows
}

export async function findProfileByOwnerAndLanguage(client: PoolClient, owner: string, language: string): Promise<Profile | undefined> {
  const result = await client.query<Profile>(
    'SELECT * FROM profile WHERE owner_id = $1 AND language = $2 LIMIT 1',
    [owner, language],
  )
  logger.debug(`Found ${result.rows[0] ? '' : 'no '}profile '${language}' for owner ${owner}`)
  return result.rows[0]
}

async function findProfileById(client: PoolClient, owner: string, id: string): Promise<Profile | undefined> {
  const result = await client.query<Profile>(
    'SELECT * FROM profile WHERE owner_id = $1 AND id = $2 LIMIT 1',
    [owner, id],
  )
  logger.debug(`Found ${result.rows[0] ? '' : 'no '}profile '${id}' for owner ${owner}`)
  return result.rows[0]
}

export async function createOrModifyProfile(client: PoolClient, owner: string, input: ProfileInput): Promise<Profile> {
  const sameLang = await findProfileByOwnerAndLanguage(client, owner, input.language)
  if (sameLang && sameLang.id !== input.id) throw invalidInput(`There is alread a profile for language ${input.language}`)
  const existing = await findProfileById(client, owner, input.id)
  const query = existing
    ? 'UPDATE profile SET text = $2, language=$3, updated_at = NOW() WHERE owner_id = $4 AND id = $1 RETURNING *'
    : 'INSERT INTO profile (id,text, language, owner_id) VALUES ($1, $2, $3, $4) RETURNING *'
  const result = await client.query<Profile>(query, [input.id, input.text, input.language, owner])
  if (!result.rows[0]) throw new Error('Failed to modify profile')
  logger.info(`Modified profile '${input.language}' for owner ${owner}`)
  return result.rows[0]
}

export async function removeProfile(client: PoolClient, owner: string, id: string): Promise<void> {
  const result = await client.query(
    'DELETE FROM profile WHERE owner_id = $1 AND id = $2',
    [owner, id],
  )
  if (result.rowCount !== 0) logger.info(`Deleted profile '${id}' for owner ${owner}`)
  else logger.debug(`Try to delete non exising profile '${id}' for owner ${owner}`)
}
