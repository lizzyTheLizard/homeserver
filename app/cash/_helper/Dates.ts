import { Temporal } from '@js-temporal/polyfill'

export function getStartOfMonth(): string {
  return Temporal.Now.plainDateISO('UTC')
    .with({ day: 1 })
    .toPlainDateTime({ hour: 0, minute: 0, second: 0, millisecond: 0 })
    .toString({ fractionalSecondDigits: 3 }) + 'Z'
}

export function get30DaysAgo(): string {
  return Temporal.Now.plainDateISO('UTC')
    .subtract({ days: 30 })
    .toPlainDateTime({ hour: 0, minute: 0, second: 0, millisecond: 0 })
    .toString({ fractionalSecondDigits: 3 }) + 'Z'
}

export function get24HoursAgo(): string {
  return Temporal.Now.plainDateTimeISO('UTC')
    .subtract({ hours: 24 })
    .toString({ fractionalSecondDigits: 3 }) + 'Z'
}
