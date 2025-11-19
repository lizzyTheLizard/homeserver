import { inTransaction } from '../DatabasePool.js'
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

export async function getMyTemplates(): Promise<Template[]> {
  return inTransaction<Template[]>(async (client) => {
    console.log('Fetching user templates')
    const templates = await client.query<Template>('SELECT * FROM template LIMIT 10')
    console.log(JSON.stringify(templates))
    if (templates.rows.length === 0) {
      // Create dummy templates
      await client.query(`INSERT INTO template (id, name, language, text, parameters, owner_id) VALUES
      ('${uuid()}', 'Template 1', 'en', '', '[]', 'user1'),
      ('${uuid()}', 'Template 2', 'de', 'Über {param1:STRING}', '[{"name":"param1","type":"STRING","startPosition":5,"endPosition":13}]', 'user1')`)
      const templates2 = await client.query<Template>('SELECT * FROM template LIMIT 10')
      return templates2.rows
    }
    else {
      return templates.rows
    }
  })
}
