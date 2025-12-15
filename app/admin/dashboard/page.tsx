import { getUserSession } from '@/app/common/auth/auth'
import { Card } from '@/app/shared/components/Card'
import { Metadata } from 'next/dist/lib/metadata/types/metadata-interface'
import styles from './page.module.css'
import { config } from '@/app/config'
import { randomUUID } from 'crypto'

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
              {Object.entries(buildInfo).map(([key, value]) => (
                <tr key={key}>
                  <td className={styles.key}>{key.charAt(0).toUpperCase() + key.slice(1) + ':'}</td>
                  <td className={styles.value}>{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
        <Card>
          <h2>Run</h2>
          <table className={styles.table}>
            <tbody>
              {Object.entries(runInfo).map(([key, value]) => (
                <tr key={key}>
                  <td className={styles.key}>{key.charAt(0).toUpperCase() + key.slice(1) + ':'}</td>
                  <td className={styles.value}>{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
        <Card>
          <h2>Config</h2>
          <table className={styles.table}>
            <tbody>
              {Object.entries(configInfo).map(([key, value]) => (
                <tr key={key}>
                  <td className={styles.key}>{key.charAt(0).toUpperCase() + key.slice(1) + ':'}</td>
                  <td className={styles.value}>{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </main>
  )
}

function getBuildInfo(): Record<string, string | undefined> {
  // TODO Implement build info retrieval
  return {
    branch: process.env.GIT_BRANCH,
    commit: process.env.GIT_COMMIT_HASH,
    gitHubRun: process.env.GITHUB_RUN_ID,
    buildTime: process.env.DATE_BUILT,
    origin: process.env.GITHUB_RUN_ID ? 'GitHub' : 'local',
    environment: process.env.NODE_ENV,
  }
}

function getRunInfo(): Record<string, string | undefined> {
  return {
    instance: instanceId,
    startedAt: new Date(Date.now() - process.uptime() * 1000).toISOString(),
  }
}

function getConfigInfo(): Record<string, string> {
  return Object.keys(config).reduce<Record<string, string>>((acc, key) => {
    acc[key] = config[key].confidential ? '***' : config[key].value
    return acc
  }, {})
}
