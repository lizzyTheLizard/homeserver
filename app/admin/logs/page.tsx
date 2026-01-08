import { getAuthenticatedUserSession } from '@/app/common/auth/auth'
import { Metadata } from 'next/dist/lib/metadata/types/metadata-interface'
import { promises as fs } from 'fs'

import { logFilePath } from '@/app/shared/logger'
import { Logs } from './Logs'

export const metadata: Metadata = {
  title: 'Admin - Log',
}

export default async function Page() {
  await getAuthenticatedUserSession('admin')

  const logFile = await fs.readFile(logFilePath, 'utf-8')
  const lines = logFile.split('\n').slice(-1000)

  return (
    <Logs lines={lines} />
  )
}
