import { config } from '@/app/shared/config'
import styles from './EventsCard.module.css'

export function EventsCard() {
  return (
    <div className={styles.eventsCard}>
      <div className={styles.eventsHeader}>
        <span className={styles.sectionLabel}>Events</span>
        {config.GRAFANA_URL && (
          <a href={config.GRAFANA_URL} className={styles.viewLogsLink} target="_blank" rel="noopener">View logs &rarr;</a>
        )}
      </div>
    </div>
  )
}
