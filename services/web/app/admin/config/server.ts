import { getAuthenticatedUserSession } from '@/app/shared/auth/auth'

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

const SECRET_PATTERN = /PASSWORD|SECRET|KEY|TOKEN|CREDENTIAL|DB_CONNECTION_STRING/i

function makeEntry(key: string): ConfigEntry {
  const value = process.env[key]
  return {
    key,
    secret: SECRET_PATTERN.test(key),
    truncate: (value?.length ?? 0) > 80,
    value,
  }
}

export async function loadConfig(): Promise<ConfigSection[]> {
  await getAuthenticatedUserSession('admin')

  const allKeys = Object.keys(process.env).sort(),
   runtimeKeys = allKeys.filter(k => /^(NODE_|HOME|PORT|PWD|SHELL|USER|APP_URL)/.test(k) || ['HOSTNAME', 'RAM', 'TZ', 'PATH'].includes(k)),
   authKeys = allKeys.filter(k => /^(CLIENT_|ISSUER|SESSION_|OID_|OPLN_|COOKIE_NAME|ADMIN_)/.test(k) || k.endsWith('_API_KEY')),
   dbKeys = allKeys.filter(k => k.startsWith('DB_')),
   devKeys = allKeys.filter(k => k.startsWith('WSL')),
   nodeKeys = allKeys.filter(k => /^(npm_|NODE_|NVM_|NODE|pnpm|COREPACK|PNPM)/.test(k)),
   categorized = new Set([...runtimeKeys, ...authKeys, ...dbKeys, ...devKeys, ...nodeKeys]),
   appKeys = allKeys.filter(k => !categorized.has(k))

  return [
    { entries: runtimeKeys.map(makeEntry), id: 'runtime', label: 'Runtime' },
    { entries: authKeys.map(makeEntry), id: 'auth', label: 'Auth / OIDC' },
    { entries: dbKeys.map(makeEntry), id: 'db', label: 'Database' },
    { entries: devKeys.map(makeEntry), id: 'dev', label: 'Development' },
    { entries: nodeKeys.map(makeEntry), id: 'node', label: 'Node / NPM' },
    { entries: appKeys.map(makeEntry), id: 'app', label: 'Various' },
  ].filter(s => s.entries.length > 0)
}
