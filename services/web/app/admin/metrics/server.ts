import { getAuthenticatedUserSession } from '@/app/shared/auth/auth'
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
import { getDbPhaseTimings } from '@/app/shared/_external/db/setup'

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
  const phases = getDbPhaseTimings()
  return [
    { name: 'Memory', value: `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB` },
    { name: 'Uptime', value: formatUptime(Math.floor(process.uptime())) },
    { name: 'DB Connection time', value: phases ? `${phases.connectionMs.toString()}ms` : 'n/a' },
    { name: 'DB Migration time', value: phases ? `${phases.migrationMs.toString()}ms` : 'n/a' },
  ]
}

export async function loadCoeditorMetrics(): Promise<LineItem[]> {
  await getAuthenticatedUserSession('admin')
  return nontransactional(async (c) => {
    const [users, totalDiscussions, dayDiscussions, totalCommands, dayCommands] = await Promise.all([
      findNumberOfUsersWithTemplates(c),
      findNumberOfDiscussions(c),
      findNumberOfDiscussions(c, get24HoursAgo()),
      findNumberOfCommands(c),
      findNumberOfCommands(c, get24HoursAgo()),
    ])
    return [
      { name: 'Coeditor Users', value: users },
      { name: 'Discussions (Total)', value: totalDiscussions },
      { name: 'Discussions (day)', value: dayDiscussions },
      { name: 'Commands (Total)', value: totalCommands },
      { name: 'Commands (day)', value: dayCommands },
    ]
  })
}

export async function loadCashMetrics(): Promise<LineItem[]> {
  await getAuthenticatedUserSession('admin')
  return nontransactional(async (c) => {
    const [users, projects, accounts, total, day, days30, calMonth] = await Promise.all([
      findNumberOfUsersWithProjects(c),
      findNumberOfProjects(c),
      findNumberOfAccounts(c),
      findNumberOfTransactions(c),
      findNumberOfTransactions(c, get24HoursAgo()),
      findNumberOfTransactions(c, get30DaysAgo()),
      findNumberOfTransactions(c, getStartOfMonth()),
    ])
    return [
      { name: 'Cash Users', value: users },
      { name: 'Projects', value: projects },
      { name: 'Accounts', value: accounts },
      { name: 'Transactions (Total)', value: total },
      { name: 'Transactions (day)', value: day },
      { name: 'Transactions (30 days)', value: days30 },
      { name: 'Transactions (Calendar-Month)', value: calMonth },
    ]
  })
}
