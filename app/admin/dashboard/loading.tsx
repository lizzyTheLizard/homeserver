import { LoadingSpinner } from '@/app/shared/_components/LoadingSpinner'
import { DashboardCard } from '../_components/DashboardCard'
import { EventsCard } from './_components/EventsCard'
import styles from './Dashboard.module.css'

export default function Loading() {
  return (
    <main>
      <h1 className={styles.title}>Dashboard</h1>
      <LoadingSpinner />
      <div className={styles.grid}>
        <DashboardCard header="Build" items={[]}></DashboardCard>
        <DashboardCard header="Run" items={[]}></DashboardCard>
        <DashboardCard header="Config" url="/admin/config" items={[]}></DashboardCard>
        <DashboardCard header="Metrics" url="/admin/metrics" items={[]}></DashboardCard>
      </div>
      <EventsCard />
    </main>
  )
}
