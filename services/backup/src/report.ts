import type { BackupResult } from './backup'
import type { AppConfig } from './config'
import { sendMail } from './mail'

const BYTES_PER_MEBIBYTE = 1024 * 1024

// Runs a backup and mails its outcome: a failure always, a success unless switched off. The result of the run itself is passed on unchanged
export async function runAndReport(config: AppConfig, run: (config: AppConfig) => Promise<BackupResult>): Promise<void> {
  let result: BackupResult
  try {
    result = await run(config)
  } catch (error) {
    await sendMail(config, 'Backup FAILED', `The backup failed:\n\n${error instanceof Error ? error.message : String(error)}`)
    throw error
  }
  if (config.mailOnSuccess)
    await sendMail(config, 'Backup succeeded', `Backup ${result.fileName} (${(result.size / BYTES_PER_MEBIBYTE).toFixed(1)} MiB) was created and uploaded.`)
}
