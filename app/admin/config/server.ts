import { getAuthenticatedUserSession } from '@/app/common/auth/auth'

export async function loadConfig() {
  await getAuthenticatedUserSession('admin')
  return Object.keys(process.env)
    .map(key => ({ id: key, key, value: process.env[key] }))
}
