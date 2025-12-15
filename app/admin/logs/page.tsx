import { getUserSession } from '@/app/common/auth/auth'
import { Metadata } from 'next/dist/lib/metadata/types/metadata-interface'
import styles from './page.module.css'
import { promises as fs } from 'fs'
import Textarea from '@/app/shared/components/Textarea'
import path, { dirname } from 'path'
import { fileURLToPath } from 'url'

export const metadata: Metadata = {
  title: 'Admin - Log',
}

export default async function Page() {
  const session = await getUserSession()
  if (!session) throw new Error('Not authenticated')

  const filename = fileURLToPath(import.meta.url)
  const currentDir = dirname(filename)
  const logFilePath = path.resolve(currentDir, '../../../../app.log')
  const logFile = await fs.readFile(logFilePath, 'utf-8')
  const lines = logFile.split('\n').slice(-1000).reverse()

  return (
    <main className={styles.container}>
      {lines.map((l, index) => {
        const level = l.substring(27, 40).split(':')[0].trim()
        return (
          <span key={index} className={level === 'error' ? styles.errorLine : level === 'warn' ? styles.warnLine : styles.infoLine}>
            {l}
          </span>
        )
      })}
    </main>
  )
}
