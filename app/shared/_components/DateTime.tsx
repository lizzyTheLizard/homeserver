'use client'

import { Temporal } from '@js-temporal/polyfill'
import { useEffect, useState } from 'react'

export interface DateProps {
  /**
   * The date string to display.
   */
  date: string | Temporal.PlainDate | Temporal.Instant
}

/**
 * Displays a date value.
 */
export function DateTime({ date }: DateProps) {
  // Ensure this only renders on the client side to avoid hydration issues,
  // see https://react.dev/reference/react-dom/client/hydrateRoot#suppressing-unavoidable-hydration-mismatch-errors
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  if (!isClient)
    return null
  const t = typeof date !== 'string' ? date : date.length <= 10 ? Temporal.PlainDate.from(date) : Temporal.Instant.from(date)
  if (t instanceof Temporal.PlainDate)
    return (<span>{t.toLocaleString(undefined, { year: 'numeric', month: '2-digit', day: '2-digit' })}</span>)
  if (t instanceof Temporal.Instant) {
    return (<span>{t.toZonedDateTimeISO(Intl.DateTimeFormat().resolvedOptions().timeZone).toLocaleString()}</span>)
  }
  throw new Error('Unsupported date type: ' + typeof date)
}
