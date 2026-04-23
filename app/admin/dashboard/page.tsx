import { DashboardCard } from '../_components/DashboardCard'
import { serverPageFunction } from '@/app/shared/_helper/PageFunction'
import { loadBuildInfo, loadConfigInfo, loadMetricsInfo, loadRunInfo } from './server'
import { EventsCard } from './_components/EventsCard'
import styles from './Dashboard.module.css'

export const metadata = {
  title: 'Admin - Dashboard',
}

export default async function Page() {
  return serverPageFunction(metadata.title, async () => {
    const buildInfo = await loadBuildInfo()
    const runInfo = await loadRunInfo()
    const configInfo = await loadConfigInfo()
    const metricsInfo = await loadMetricsInfo()

    return (
      <main>
        <h1>Dashboard</h1>
        <div className={styles.grid}>
          <DashboardCard header="Build" items={buildInfo} />
          <DashboardCard header="Run" items={runInfo} />
          <DashboardCard header="Config" url="/admin/config" items={configInfo} />
          <DashboardCard header="Metrics" url="/admin/metrics" items={metricsInfo} />
        </div>
        <EventsCard />
      </main>
    )
  })
}
