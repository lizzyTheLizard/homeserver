import { getAuthenticatedUserSession } from '@/app/common/auth/auth'
import { Metadata } from 'next/dist/lib/metadata/types/metadata-interface'
import { promises as fs } from 'fs'

import { logFilePath } from '@/logger'
import { Log } from './Log'

export const metadata: Metadata = {
  title: 'Admin - Log',
}

export default async function Page() {
  await getAuthenticatedUserSession('admin')

  const logFile = await fs.readFile(logFilePath, 'utf-8')
  const lines = logFile.split('\n').slice(-1000)

  return (
    <main>
      <h1>Logs</h1>
      <Log lines={lines} />
    </main>
  )
}
