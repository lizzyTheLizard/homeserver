import { DashboardCard } from '../_components/DashboardCard'
import { serverPageFunction } from '@/app/shared/_helper/PageFunction'
import { loadBuildInfo, loadConfigInfo, loadEvents, loadMetricsInfo, loadRunInfo } from './server'
import { EventsCard } from './_components/EventsCard'
import styles from './Dashboard.module.css'
import { ActionTitle } from '@/app/shared/_components/ActionTitle'
import { config } from '@/app/shared/config'

export const metadata = {
  title: 'Admin - Dashboard',
}

export default async function Page() {
  return serverPageFunction(metadata.title, async () => {
    const [buildInfo, runInfo, configInfo, metricsInfo, events] = await Promise.all([
      loadBuildInfo(),
      loadRunInfo(),
      loadConfigInfo(),
      loadMetricsInfo(),
      loadEvents(),
    ])

    return (
      <main>
        <ActionTitle>
          <h1>Dashboard</h1>
        </ActionTitle>
        <div className={styles.grid}>
          <DashboardCard header="Build" items={buildInfo} />
          <DashboardCard header="Run" items={runInfo} />
          <DashboardCard header="Config" url="/admin/config" items={configInfo} />
          <DashboardCard header="Metrics" url="/admin/metrics" items={metricsInfo} />
        </div>
        <EventsCard events={events} logUrl={config.LOG_URL} />
      </main>
    )
  })
}
