import { invalidInput } from '../../shared/_helper/BackendError'
import { logger } from '@/app/shared/logger'
import { Entity, Queryable, removeNull } from '@/app/shared/_external/db/access'

export interface ProfileInput {
  id: string
  language: string
  text: string
}
export type Profile = Entity<ProfileInput>

export async function findProfilesByOwner(client: Queryable, owner: string): Promise<Profile[]> {
  const result = await client.query<Profile>(
    'SELECT * FROM profile WHERE owner_email = $1',
    [owner],
  )
  logger.debug(`Found ${result.rows.length.toString()} profiles for owner ${owner}`)
  return result.rows.map(removeNull)
}

export async function findProfileByOwnerAndLanguage(client: Queryable, owner: string, language: string): Promise<Profile | undefined> {
  const result = await client.query<Profile>(
    'SELECT * FROM profile WHERE owner_email = $1 AND language = $2 LIMIT 1',
    [owner, language],
  )
  logger.debug(`Found ${result.rows[0] ? '' : 'no '}profile '${language}' for owner ${owner}`)
  return removeNull(result.rows[0])
}

async function findProfileById(client: Queryable, owner: string, id: string): Promise<Profile | undefined> {
  const result = await client.query<Profile>(
    'SELECT * FROM profile WHERE owner_email = $1 AND id = $2 LIMIT 1',
    [owner, id],
  )
  logger.debug(`Found ${result.rows[0] ? '' : 'no '}profile '${id}' for owner ${owner}`)
  return removeNull(result.rows[0])
}

export async function createOrModifyProfile(client: Queryable, owner: string, input: ProfileInput): Promise<Profile> {
  const sameLang = await findProfileByOwnerAndLanguage(client, owner, input.language)
  if (sameLang && sameLang.id !== input.id) throw invalidInput(`There is already a profile for language ${input.language}`)
  const existing = await findProfileById(client, owner, input.id)
  const query = existing
    ? 'UPDATE profile SET text = $2, language=$3, updated_at = NOW() WHERE owner_email = $4 AND id = $1 RETURNING *'
    : 'INSERT INTO profile (id,text, language, owner_email) VALUES ($1, $2, $3, $4) RETURNING *'
  const result = await client.query<Profile>(query, [input.id, input.text, input.language, owner])
  if (!result.rows[0]) throw new Error('Failed to modify profile')
  logger.debug(`Modified profile '${input.language}' for owner ${owner}`)
  return removeNull(result.rows[0])
}

export async function removeProfile(client: Queryable, owner: string, id: string): Promise<Profile | undefined> {
  const result = await client.query<Profile>(
    'DELETE FROM profile WHERE owner_email = $1 AND id = $2 RETURNING *',
    [owner, id],
  )
  if (result.rowCount !== 0) logger.debug(`Deleted profile '${id}' for owner ${owner}`)
  else logger.debug(`Tried to delete non-existing profile '${id}' for owner ${owner}`)
  return removeNull(result.rows[0])
}
