import { DashboardCard } from '../_components/DashboardCard'
import { serverPageFunction } from '@/app/shared/_helper/PageFunction'
import { loadCashMetrics, loadCoeditorMetrics, loadGeneralMetrics } from './server'
import styles from './Metrics.module.css'

export const metadata = {
  title: 'Admin - Metrics',
}

export default async function Page() {
  return serverPageFunction(metadata.title, async () => {
    const generalMetrics = await loadGeneralMetrics()
    const coeditorMetrics = await loadCoeditorMetrics()
    const cashMetrics = await loadCashMetrics()

    return (
      <main>
        <h1>Metrics</h1>
        <div className={styles.grid}>
          <DashboardCard header="General" items={generalMetrics} />
          <DashboardCard header="CoEditor" items={coeditorMetrics} />
          <DashboardCard header="Cash" items={cashMetrics} />
        </div>
      </main>
    )
  })
}
