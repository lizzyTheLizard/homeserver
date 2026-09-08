import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'

// Test-side configuration: reads the fixed non-secret values from
// integration-test/env.test (process.env wins when set). The orchestrator
// (scripts/run-smoke.mjs) exports the same file into the compose environment,
// so the values here always match the running stack.

const here = dirname(fileURLToPath(import.meta.url))
const ENV_TEST = join(here, '..', 'env.test')

const fileEnv: Record<string, string | undefined> = dotenv.parse(readFileSync(ENV_TEST, 'utf8'))

function get(key: string): string {
  return process.env[key] ?? fileEnv[key] ?? ''
}

export const stack = {
  appUrl: get('APP_URL') || 'https://www.gutschi.site',
  logsUrl: get('LOG_URL') || 'https://logs.gutschi.site',
  mockIssuer: get('LOGIN_ISSUER') || 'https://mock-oidc-server:8080',
  adminUsername: get('ADMIN_USERNAME') || 'admin',
  adminPassword: get('ADMIN_PASSWORD') || '',
  sshPort: 2222,
  dnsServer: '127.0.0.1',
  dnsPort: 53,
  mockHealthUrl: 'https://127.0.0.1:8080/health',
} as const

export const adminAuth = `${stack.adminUsername}:${stack.adminPassword}`
