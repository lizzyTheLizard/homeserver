import { getAuthenticatedUserSession } from '@/app/shared/auth/auth'
import { config } from '@/app/shared/config'
import { v4 as randomUUID } from 'uuid'
import { LineItem } from '../_components/DashboardCard'
import { nontransactional } from '@/app/shared/_external/db/access'
import { findNumberOfCommands } from '@/app/coeditor/_data/Command'
import { findNumberOfTransactions } from '@/app/cash/_data/Transaction'
import { get24HoursAgo, get30DaysAgo } from '@/app/cash/_helper/Dates'
import { Temporal } from '@js-temporal/polyfill'
import { Event, findRecentEvents } from '@/app/shared/_data/Event'

const DB_CONSOLE_URL_TEMPLATE = 'https://console.scaleway.com/serverless-db/fr-par/databases/{id}/overview'
const ENTRA_PORTAL_URL_TEMPLATE = 'https://entra.microsoft.com/#view/Microsoft_AAD_RegisteredApps/ApplicationMenuBlade/~/Overview/appId/{clientId}/isMSAApp~/false'
const REPO_URL = 'https://github.com/lizzyTheLizard/homeserver'
const instanceId = randomUUID()

export async function loadConfigInfo() {
  await getAuthenticatedUserSession('admin')
  const dbName = new URL(config.DB_CONNECTION_STRING).pathname.substring(1)
  const dbId = new URL(config.DB_CONNECTION_STRING).host.split('.')[0]
  return [
    { name: 'Database', value: dbName, url: getDatabaseConsoleUrl(dbId) },
    { name: 'App URL', value: config.APP_URL.replace(/^https?:\/\//, ''), url: config.APP_URL },
    { name: 'Client ID', value: 'Homeserver', url: getEntraPortalUrl(config.OIDC.CLIENT_ID) },
  ]
}

function getDatabaseConsoleUrl(dbId: string | undefined) {
  if (!dbId) return undefined
  return DB_CONSOLE_URL_TEMPLATE.replace('{id}', dbId)
}

function getEntraPortalUrl(clientId: string | undefined) {
  if (!clientId) return undefined
  return ENTRA_PORTAL_URL_TEMPLATE.replace('{clientId}', clientId)
}

export async function loadBuildInfo(): Promise<LineItem[]> {
  await getAuthenticatedUserSession('admin')
  return [
    { name: 'Branch', value: config.GIT_BRANCH, url: getBranchUrl(config.GIT_BRANCH) },
    { name: 'Commit', value: config.GIT_COMMIT_HASH.slice(0, 7), url: getCommitUrl(config.GIT_COMMIT_HASH) },
    { name: 'Action', value: config.GITHUB_RUN_ID, url: getActionUrl(config.GITHUB_RUN_ID) },
    { name: 'Origin', value: config.GITHUB_RUN_ID ? 'GitHub' : 'Local' },
    { name: 'Built', date: Temporal.Instant.from(config.BUILD_TIME) },

  ]
}

function getBranchUrl(branchId: string | undefined) {
  if (!branchId) return undefined
  return `${REPO_URL}/tree/${branchId}`
}

function getCommitUrl(commitId: string | undefined) {
  if (!commitId) return undefined
  return `${REPO_URL}/commit/${commitId}`
}

function getActionUrl(actionId: string | undefined) {
  if (!actionId) return undefined
  return `${REPO_URL}/actions/runs/${actionId}`
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

export async function loadEvents(): Promise<Event[]> {
  await getAuthenticatedUserSession('admin')
  return nontransactional(c => findRecentEvents(c))
}

export async function loadMetricsInfo(): Promise<LineItem[]> {
  await getAuthenticatedUserSession('admin')
  return nontransactional(async (c) => {
    const [coDay, co30, cashDay, cash30] = await Promise.all([
      findNumberOfCommands(c, get24HoursAgo()),
      findNumberOfCommands(c, get30DaysAgo()),
      findNumberOfTransactions(c, get24HoursAgo()),
      findNumberOfTransactions(c, get30DaysAgo()),
    ])
    return [
      { name: 'Memory (MB)', value: (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2) },
      { name: 'CoEditor Commands (Day)', value: coDay },
      { name: 'CoEditor Commands (30-Days)', value: co30 },
      { name: 'Cash Transactions (Day)', value: cashDay },
      { name: 'Cash Transactions (30-Days)', value: cash30 },
    ]
  })
}
