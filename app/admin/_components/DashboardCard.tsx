import { DateTime } from '@/app/shared/_components/DateTime'
import styles from './DashboardCard.module.css'
import { ReactNode } from 'react'
import { Card } from '@/app/shared/_components/Card'
import Link from 'next/link'
import { Temporal } from '@js-temporal/polyfill'

export interface LineItem {
  name: string
  value: string | Temporal.Instant | number | undefined
  url?: string
}

export interface DashboardCardProps {
  items: LineItem[]
  header: string
  url?: string
}

export function DashboardCard({ items, header, url }: DashboardCardProps) {
  return (
    <Card>
      <h2>{header}</h2>
      <table className={styles.table}>
        <tbody>
          {items.map(i => <Line key={i.name} item={i}></Line>)}
        </tbody>
      </table>
      {url && <Link className={styles.link} href={url}>View all &rarr;</Link>}
    </Card>
  )
}

function Line({ item }: { item: LineItem }) {
  let value: ReactNode = ''
  if (item.value === undefined)
    value = '-'
  else if (item.value instanceof Temporal.Instant)
    value = (<DateTime date={item.value}></DateTime>)
  else
    value = item.value
  if (item.url)
    value = (<a href={item.url}>{value}</a>)
  return (
    <tr>
      <td className={styles.key}>{item.name + ':'}</td>
      <td className={styles.value}>{value}</td>
    </tr>
  )
}
