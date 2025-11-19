import type { Context } from '../Context.js'
import { v4 as uuid } from 'uuid'

export interface Template {
  id: string
  name: string
  language: string
  text: string
  parameters: TemplateParameter[]
}

export interface TemplateParameter {
  name: string
  type: 'STRING' | 'SELECT' | 'TEXT'
  values?: string[]
  startPosition: number
  endPosition: number
}

export async function getMyTemplates(context: Context): Promise<Template[]> {
  return context.db.inTransaction<Template[]>(async (client) => {
    console.log('Fetching user templates')
    const templates = await client.query<Template>('SELECT * FROM template WHERE owner_id = $1', [context.user.email])
    if (templates.rows.length === 0) {
      // Create dummy templates
      await client.query(`INSERT INTO template (id, name, language, text, parameters, owner_id) VALUES
      ('${uuid()}', 'Template 1', 'en', '', '[]', ${context.user.email}),
      ('${uuid()}', 'Template 2', 'de', 'Über {param1:STRING}', '[{"name":"param1","type":"STRING","startPosition":5,"endPosition":13}]', ${context.user.email})`)
      const templates2 = await client.query<Template>('SELECT * FROM template WHERE owner_id = $1', [context.user.email])
      return templates2.rows
    }
    else {
      return templates.rows
    }
  })
}
