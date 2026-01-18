import { getAuthenticatedUserSession } from '@/app/common/auth/auth'
import { promises as fs } from 'fs'

import { logFilePath } from '@/app/shared/logger'
import { Logs } from './Logs'
import { serverPageFunction } from '@/app/shared/PageFunction'

export const metadata = {
  title: 'Admin - Log',
}

export default async function Page() {
  return serverPageFunction(metadata.title, async () => {
    await getAuthenticatedUserSession('admin')

    const logFile = await fs.readFile(logFilePath, 'utf-8')
    const lines = logFile.split('\n')

    return (
      <Logs lines={lines} />
    )
  })
}
