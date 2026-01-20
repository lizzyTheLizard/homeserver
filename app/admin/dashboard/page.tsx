import { getAuthenticatedUserSession } from '@/app/common/auth/auth'
import { randomUUID } from 'crypto'
import { LineItem, DashboardCard } from '../_components/DashboardCard'
import { nontransactional } from '@/app/shared/db'
import { findNumberOfCommands } from '@/app/coeditor/_data/Command'
import { config } from '@/app/shared/config'
import { serverPageFunction } from '@/app/shared/_helper/PageFunction'

const instanceId = randomUUID()

export const metadata = {
  title: 'Admin - Dashboard',
}

export default async function Page() {
  return serverPageFunction(metadata.title, async () => {
    await getAuthenticatedUserSession('admin')

    return (
      <main>
        <h1>Admin Dashboard</h1>
        <div className="row">
          <DashboardCard header="Build" items={getBuildInfo()}></DashboardCard>
          <DashboardCard header="Run" items={getRunInfo()}></DashboardCard>
          <DashboardCard header="Config" url="/admin/config" items={getConfigInfo()}></DashboardCard>
          <DashboardCard header="Metrics" url="/admin/metrics" items={await getMetricsInfo()}></DashboardCard>
          <DashboardCard header="Logs" url={config.GRAFANA_URL} items={[]}></DashboardCard>
        </div>
      </main>
    )
  })
}

function getBuildInfo(): LineItem[] {
  return [
    { name: 'Branch', value: process.env.GIT_BRANCH, url: process.env.GIT_BRANCH ? 'https://github.com/lizzyTheLizard/homeserver/tree/' + process.env.GIT_BRANCH : undefined },
    { name: 'Commit', value: process.env.GIT_COMMIT_HASH, url: process.env.GIT_COMMIT_HASH ? 'https://github.com/lizzyTheLizard/homeserver/commit/' + process.env.GIT_COMMIT_HASH : undefined },
    { name: 'Action', value: process.env.GITHUB_RUN_ID, url: process.env.GITHUB_RUN_ID ? 'https://github.com/lizzyTheLizard/homeserver/actions/runs/' + process.env.GITHUB_RUN_ID : undefined },
    { name: 'Origin', value: process.env.GITHUB_RUN_ID ? 'GitHub' : 'Local' },
    { name: 'Built', value: process.env.BUILD_TIME ? new Date(process.env.BUILD_TIME) : undefined },

  ]
}

function getRunInfo(): LineItem[] {
  return [
    { name: 'Instance', value: instanceId },
    { name: 'Started', value: new Date(Date.now() - process.uptime() * 1000) },
    { name: 'Uptime (s)', value: process.uptime().toFixed(0) },
    { name: 'Environment', value: process.env.NODE_ENV },
  ]
}

async function getMetricsInfo(): Promise<LineItem[]> {
  return nontransactional(async c => [
    { name: 'Memory (MB)', value: (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2) },
    { name: 'CoEditor Commands', value: await findNumberOfCommands(c, new Date(Date.now() - 24 * 60 * 60 * 1000)) },
  ] as LineItem[])
}

function getConfigInfo(): LineItem[] {
  const dbId = config.DB_CONNECTION_STRING.split('@')[1].split('.')[0]
  return [
    { name: 'Database', value: dbId, url: dbId ? 'https://console.scaleway.com/serverless-db/fr-par/databases/' + dbId + '/overview' : undefined },
    { name: 'AppUrl', value: config.APP_URL, url: config.APP_URL },
    { name: 'ClientId', value: config.OIDC.CLIENT_ID, url: config.OIDC.CLIENT_ID ? 'https://entra.microsoft.com/#view/Microsoft_AAD_RegisteredApps/ApplicationMenuBlade/~/Overview/appId/' + config.OIDC.CLIENT_ID + '/isMSAApp~/false' : undefined },
  ]
}
