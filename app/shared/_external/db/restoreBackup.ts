import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { createInterface } from 'node:readline/promises'

export type BackupTarget = 'dev' | 'test' | 'prod'

export interface RestoreOptions {
  file: string
  target: BackupTarget
  assumeYes: boolean
}

export function parseArgs(argv: string[]): RestoreOptions {
  const args = argv.filter(arg => arg !== '--')
  const assumeYes = args.includes('--yes')
  const positional = args.filter(arg => arg !== '--yes')
  if (positional.length !== 2) throw new Error('Usage: pnpm restoreBackup <backup-file> <dev|test|prod> [--yes]')
  const [file, target] = positional
  if (target !== 'dev' && target !== 'test' && target !== 'prod') throw new Error(`Invalid target '${target}' - expected dev, test or prod`)
  return { file, target, assumeYes }
}

export function resolveConnectionString(target: BackupTarget, env: Record<string, string | undefined> = process.env): string {
  switch (target) {
    case 'dev':
      return env.DB_CONNECTION_STRING ?? DEFAULT_DEV_CONNECTION
    case 'test':
      if (!env.DB_CONNECTION_STRING_TEST) throw new Error('Missing required environment variable: DB_CONNECTION_STRING_TEST')
      return env.DB_CONNECTION_STRING_TEST
    case 'prod':
      if (!env.DB_CONNECTION_STRING_PROD) throw new Error('Missing required environment variable: DB_CONNECTION_STRING_PROD')
      return env.DB_CONNECTION_STRING_PROD
  }
}

export function resolveBackupFile(file: string, backupDir: string = DEFAULT_BACKUP_DIR): string {
  const fullPath = path.isAbsolute(file) ? file : path.join(backupDir, file)
  if (!existsSync(fullPath)) throw new Error(`Backup file not found: ${fullPath}`)
  return fullPath
}

const DEFAULT_BACKUP_DIR = '/opt/homeserver/backup'
const DEFAULT_DEV_CONNECTION = 'postgres://homeserver:homeserver@localhost:5432/homeserver?sslmode=disable'

async function main(): Promise<void> {
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

async function confirmProd(file: string, connectionString: string): Promise<void> {
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

async function run(command: string, args: string[]): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'inherit' })
    child.on('error', reject)
    child.on('exit', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`${command} exited with code ${String(code ?? 'unknown')}`))
    })
  })
}

if (process.argv[1]?.endsWith('restoreBackup.ts')) {
  main().catch((error: unknown) => {
    console.error('[restoreBackup] Failed:', error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
}
