'use client'
import { dateColumn, enumColumn, textColumn } from '@/app/shared/_components/table/DataTableColumnBuilders'
import { DataTable } from '@/app/shared/_components/table/DataTable'
import { DateTime } from '@/app/shared/_components/DateTime'
import type { Event } from '@/app/shared/_data/Event'
import type { ReactNode } from 'react'
import styles from './EventsCard.module.css'

interface Props {
  events: Event[]
  logUrl: string
}

const columns = [
  dateColumn('time', { header: 'Time', style: { width: '12rem' } }),
  enumColumn('level', ['INFO', 'WARN', 'ERROR'], { cell: value => <span className={`${styles.badge  } ${  styles[`badge${  value}`]}`}>{value}</span>, header: 'Level', style: { width: '6rem' } }),
  textColumn('message', { header: 'Message' }),
]

function renderMobile(e: Event): ReactNode {
  return (
    <div key={e.id} className={styles.mobileItem}>
      <div className={styles.mobileTimeBadge}>
        <span className={styles.mobileTime}>
          <DateTime date={e.time} oneLine />
        </span>
        <span className={`${styles.badge  } ${  styles[`badge${  e.level}`]}`}>
          {e.level}
        </span>
      </div>
      <div className={styles.mobileMessage}>{e.message}</div>
    </div>
  )
}

export function EventsCard({ events, logUrl }: Props) {
  return (
    <div className={styles.eventsCard}>
      <div className={styles.eventsHeader}>
        <span className={styles.sectionLabel}>Events</span>
        <a href={logUrl} className={styles.viewLogsLink} target="_blank" rel="noopener">View logs &rarr;</a>
      </div>
      <DataTable
        columns={columns}
        initialSortingOrder={[{ direction: 'DESC', key: 'time' }]}
        renderMobile={renderMobile}
        data={events}
      />
    </div>
  )
}
