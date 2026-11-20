import { ActionTitle } from '@/app/shared/_components/ActionTitle'
import { DashboardCard } from '../_components/DashboardCard'
import { EventsCard } from './_components/EventsCard'
import { LoadingSpinner } from '@/app/shared/_components/LoadingSpinner'
import { config } from '@/app/shared/config'
import styles from './Dashboard.module.css'

export default function Loading() {
  return (
    <main>
      <ActionTitle>
        <h1>Dashboard</h1>
      </ActionTitle>
      <LoadingSpinner />
      <div className={styles.grid}>
        <DashboardCard header="Build" items={[]} />
        <DashboardCard header="Run" items={[]} />
        <DashboardCard header="Config" url="/admin/config" items={[]} />
        <DashboardCard header="Metrics" url="/admin/metrics" items={[]} />
      </div>
      <EventsCard events={[]} logUrl={config.LOG_URL} />
    </main>
  )
}
