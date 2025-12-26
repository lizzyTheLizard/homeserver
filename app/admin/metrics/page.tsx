import { getUserSession } from '@/app/common/auth/auth'
import { Metadata } from 'next/dist/lib/metadata/types/metadata-interface'
import { findNumberOfDiscussions } from '@/app/coeditor/Discussion'
import { transactional } from '@/app/shared/db'
import { findNumberOfCommands } from '@/app/coeditor/Command'
import { findNumberOfUsersWithTemplates } from '@/app/coeditor/Template'
import { DashboardCard, LineItem } from '../DashboardCard'

export const metadata: Metadata = {
  title: 'Admin - Metrics',
}

export default async function Page() {
  const session = await getUserSession()
  if (!session) throw new Error('Not authenticated')
  if (!session.applications.includes('admin')) throw new Error('Not authorized')

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
  return transactional(async client => ([
    { name: 'Coeditor Users', value: await findNumberOfUsersWithTemplates(client) },
    { name: 'Discussions (Total)', value: await findNumberOfDiscussions(client) },
    { name: 'Discussions (day)', value: await findNumberOfDiscussions(client, new Date(Date.now() - 24 * 60 * 60 * 1000)) },
    { name: 'Commands (Total)', value: await findNumberOfCommands(client) },
    { name: 'Commands (day)', value: await findNumberOfCommands(client, new Date(Date.now() - 24 * 60 * 60 * 1000)) },
  ] as LineItem[]))
}

function getCashMetrics(): LineItem[] {
  return []
}
