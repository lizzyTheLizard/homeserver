#!/usr/bin/env node
// Restores a database backup into the DEV or PROD database.
// Runs inside the `backup` container (node:24-alpine + postgresql16-client),
// so it cannot be a pnpm script on the dev-machine. Invoke it with:
//   docker compose exec backup node /usr/local/bin/restore-backup.mjs <file> <dev|prod> [--yes]
// No npm dependencies - plain Node.js (>= 20) only.

import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { createInterface } from 'node:readline/promises'

const DEFAULT_BACKUP_DIR = '/backup'
// Default DEV connection points at the dev database container. The PROD
// connection has no default - it must come from DB_CONNECTION_STRING_PROD.
const DEFAULT_DEV_CONNECTION = 'postgres://homeserver:homeserver@postgresdev:5432/homeserver?sslmode=disable'

function parseArgs(argv) {
  const args = argv.filter(arg => arg !== '--')
  const assumeYes = args.includes('--yes')
  const positional = args.filter(arg => arg !== '--yes')
  if (positional.length !== 2) throw new Error('Usage: restore-backup.mjs <backup-file> <dev|prod> [--yes]')
  const [file, target] = positional
  if (target !== 'dev' && target !== 'prod') throw new Error(`Invalid target '${target}' - expected dev or prod`)
  return { file, target, assumeYes }
}

function resolveConnectionString(target, env = process.env) {
  switch (target) {
    case 'dev':
      return env.DB_CONNECTION_STRING ?? DEFAULT_DEV_CONNECTION
    case 'prod':
      if (!env.DB_CONNECTION_STRING_PROD) throw new Error('Missing required environment variable: DB_CONNECTION_STRING_PROD')
      return env.DB_CONNECTION_STRING_PROD
  }
}

function resolveBackupFile(file, backupDir = DEFAULT_BACKUP_DIR) {
  const fullPath = path.isAbsolute(file) ? file : path.join(backupDir, file)
  if (!existsSync(fullPath)) throw new Error(`Backup file not found: ${fullPath}`)
  return fullPath
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  const file = resolveBackupFile(options.file)
  const connectionString = resolveConnectionString(options.target)
  if (options.target !== 'prod' && process.env.DB_CONNECTION_STRING_PROD && connectionString === process.env.DB_CONNECTION_STRING_PROD)
    throw new Error('Refusing to restore into the PROD database - use target \'prod\' if this is intentional')
  if (options.target === 'prod' && !options.assumeYes) await confirmProd(file, connectionString)
  console.log(`[restoreBackup] Restore ${file} into the ${options.target} database`)
  await run('psql', [connectionString, '-v', 'ON_ERROR_STOP=1', '-c', 'DROP SCHEMA public CASCADE; CREATE SCHEMA public;'])
  await run('pg_restore', ['--exit-on-error', '--dbname', connectionString, file])
  console.log('[restoreBackup] Done - restart the target application so that any pending migrations are applied')
}

async function confirmProd(file, connectionString) {
  if (!process.stdin.isTTY) throw new Error('Restoring into the PROD database requires interactive confirmation or the --yes flag')
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  try {
    const answer = await rl.question(`About to REPLACE the PROD database (${new URL(connectionString).host}) with ${file}.\nType 'restore prod' to confirm: `)
    if (answer.trim() !== 'restore prod') throw new Error('Aborted - confirmation did not match')
  }
  finally {
    rl.close()
  }
}

async function run(command, args) {
  await new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'inherit' })
    child.on('error', reject)
    child.on('exit', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`${command} exited with code ${String(code ?? 'unknown')}`))
    })
  })
}

if (process.argv[1]?.endsWith('restore-backup.mjs')) {
  main().catch((error) => {
    console.error('[restoreBackup] Failed:', error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
}
