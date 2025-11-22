import type { Context } from '../../Context.js'
import type { Template } from './Template.js'

export async function getMyTemplates(context: Context): Promise<Template[]> {
  return context.db.inTransaction<Template[]>(async (client) => {
    console.debug(`Fetching templates for ${context.user.email}`)
    const templates = await client.query<Template>('SELECT * FROM template WHERE owner_id = $1', [context.user.email])
    return templates.rows
  })
}
