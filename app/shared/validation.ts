import { validate } from 'validate.js'
import { expectedError } from './BackendError'

export function validateObject(input: unknown, constraints: unknown) {
  const validationResult = validate(input, constraints, { format: 'flat' }) as string[] | undefined
  if (validationResult?.[0]) throw expectedError(validationResult[0], 400)
}

export function validateString(input: unknown) {
  if (typeof input !== 'string' || input.trim() === '') throw expectedError('Input must be a non-empty string', 400)
}
