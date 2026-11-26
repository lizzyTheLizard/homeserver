import { spawn } from 'node:child_process'
import { accessSync, constants, mkdirSync } from 'node:fs'
import { readdir, rm, stat } from 'node:fs/promises'
import path from 'node:path'
import type { AppConfig } from './config'
import { uploadToOneDrive } from './onedrive'

const BACKUP_FILE_PATTERN = /^homeserver-prod-.*\.dump$/
const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000
const BYTES_PER_MEBIBYTE = 1024 * 1024

// Creates the backup directory if needed and fails if the service cannot write to it, so that a wrong owner of a mounted directory shows at start-up
export function ensureBackupDir(backupDir: string): void {
  mkdirSync(backupDir, { recursive: true })
  accessSync(backupDir, constants.W_OK)
}

export interface BackupResult {
  fileName: string
  size: number
}

// One backup: dumps the production database into the backup directory, uploads the dump to OneDrive and deletes old local dumps
export async function runBackup(config: AppConfig): Promise<BackupResult> {
  ensureBackupDir(config.backupDir)
  const timestamp = new Date().toISOString().slice(0, 19).replace('T', '_').replaceAll(':', '-')
  const fileName = `homeserver-prod-${timestamp}.dump`
  const file = path.join(config.backupDir, fileName)

  const { host, pathname } = new URL(config.dbConnectionString)
  console.info(`Creating full backup of ${pathname.slice(1)}@${host} in ${file}`)
  try {
    await pgDump(file, config)
  } catch (error) {
    // Do not keep a partial dump
    await rm(file, { force: true })
    throw error
  }
  const size = (await stat(file)).size
  console.info(`Backup created: ${(size / BYTES_PER_MEBIBYTE).toFixed(1)} MiB`)

  // A failed upload keeps the local dump, and the old dumps are only deleted after a successful upload
  await uploadToOneDrive(file, config)
  console.info(`Uploaded ${fileName} to OneDrive folder '${config.onedriveBackupFolder}'`)
  await deleteExpired(config.backupDir, config.retentionDays)
  return { fileName, size }
}

async function pgDump(file: string, config: AppConfig): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn('pg_dump', ['--format=custom', '--compress=6', `--file=${file}`, `--dbname=${config.dbConnectionString}`], { stdio: 'inherit' })
    child.on('error', reject)
    child.on('exit', code => {
      if (code === 0) resolve()
      else reject(new Error(`pg_dump exited with code ${String(code ?? 'unknown')}`))
    })
  })
}

// Like `find -mtime +N`: the age of a dump counts in whole days
async function deleteExpired(backupDir: string, retentionDays: number): Promise<void> {
  const now = Date.now()
  for (const name of await readdir(backupDir)) {
    if (!BACKUP_FILE_PATTERN.test(name)) continue
    const file = path.join(backupDir, name)
    const fileStat = await stat(file)
    const ageInDays = Math.floor((now - fileStat.mtime.getTime()) / DAY_IN_MILLISECONDS)
    if (ageInDays <= retentionDays) continue
    console.info(`Deleting backup ${name}`)
    await rm(file)
  }
}
