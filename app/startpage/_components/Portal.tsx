import Link from 'next/link'
import { Icon } from '../../shared/_components/Icon'
import styles from './Portal.module.css'

interface AppInfo {
  key: string
  name: string
  icon: string
  link: string
  description: string
}

export function Portal({ apps }: { apps: AppInfo[] }) {
  return (
    <div className={styles.cards}>
      {apps.map(app => (
        <Link key={app.key} href={app.link} className={styles.card}>
          <Icon name={app.icon} style={{ width: '3.5rem', height: '3.5rem' }} />
          <div className={styles.cardName}>{app.name}</div>
          <div className={styles.cardDesc}>{app.description}</div>
        </Link>
      ))}
    </div>
  )
}
