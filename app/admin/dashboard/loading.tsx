import { LoadingSpinner } from '@/app/shared/_components/LoadingSpinner'
import { DashboardCard } from '../_components/DashboardCard'
import { ActionTitle } from '@/app/shared/_components/ActionTitle'

export default function Loading() {
  return (
    <main>
      <ActionTitle>
        <h1>Admin Dashboard</h1>
      </ActionTitle>
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
