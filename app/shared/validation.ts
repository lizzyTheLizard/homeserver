import { validate } from 'validate.js'
import { invalidInput } from './BackendError'

export function validateObject(input: unknown, constraints: unknown) {
  const validationResult = validate(input, constraints, { format: 'flat' }) as string[] | undefined
  if (validationResult?.[0]) throw invalidInput(validationResult[0])
}

export function validateString(input: unknown) {
  if (typeof input !== 'string' || input.trim() === '') throw invalidInput('Input must be a non-empty string')
}
