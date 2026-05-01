'use client'
import { config } from '@/app/shared/config'
import { Event } from '@/app/shared/_data/Event'
import styles from './EventsCard.module.css'
import { DataTable } from '@/app/shared/_components/table/DataTable'
import { dateColumn, enumColumn, textColumn } from '@/app/shared/_components/table/DataTableColumnBuilders'
import { ReactNode } from 'react'
import { DateTime } from '@/app/shared/_components/DateTime'

interface Props {
  events: Event[]
}

const columns = [
  dateColumn('time', { header: 'Time', filter: false, style: { width: '12rem' } }),
  enumColumn('level', ['INFO', 'WARN', 'ERROR'], { header: 'Level', style: { width: '6rem' }, cell: value => <span className={styles.badge + ' ' + styles['badge' + value]}>{value}</span> }),
  textColumn('message', { header: 'Message' }),
]

function renderMobile(e: Event): ReactNode {
  return (
    <div key={e.id} className={styles.mobileItem}>
      <div className={styles.mobileTimeBadge}>
        <span className={styles.mobileTime}>
          <DateTime date={e.time} oneLine />
        </span>
        <span className={styles.badge + ' ' + styles['badge' + e.level]}>
          {e.level}
        </span>
      </div>
      <div className={styles.mobileMessage}>{e.message}</div>
    </div>
  )
}

export function EventsCard({ events }: Props) {
  return (
    <div className={styles.eventsCard}>
      <div className={styles.eventsHeader}>
        <span className={styles.sectionLabel}>Events</span>
        {config.GRAFANA_URL && (
          <a href={config.GRAFANA_URL} className={styles.viewLogsLink} target="_blank" rel="noopener">View logs &rarr;</a>
        )}
      </div>
      <DataTable
        columns={columns}
        initialSortingOrder={[{ key: 'time', direction: 'DESC' }]}
        renderMobile={renderMobile}
        data={events}
      />
    </div>
  )
}
