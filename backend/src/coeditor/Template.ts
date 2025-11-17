import { sql } from '@databases/pg'
import { getTransaction } from '../getTransaction'

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
  return getTransaction<Template[]>(async (tx) => {
    console.log('Fetching user templates')
    const templates = await tx.query(sql`SELECT * FROM template LIMIT 10`) as Template[]
    console.log(JSON.stringify(templates))
    if (templates.length === 0) {
      // Create dummy templates
      await tx.query(sql`INSERT INTO template (id, name, language, text, parameters, owner_id) VALUES
      (1, 'Template 1', 'en', '', '[]', 'user1'),
      (2, 'Template 2', 'de', 'Über {param1:STRING}', '[{"name":"param1","type":"STRING","startPosition":5,"endPosition":13}]', 'user1')`)
      const templates2 = await tx.query(sql`SELECT * FROM template LIMIT 10`) as Template[]
      return templates2
    }
    else {
      return templates
    }
  })
}
