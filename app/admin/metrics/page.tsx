import { getAuthenticatedUserSession } from '@/app/common/auth/auth'
import { Metadata } from 'next/dist/lib/metadata/types/metadata-interface'
import { findNumberOfDiscussions } from '@/app/coeditor/_data/Discussion'
import { nontransactional } from '@/app/shared/db'
import { findNumberOfCommands } from '@/app/coeditor/_data/Command'
import { findNumberOfUsersWithTemplates } from '@/app/coeditor/_data/Template'
import { DashboardCard, LineItem } from '../_components/DashboardCard'

export const metadata: Metadata = {
  title: 'Admin - Metrics',
}

export default async function Page() {
  await getAuthenticatedUserSession('admin')

  return (
    <main>
      <h1>Metrics</h1>
      <div className="row">
        <DashboardCard header="General" items={getGeneralMetrics()}></DashboardCard>
        <DashboardCard header="CoEditor" items={await getCoeditorMetrics()}></DashboardCard>
        <DashboardCard header="Cash" items={getCashMetrics()}></DashboardCard>
      </div>
    </main>
  )
}

function getGeneralMetrics(): LineItem[] {
  return [
    { name: 'Memory (MB)', value: (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2) },
    { name: 'Uptime (s)', value: process.uptime().toFixed(0) },
  ]
}

async function getCoeditorMetrics(): Promise<LineItem[]> {
  return nontransactional(async c => ([
    { name: 'Coeditor Users', value: await findNumberOfUsersWithTemplates(c) },
    { name: 'Discussions (Total)', value: await findNumberOfDiscussions(c) },
    { name: 'Discussions (day)', value: await findNumberOfDiscussions(c, new Date(Date.now() - 24 * 60 * 60 * 1000)) },
    { name: 'Commands (Total)', value: await findNumberOfCommands(c) },
    { name: 'Commands (day)', value: await findNumberOfCommands(c, new Date(Date.now() - 24 * 60 * 60 * 1000)) },
  ] as LineItem[]))
}

function getCashMetrics(): LineItem[] {
  return []
}
