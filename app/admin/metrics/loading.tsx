import { LoadingSpinner } from '@/app/shared/_components/LoadingSpinner'
import { DashboardCard } from '../_components/DashboardCard'
import styles from './Metrics.module.css'

export default function Loading() {
  return (
    <main>
      <h1>Metrics</h1>
      <LoadingSpinner />
      <div className={styles.grid}>
        <DashboardCard header="General" items={[]}></DashboardCard>
        <DashboardCard header="CoEditor" items={[]}></DashboardCard>
        <DashboardCard header="Cash" items={[]}></DashboardCard>
      </div>
    </main>
  )
}
