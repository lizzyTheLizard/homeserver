import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'

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
  devUsername: get('DEV_USERNAME') || 'dev',
  devPassword: get('DEV_PASSWORD') || '',
  sshPort: 2222,
  dnsServer: '127.0.0.1',
  dnsPort: 8053,
  mockHealthUrl: 'https://127.0.0.1:8080/health',
  openDesignUrl: 'https://dev.gutschi.site:8446',
} as const

export const adminAuth = `${stack.adminUsername}:${stack.adminPassword}`
export const devAuth = `${stack.devUsername}:${stack.devPassword}`
