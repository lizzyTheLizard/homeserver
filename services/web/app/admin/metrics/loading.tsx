import { ActionTitle } from '@/app/shared/_components/ActionTitle'
import { DashboardCard } from '../_components/DashboardCard'
import { LoadingSpinner } from '@/app/shared/_components/LoadingSpinner'
import styles from './Metrics.module.css'

export default function Loading() {
  return (
    <main>
      <ActionTitle>
        <h1>Metrics</h1>
      </ActionTitle>
      <LoadingSpinner />
      <div className={styles.grid}>
        <DashboardCard header="General" items={[]} />
        <DashboardCard header="CoEditor" items={[]} />
        <DashboardCard header="Cash" items={[]} />
      </div>
    </main>
  )
}
