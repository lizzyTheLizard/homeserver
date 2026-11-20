'use client'

import { useEffect, useState } from 'react'
import { useIsClient } from '../../shared/_helper/useIsClient'
import styles from './Clock.module.css'

function useClock() {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => { setNow(new Date()) }, 1000)
    return () => { clearInterval(t) }
  }, [])
  return now
}

export function Clock() {
  const now = useClock()
  const isClient = useIsClient()
  const timeString = isClient ? now.toLocaleTimeString('de-AT', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '\u00A0'
  const dateString = isClient ? now.toLocaleDateString('de-AT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : '\u00A0'

  return (
    <div className={styles.clockBlock}>
      <div className={styles.clock}>
        {timeString}
      </div>
      <div className={styles.date}>
        {dateString}
      </div>
    </div>
  )
}
