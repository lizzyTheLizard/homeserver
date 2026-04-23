'use client'

import { Temporal } from '@js-temporal/polyfill'
import { useSyncExternalStore } from 'react'

export interface DateProps {
  /**
   * The date string to display.
   */
  date: string | Temporal.PlainDate | Temporal.Instant | undefined
}

/**
 * Displays a date value.
 */
// useSyncExternalStore avoids hydration mismatch by returning false on the server and true on the client
// see https://react.dev/reference/react-dom/client/hydrateRoot#suppressing-unavoidable-hydration-mismatch-errors
// eslint-disable-next-line @typescript-eslint/no-empty-function
const subscribe = () => () => {}

export function AdminDateTime({ date }: DateProps) {
  const isClient = useSyncExternalStore(subscribe, () => true, () => false)

  if (!isClient) return null
  if (!date) return null
  const t = typeof date !== 'string' ? date : date.length <= 10 ? Temporal.PlainDate.from(date) : Temporal.Instant.from(date)
  console.log(t)
  if (t instanceof Temporal.PlainDate)
    return (<span>{t.toLocaleString(undefined, { year: 'numeric', month: '2-digit', day: '2-digit' })}</span>)
  if (t instanceof Temporal.Instant) {
    const zoned = t.toZonedDateTimeISO(Intl.DateTimeFormat().resolvedOptions().timeZone)
    return (
      <div>
        <div>{zoned.toLocaleString(undefined, { weekday: 'long', year: 'numeric', month: '2-digit', day: '2-digit' })}</div>
        <div>{zoned.toLocaleString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</div>
      </div>
    )
  }
  throw new Error('Unsupported date type: ' + typeof date)
}
