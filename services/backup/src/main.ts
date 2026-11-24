import { Cron } from 'croner'
import process from 'node:process'
import { ensureBackupDir, runBackup } from './backup'
import { getConfig } from './config'

const config = getConfig()
// Fails at start-up instead of silently skipping the nightly backup
ensureBackupDir(config.backupDir)

if (process.argv.includes('--now')) {
  // One additional backup right now, without the schedule: docker compose exec backup node dist/main.js --now
  runBackup(config).catch((error: unknown) => {
    console.error(error)
    process.exitCode = 1
  })
} else {
  // An invalid schedule throws here. A run that is still going when the next one is due makes that one skip, and a failed run does not stop the schedule
  const job = new Cron(config.schedule, { protect: true, catch: e => console.error(e) }, () => runBackup(config))
  console.info(`Nightly backup scheduled: ${config.schedule}, next run ${job.nextRun()?.toISOString() ?? 'never'}`)

  // As the main process of the container, node ignores the stop signals unless they are handled
  process.on('SIGTERM', () => process.exit(0))
  process.on('SIGINT', () => process.exit(0))
}
