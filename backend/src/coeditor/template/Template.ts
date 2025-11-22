export interface Template {
  id: string
  name: string
  language: string
  text: string
  owner_id: string
  parameters: TemplateParameter[]
}

export interface TemplateParameter {
  name: string
  type: 'STRING' | 'SELECT' | 'TEXT'
  values?: string[]
  startPosition: number
  endPosition: number
}
