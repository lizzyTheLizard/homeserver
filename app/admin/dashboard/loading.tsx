import { LoadingSpinner } from '@/app/shared/components/LoadingSpinner'
import { DashboardCard } from '../DashboardCard'

export default function Loading() {
  return (
    <main>
      <h1>Admin Dashboard</h1>
      <LoadingSpinner />
      <div className="row">
        <DashboardCard header="Build" items={[]}></DashboardCard>
        <DashboardCard header="Run" items={[]}></DashboardCard>
        <DashboardCard header="Config" url="/admin/config" items={[]}></DashboardCard>
        <DashboardCard header="Metrics" url="/admin/metrics" items={[]}></DashboardCard>
      </div>
    </main>
  )
}
