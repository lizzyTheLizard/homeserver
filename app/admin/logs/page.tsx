import { getUserSession } from '@/app/common/auth/auth'
import { Metadata } from 'next/dist/lib/metadata/types/metadata-interface'
import { promises as fs } from 'fs'

import { logFilePath } from '@/logger'
import { Log } from './Log'

export const metadata: Metadata = {
  title: 'Admin - Log',
}

export default async function Page() {
  const session = await getUserSession()
  if (!session) throw new Error('Not authenticated')
  if (!session.applications.includes('admin')) throw new Error('Not authorized')

  const logFile = await fs.readFile(logFilePath, 'utf-8')
  const lines = logFile.split('\n').slice(-1000).reverse()

  return (
    <main>
      <h1>Logs</h1>
      <Log lines={lines} />
    </main>
  )
}
