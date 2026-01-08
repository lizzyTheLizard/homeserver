'use client'

import { useEffect, useState } from 'react'

export interface DateProps {
  /**
   * The date string to display.
   */
  date: string | Date
  hideTime?: boolean
}

/**
 * Displays a date value.
 */
export function DateTime({ date, hideTime }: DateProps) {
  // Ensure this only renders on the client side to avoid hydration issues,
  // see https://react.dev/reference/react-dom/client/hydrateRoot#suppressing-unavoidable-hydration-mismatch-errors
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsClient(true)
  }, [])

  let output = ''
  if (!date || !isClient) {
    output = ''
  }
  else if (typeof date === 'string') {
    const trimmed = date.trim()
    if (!trimmed) output = ''
    else if (trimmed.length < 20 || hideTime) output = new Date(trimmed).toLocaleDateString()
    else output = new Date(trimmed).toLocaleString()
  }
  else {
    if (hideTime) output = date.toLocaleDateString()
    else output = date.toLocaleString('de-ch', { timeZone: 'Europe/Zurich' })
  }
  return (<span>{output}</span>)
}
