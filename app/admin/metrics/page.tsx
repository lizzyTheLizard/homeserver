import { DashboardCard } from '../_components/DashboardCard'
import { serverPageFunction } from '@/app/shared/_helper/PageFunction'
import { loadCashMetrics, loadCoeditorMetrics, loadGeneralMetrics } from './server'

export const metadata = {
  title: 'Admin - Metrics',
}

export default async function Page() {
  return serverPageFunction(metadata.title, async () => {
    const generalMetics = await loadGeneralMetrics()
    const coeditorMetrics = await loadCoeditorMetrics()
    const cashMetrics = await loadCashMetrics()

    return (
      <main>
        <h1>Metrics</h1>
        <div className="row">
          <DashboardCard header="General" items={generalMetics}></DashboardCard>
          <DashboardCard header="CoEditor" items={coeditorMetrics}></DashboardCard>
          <DashboardCard header="Cash" items={cashMetrics}></DashboardCard>
        </div>
      </main>
    )
  })
}
