import { getAuthenticatedUserSession } from '@/app/common/auth/auth'
import { config } from '@/app/shared/config'
import { v4 as randomUUID } from 'uuid'
import { LineItem } from '../_components/DashboardCard'
import { nontransactional } from '@/app/shared/db'
import { findNumberOfCommands } from '@/app/coeditor/_data/Command'
import { findNumberOfTransactions } from '@/app/cash/_data/Transaction'
import { get24HoursAgo, get30DaysAgo } from '@/app/cash/_helper/Dates'

const instanceId = randomUUID()

export async function loadConfigInfo() {
  await getAuthenticatedUserSession('admin')
  const dbId = config.DB_CONNECTION_STRING.split('@')[1].split('.')[0]
  return [
    { name: 'Database', value: dbId, url: getDatabaseConsoleUrl(dbId) },
    { name: 'AppUrl', value: config.APP_URL, url: config.APP_URL },
    { name: 'ClientId', value: config.OIDC.CLIENT_ID, url: getEntraPortalUrl(config.OIDC.CLIENT_ID) },
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
    { name: 'Commit', value: process.env.GIT_COMMIT_HASH, url: getCommitUrl(process.env.GIT_COMMIT_HASH) },
    { name: 'Action', value: process.env.GITHUB_RUN_ID, url: getActionUrl(process.env.GITHUB_RUN_ID) },
    { name: 'Origin', value: process.env.GITHUB_RUN_ID ? 'GitHub' : 'Local' },
    { name: 'Built', value: process.env.BUILD_TIME ? new Date(process.env.BUILD_TIME) : undefined },

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
  return [
    { name: 'Instance', value: instanceId },
    { name: 'Started', value: new Date(Date.now() - process.uptime() * 1000) },
    { name: 'Uptime (s)', value: process.uptime().toFixed(0) },
    { name: 'Environment', value: process.env.NODE_ENV },
  ]
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
