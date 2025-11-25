import { expectedError } from '../../BackendError.js'
import type { Template, TemplateParameter } from './Template.js'

const PARAMETER_REGEX = /\{([^}]+)\}/g

export function extractParameters(text: string): TemplateParameter[] {
  return Array.from(text.matchAll(PARAMETER_REGEX)).map((match) => {
    const matchedString = match[1] ?? ''
    const paramterDetails = getParameterDetails(matchedString)
    const matchedLength = matchedString.length + 2 // +2 for the curly braces
    return { ...paramterDetails, startPosition: match.index, endPosition: match.index + matchedLength }
  })
}

function getParameterDetails(text: string): { name: string, type: 'STRING' | 'SELECT' | 'TEXT', values?: string[] } {
  const parts: string[] = text.split(':')
  const name = parts[0]
  const typeString = parts[1]
  if (name === undefined || typeString === undefined) {
    const message = `'{${text}}' is not a valid parameter. It must be in the format 'name:type[:value1,value2,...]'`
    throw expectedError(message, 400, 'Invalid parameter format')
  }
  const type = typeString.toUpperCase()
  if (type !== 'STRING' && type !== 'SELECT' && type !== 'TEXT') {
    const message = `'{${text}}' is not valid. It has an invalid type '${typeString}'. Allowed types are: STRING, SELECT, TEXT`
    throw expectedError(message, 400, 'Invalid parameter format')
  }
  const values = parts[2]?.split(',') ?? []
  return { name, type, values }
}

export function createContextString(template: Template, values: Record<string, string>): string {
  let result = template.text
  for (const param of template.parameters) {
    const value = values[param.name]
    if (value === undefined)
      throw expectedError(`Missing parameter '${param.name}'`, 400, 'Missing parameter')
    result = result.substring(0, param.startPosition) + value + result.substring(param.endPosition)
  }
  return result
}
