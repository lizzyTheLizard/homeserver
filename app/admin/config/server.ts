import { getAuthenticatedUserSession } from '@/app/common/auth/auth'

export interface ConfigEntry {
  key: string
  value: string | undefined
  secret?: boolean
  truncate?: boolean
}

export interface ConfigSection {
  id: string
  label: string
  entries: ConfigEntry[]
}

const SECRET_PATTERN = /PASSWORD|SECRET|KEY|TOKEN|CREDENTIAL/i

function makeEntry(key: string): ConfigEntry {
  const value = process.env[key]
  return {
    key,
    value,
    secret: SECRET_PATTERN.test(key),
    truncate: (value?.length ?? 0) > 80,
  }
}

export async function loadConfig(): Promise<ConfigSection[]> {
  await getAuthenticatedUserSession('admin')

  const allKeys = Object.keys(process.env).sort()
  const runtimeKeys = allKeys.filter(k => /^(NODE_|HOME|PORT|PWD|SHELL|USER|APP_URL)/.test(k) || ['HOSTNAME', 'RAM', 'TZ', 'PATH'].includes(k))
  const authKeys = allKeys.filter(k => /^(CLIENT_|ISSUER|SESSION_|OID_|OPLN_|COOKIE_NAME|ADMIN_)/.test(k) || k.endsWith('_API_KEY'))
  const dbKeys = allKeys.filter(k => k.startsWith('DB_'))
  const devKeys = allKeys.filter(k => /^(CHROMATIC_|WSL)/.test(k))
  const nodeKeys = allKeys.filter(k => /^(npm_|NODE_|NVM_|NODE|pnpm|COREPACK|PNPM)/.test(k))
  const categorized = new Set([...runtimeKeys, ...authKeys, ...dbKeys, ...devKeys, ...nodeKeys])
  const appKeys = allKeys.filter(k => !categorized.has(k))

  return [
    { id: 'runtime', label: 'Runtime', entries: runtimeKeys.map(makeEntry) },
    { id: 'auth', label: 'Auth / OIDC', entries: authKeys.map(makeEntry) },
    { id: 'db', label: 'Database', entries: dbKeys.map(makeEntry) },
    { id: 'dev', label: 'Development', entries: devKeys.map(makeEntry) },
    { id: 'node', label: 'Node / NPM', entries: nodeKeys.map(makeEntry) },
    { id: 'app', label: 'Various', entries: appKeys.map(makeEntry) },
  ].filter(s => s.entries.length > 0)
}
