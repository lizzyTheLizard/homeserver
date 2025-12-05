import type { PoolClient } from 'pg'
import type { Context } from '../../Context.js'
import { findProfileByUserAndLanguage } from './getProfiles.js'

export async function deleteProfile(context: Context, language: string): Promise<void> {
  console.debug(`Deleting profile for ${context.user.email} and language ${language}`)

  await context.db.inTransaction(async (client) => {
    const existing = await findProfileByUserAndLanguage(client, context.user.email, language)
    if (existing)
      await deleteExistingProfile(client, language, context.user.email)
  })
}

async function deleteExistingProfile(client: PoolClient, language: string, ownerId: string): Promise<void> {
  await client.query(
    'DELETE FROM profile WHERE owner_id = $1 AND language = $2',
    [ownerId, language],
  )
}
