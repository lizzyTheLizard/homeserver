import { z } from 'zod'
import { invalidInput } from './BackendError'

export function validateObject<T extends z.ZodType>(input: unknown, schema: T): z.infer<T> {
  const result = schema.safeParse(input)
  if (!result.success) throw invalidInput(formatError(result.error))
  return result.data
}

export function validateString(input: unknown): string {
  return validateObject(input, z.string().trim().min(1))
}

function formatError(error: z.ZodError): string {
  const issue = error.issues[0]
  if (issue.path.length === 0) return 'Invalid input (' + issue.message + ')'
  return 'Invalid input on field \'' + issue.path.join('.') + '\' (' + issue.message + ')'
}
