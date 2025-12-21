import { getUserSession } from '@/app/common/auth/auth'
import { Card } from '@/app/shared/components/Card'
import { Metadata } from 'next/dist/lib/metadata/types/metadata-interface'
import styles from './page.module.css'
import { config } from '@/app/config'
import { randomUUID } from 'crypto'
import { Line, LineItem } from './components/Line'

const instanceId = randomUUID()

export const metadata: Metadata = {
  title: 'Admin - Dashboard',
}

export default async function Page() {
  const session = await getUserSession()
  if (!session) throw new Error('Not authenticated')

  const buildInfo = getBuildInfo()
  const runInfo = getRunInfo()
  const configInfo = getConfigInfo()

  return (
    <main>
      <div className="row">
        <Card>
          <h2>Build</h2>
          <table className={styles.table}>
            <tbody>
              {buildInfo.map(i => <Line key={i.name} item={i}></Line>)}
            </tbody>
          </table>
        </Card>
        <Card>
          <h2>Run</h2>
          <table className={styles.table}>
            <tbody>
              {runInfo.map(i => <Line key={i.name} item={i}></Line>)}
            </tbody>
          </table>
        </Card>
        <Card>
          <h2>Config</h2>
          <table className={styles.table}>
            <tbody>
              {configInfo.map(i => <Line key={i.name} item={i}></Line>)}
            </tbody>
          </table>
        </Card>
      </div>
    </main>
  )
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
    { name: 'Environment', value: process.env.NODE_ENV },

  ]
}

function getConfigInfo(): LineItem[] {
  return Object.keys(config).map(key => ({ name: key, value: config[key].confidential ? '***' : config[key].value }))
}
