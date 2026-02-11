import { validate, extend, validators } from 'validate.js'
import { invalidInput } from './BackendError'
import { Temporal } from '@js-temporal/polyfill'

export function validateObject(input: unknown, constraints: unknown) {
  const validationResult = validate(input, constraints, { format: 'flat' }) as string[] | undefined
  if (validationResult?.[0]) throw invalidInput(validationResult[0])
}

export function validateString(input: unknown) {
  if (typeof input !== 'string' || input.trim() === '') throw invalidInput('Input must be a non-empty string')
}

// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
extend(validators.datetime, {
  parse: function (value: string) {
    return Temporal.PlainDateTime.from(value)
      .toZonedDateTime('+00:00').epochMilliseconds
  },
  format: function (value: number) {
    return Temporal.Instant.fromEpochMilliseconds(value).toString()
  },
})
