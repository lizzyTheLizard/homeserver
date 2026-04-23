import { getAuthenticatedUserSession } from '@/app/common/auth/auth'
import { LineItem } from '../_components/DashboardCard'
import { nontransactional } from '@/app/shared/_external/db/access'
import { findNumberOfUsersWithTemplates } from '@/app/coeditor/_data/Template'
import { findNumberOfDiscussions } from '@/app/coeditor/_data/Discussion'
import { get24HoursAgo, getStartOfMonth, get30DaysAgo } from '@/app/cash/_helper/Dates'
import { findNumberOfCommands } from '@/app/coeditor/_data/Command'
import { findNumberOfAccounts } from '@/app/cash/_data/Account'
import { findNumberOfProjects } from '@/app/cash/_data/Project'
import { findNumberOfUsersWithProjects } from '@/app/cash/_data/Project'
import { findNumberOfTransactions } from '@/app/cash/_data/Transaction'

function formatUptime(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  const parts: string[] = []
  if (h > 0) parts.push(h.toString() + 'h')
  if (m > 0) parts.push(m.toString() + 'm')
  parts.push(s.toString() + 's')
  return parts.join(' ')
}

export async function loadGeneralMetrics(): Promise<LineItem[]> {
  await getAuthenticatedUserSession('admin')
  return [
    { name: 'Memory', value: `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB` },
    { name: 'Uptime', value: formatUptime(Math.floor(process.uptime())) },
  ]
}

export async function loadCoeditorMetrics(): Promise<LineItem[]> {
  await getAuthenticatedUserSession('admin')
  return nontransactional(async c => ([
    { name: 'Coeditor Users', value: await findNumberOfUsersWithTemplates(c) },
    { name: 'Discussions (Total)', value: await findNumberOfDiscussions(c) },
    { name: 'Discussions (day)', value: await findNumberOfDiscussions(c, get24HoursAgo()) },
    { name: 'Commands (Total)', value: await findNumberOfCommands(c) },
    { name: 'Commands (day)', value: await findNumberOfCommands(c, get24HoursAgo()) },
  ] as LineItem[]))
}

export async function loadCashMetrics(): Promise<LineItem[]> {
  await getAuthenticatedUserSession('admin')
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
