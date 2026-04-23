import { Temporal } from '@js-temporal/polyfill'
import styles from './DashboardCard.module.css'
import Link from 'next/link'
import { AdminDateTime } from './AdminDateTime'

export interface LineItem {
  name: string
  value?: string | number | undefined
  date?: Temporal.Instant
  url?: string
  accent?: string
}

export interface DashboardCardProps {
  items: LineItem[]
  header: string
  url?: string
}

export function DashboardCard({ items, header, url }: DashboardCardProps) {
  return (
    <div className={styles.card}>
      <div className={styles.sectionLabel}>{header}</div>
      <div className={styles.rows}>
        {items.map(i => <Line key={i.name} item={i} />)}
      </div>
      {url && (
        <div className={styles.viewAll}>
          <Link href={url}>View all &rarr;</Link>
        </div>
      )}
    </div>
  )
}

function Line({ item }: { item: LineItem }) {
  let inner
  if ('date' in item && item.date) {
    // inner = <div>{typeof item.date}</div>
    inner = <AdminDateTime date={item.date} />
  }
  else {
    const text = item.value !== undefined ? String(item.value) : '-'
    const colorStyle = item.accent ? { color: item.accent } : undefined
    inner = item.url
      ? <a href={item.url} className={styles.link} style={colorStyle}>{text}</a>
      : <span style={colorStyle}>{text}</span>
  }
  return (
    <div className={styles.row}>
      <span className={styles.key}>{item.name}</span>
      <div className={styles.value}>{inner}</div>
    </div>
  )
}
