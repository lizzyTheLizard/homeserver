import { expectedError } from '../../BackendError.js'
import type { TemplateParameter } from './Template.js'

export function extractParameters(text: string): TemplateParameter[] {
  const result: TemplateParameter[] = []
  for (const match of text.matchAll((/\{([^}]+)\}/g))) {
    const matchedString = match[1] ?? ''
    const parts = matchedString.split(':')
    if (parts.length < 2 || parts.length > 3) {
      const message = `'{${match[0]}}' is not valid. It must be in the format {name:type[:value1,value2,...]}`
      throw expectedError(message, 400, 'Invalid parameter format')
    }
    const name = parts[0] ?? ''
    const typeString = parts[1] ?? ''
    const type = typeString.toUpperCase()
    if (type !== 'STRING' && type !== 'SELECT' && type !== 'TEXT') {
      const message = `'{${matchedString}}' is not valid. It has an invalid type '${typeString}'. Allowed types are: STRING, SELECT, TEXT`
      throw expectedError(message, 400, 'Invalid parameter format')
    }
    const values = parts.length > 2 ? parts[2]?.split(',') : undefined
    const matchedLength = matchedString.length + 2 // +2 for the curly braces
    const parameter: TemplateParameter = { name, type, values, startPosition: match.index, endPosition: match.index + matchedLength }
    result.push(parameter)
  }
  return result
}

export function createContextString(text: string, parameters: TemplateParameter[], values: Record<string, string>): string {
  let result = text
  for (const param of parameters) {
    const value = values[param.name] ?? ''
    const placeholder = `{${param.name}:${param.type}${param.values ? ':' + param.values.join(',') : ''}}`
    result = result.replace(placeholder, value)
  }
  return result
}
