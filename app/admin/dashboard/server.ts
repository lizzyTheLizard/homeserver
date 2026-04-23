import { getAuthenticatedUserSession } from '@/app/common/auth/auth'
import { config } from '@/app/shared/config'
import { v4 as randomUUID } from 'uuid'
import { LineItem } from '../_components/DashboardCard'
import { nontransactional } from '@/app/shared/_external/db/access'
import { findNumberOfCommands } from '@/app/coeditor/_data/Command'
import { findNumberOfTransactions } from '@/app/cash/_data/Transaction'
import { get24HoursAgo, get30DaysAgo } from '@/app/cash/_helper/Dates'
import { Temporal } from '@js-temporal/polyfill'

const instanceId = randomUUID()

export async function loadConfigInfo() {
  await getAuthenticatedUserSession('admin')
  const dbId = new URL(config.DB_CONNECTION_STRING).pathname.substring(1)
  return [
    { name: 'Database', value: dbId, url: getDatabaseConsoleUrl(dbId) },
    { name: 'App URL', value: config.APP_URL.replace(/^https?:\/\//, ''), url: config.APP_URL },
    { name: 'Client ID', value: 'Homeserver', url: getEntraPortalUrl(config.OIDC.CLIENT_ID) },
  ]
}

function getDatabaseConsoleUrl(dbId: string | undefined) {
  if (!dbId) return undefined
  return 'https://console.scaleway.com/serverless-db/fr-par/databases/' + dbId + '/overview'
}

function getEntraPortalUrl(clientId: string | undefined) {
  if (!clientId) return undefined
  return 'https://entra.microsoft.com/#view/Microsoft_AAD_RegisteredApps/ApplicationMenuBlade/~/Overview/appId/' + clientId + '/isMSAApp~/false'
}

export async function loadBuildInfo(): Promise<LineItem[]> {
  await getAuthenticatedUserSession('admin')
  return [
    { name: 'Branch', value: process.env.GIT_BRANCH, url: getBranchUrl(process.env.GIT_BRANCH) },
    { name: 'Commit', value: process.env.GIT_COMMIT_HASH?.slice(0, 7), url: getCommitUrl(process.env.GIT_COMMIT_HASH) },
    { name: 'Action', value: process.env.GITHUB_RUN_ID, url: getActionUrl(process.env.GITHUB_RUN_ID) },
    { name: 'Origin', value: process.env.GITHUB_RUN_ID ? 'GitHub' : 'Local' },
    { name: 'Built', date: process.env.BUILD_TIME ? Temporal.Instant.from(process.env.BUILD_TIME) : undefined },

  ]
}

function getBranchUrl(branchId: string | undefined) {
  if (!branchId) return undefined
  return 'https://github.com/lizzyTheLizard/homeserver/tree/' + branchId
}

function getCommitUrl(commitId: string | undefined) {
  if (!commitId) return undefined
  return 'https://github.com/lizzyTheLizard/homeserver/commit/' + commitId
}

function getActionUrl(actionId: string | undefined) {
  if (!actionId) return undefined
  return 'https://github.com/lizzyTheLizard/homeserver/actions/runs/' + actionId
}

export async function loadRunInfo(): Promise<LineItem[]> {
  await getAuthenticatedUserSession('admin')
  const started = Temporal.Now.instant().subtract(Temporal.Duration.from({ seconds: Math.floor(process.uptime()) }))

  return [
    { name: 'Instance', value: instanceId.substring(0, 8) },
    { name: 'Started', date: started },
    { name: 'Uptime', value: formatUptime(process.uptime()) },
    { name: 'Environment', value: process.env.NODE_ENV, accent: 'rgba(30,150,30,1)' },
  ]
}

function formatUptime(seconds: number): string {
  const h = Math.floor(seconds / 3600).toString()
  const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0')
  const s = Math.floor(seconds % 60).toString().padStart(2, '0')
  return `${h}h ${m}m ${s}s`
}

export async function loadMetricsInfo(): Promise<LineItem[]> {
  await getAuthenticatedUserSession('admin')
  return nontransactional(async c => [
    { name: 'Memory (MB)', value: (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2) },
    { name: 'CoEditor Commands (Day)', value: await findNumberOfCommands(c, get24HoursAgo()) },
    { name: 'CoEditor Commands (30-Days)', value: await findNumberOfCommands(c, get30DaysAgo()) },
    { name: 'Cash Transactions (Day)', value: await findNumberOfTransactions(c, get24HoursAgo()) },
    { name: 'Cash Transactions (30-Days)', value: await findNumberOfTransactions(c, get30DaysAgo()) },
  ] as LineItem[])
}
