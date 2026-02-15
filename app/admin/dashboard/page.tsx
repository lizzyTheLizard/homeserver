import { DashboardCard } from '../_components/DashboardCard'
import { config } from '@/app/shared/config'
import { serverPageFunction } from '@/app/shared/_helper/PageFunction'
import { loadBuildInfo, loadConfigInfo, loadMetricsInfo, loadRunInfo } from './server'
import { ActionTitle } from '@/app/shared/_components/ActionTitle'

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
        <ActionTitle>
          <h1>Admin Dashboard</h1>
        </ActionTitle>
        <div className="row">
          <DashboardCard header="Build" items={buildInfo}></DashboardCard>
          <DashboardCard header="Run" items={runInfo}></DashboardCard>
          <DashboardCard header="Config" url="/admin/config" items={configInfo}></DashboardCard>
          <DashboardCard header="Metrics" url="/admin/metrics" items={metricsInfo}></DashboardCard>
          <DashboardCard header="Logs" url={config.GRAFANA_URL} items={[]}></DashboardCard>
        </div>
      </main>
    )
  })
}
