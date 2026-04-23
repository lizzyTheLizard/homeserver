'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Icon } from '../shared/_components/Icon'
import styles from './PortalContent.module.css'

interface AppInfo {
  key: string
  name: string
  icon: string
  link: string
  description: string
}

function useClock() {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  return now
}

export function PortalContent({ apps }: { apps: AppInfo[] }) {
  const now = useClock()

  return (
    <div className={styles.wrapper}>
      <div className={styles.clockBlock}>
        <div className={styles.clock}>
          {now.toLocaleTimeString('de-AT', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </div>
        <div className={styles.date}>
          {now.toLocaleDateString('de-AT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </div>
      </div>

      <div className={styles.cards}>
        {apps.map(app => (
          <Link key={app.key} href={app.link} className={styles.card}>
            <Icon name={app.icon} style={{ width: '3.5rem', height: '3.5rem' }} />
            <div className={styles.cardName}>{app.name}</div>
            <div className={styles.cardDesc}>{app.description}</div>
          </Link>
        ))}
      </div>
    </div>
  )
}
