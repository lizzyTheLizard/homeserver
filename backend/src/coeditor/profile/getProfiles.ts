import type { PoolClient } from 'pg'
import type { Profile } from './Profile.js'
import type { Context } from '../../Context.js'

export async function getMyProfiles(context: Context): Promise<Profile[]> {
  console.debug(`Fetching profiles for ${context.user.email}`)
  return context.db.inTransaction<Profile[]>(async (client) => {
    return await findProfilesByUser(client, context.user.email)
  })
}

export async function findProfilesByUser(client: PoolClient, userEmail: string): Promise<Profile[]> {
  const result = await client.query<Profile>('SELECT * FROM profile WHERE owner_id = $1', [userEmail])
  return result.rows
}

export async function findProfileByUserAndLanguage(client: PoolClient, userEmail: string, language: string): Promise<Profile | undefined> {
  const result = await client.query<Profile>(
    'SELECT * FROM profile WHERE owner_id = $1 AND language = $2 LIMIT 1',
    [userEmail, language],
  )
  return result.rows[0]
}
