'use client'

import { Temporal } from '@js-temporal/polyfill'
import { useIsClient } from '../_helper/useIsClient'

export interface DateProps {
  /**
   * The date string to display.
   */
  date: string | Temporal.PlainDateLike | { epochMilliseconds: number } | undefined
}

/**
 * Displays a date value.
 */
export function DateTime({ date }: DateProps) {
  const isClient = useIsClient()
  if (!isClient) return null
  if (!date) return null

  const t = typeof date !== 'string' ? date : date.length <= 10 ? Temporal.PlainDate.from(date) : Temporal.Instant.from(date)
  if ('era' in t) {
    const date = Temporal.PlainDate.from(t)
    return (<span>{date.toLocaleString(undefined, { year: 'numeric', month: '2-digit', day: '2-digit' })}</span>)
  }
  if ('epochMilliseconds' in t) {
    const zoned = Temporal.Instant.fromEpochMilliseconds(t.epochMilliseconds)
      .toZonedDateTimeISO(Intl.DateTimeFormat().resolvedOptions().timeZone)
    return (
      <div>
        <div>{zoned.toLocaleString(undefined, { weekday: 'long', year: 'numeric', month: '2-digit', day: '2-digit' })}</div>
        <div>{zoned.toLocaleString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</div>
      </div>
    )
  }
  throw new Error('Unsupported date type ' + typeof date + ': ' + JSON.stringify(date))
}
