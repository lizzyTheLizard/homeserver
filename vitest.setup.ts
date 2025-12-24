import { beforeAll, vi } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { promises as fs } from 'fs'
import { PoolClient } from 'pg'

const pglite = new PGlite()

let user = 'test-user'

export function setUser(id: string) {
  user = id
}

beforeAll(async () => {
  const names = await fs.readdir('./db')
  for (const name of names) {
    const content = await fs.readFile(`./db/${name}`, 'utf-8')
    const commands = content.split(';').map(c => c.trim()).filter(c => c.length > 0)
    for (const command of commands) {
      await pglite.query(command)
    }
  }
  vi.mock('@/app/shared/db', () => ({
    transactional(fn: (client: PoolClient) => Promise<unknown>) { return fn(pglite as unknown as PoolClient) },
  }))
  vi.mock('@/app/common/auth/auth', () => ({
    getUserSession() { return Promise.resolve({ sub: user, email: user + '@example.com' }) },
  }))
})
