import { getAuthenticatedUserSession } from '@/app/common/auth/auth'
import { findNumberOfDiscussions } from '@/app/coeditor/_data/Discussion'
import { nontransactional } from '@/app/shared/db'
import { findNumberOfCommands } from '@/app/coeditor/_data/Command'
import { findNumberOfUsersWithTemplates } from '@/app/coeditor/_data/Template'
import { DashboardCard, LineItem } from '../_components/DashboardCard'
import { serverPageFunction } from '@/app/shared/_helper/PageFunction'
import { findNumberOfTransactions } from '@/app/cash/_data/Transaction'
import { findNumberOfAccounts } from '@/app/cash/_data/Account'
import { findNumberOfProjects, findNumberOfUsersWithProjects } from '@/app/cash/_data/Project'
import { get24HoursAgo, get30DaysAgo, getStartOfMonth } from '@/app/cash/_helper/Dates'

export const metadata = {
  title: 'Admin - Metrics',
}

export default async function Page() {
  return serverPageFunction(metadata.title, async () => {
    await getAuthenticatedUserSession('admin')

    return (
      <main>
        <h1>Metrics</h1>
        <div className="row">
          <DashboardCard header="General" items={getGeneralMetrics()}></DashboardCard>
          <DashboardCard header="CoEditor" items={await getCoeditorMetrics()}></DashboardCard>
          <DashboardCard header="Cash" items={await getCashMetrics()}></DashboardCard>
        </div>
      </main>
    )
  })
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
    { name: 'Discussions (day)', value: await findNumberOfDiscussions(c, get24HoursAgo()) },
    { name: 'Commands (Total)', value: await findNumberOfCommands(c) },
    { name: 'Commands (day)', value: await findNumberOfCommands(c, get24HoursAgo()) },
  ] as LineItem[]))
}

function getCashMetrics(): Promise<LineItem[]> {
  return nontransactional(async c => ([
    { name: 'Cash Users', value: await findNumberOfUsersWithProjects(c) },
    { name: 'Projects', value: await findNumberOfProjects(c) },
    { name: 'Accounts', value: await findNumberOfAccounts(c) },
    { name: 'Transactions (Total)', value: await findNumberOfTransactions(c) },
    { name: 'Transactions (day)', value: await findNumberOfTransactions(c, get24HoursAgo()) },
    { name: 'Transactions (30 days)', value: await findNumberOfTransactions(c, get30DaysAgo()) },
    { name: 'Transactions (Calendar-Month)', value: await findNumberOfTransactions(c, getStartOfMonth()) },
  ] as LineItem[]))
}
