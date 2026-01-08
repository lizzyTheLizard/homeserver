import { LoadingSpinner } from '@/app/shared/_components/LoadingSpinner'
import { DashboardCard } from '../DashboardCard'

export default function Loading() {
  return (
    <main>
      <h1>Metrics</h1>
      <LoadingSpinner />
      <div className="row">
        <DashboardCard header="General" items={[]}></DashboardCard>
        <DashboardCard header="CoEditor" items={[]}></DashboardCard>
        <DashboardCard header="Cash" items={[]}></DashboardCard>
      </div>
    </main>
  )
}
