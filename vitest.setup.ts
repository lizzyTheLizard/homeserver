import { beforeAll, vi } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { promises as fs } from 'fs'
import { PoolClient } from 'pg'
import { TYPE_MAPPINGS } from './app/shared/_external/db/setup'

const pglite = await PGlite.create({
  parsers: TYPE_MAPPINGS,
})
beforeAll(async () => {
  const names = await fs.readdir('./db')
  for (const name of names) {
    const content = await fs.readFile(`./db/${name}`, 'utf-8')
    const commands = content.split(';').map(c => c.trim()).filter(c => c.length > 0)
    for (const command of commands) {
      await pglite.query(command)
    }
  }
  vi.mock('@/app/shared/_external/db/access', async (importOriginal: () => Promise<typeof import('@/app/shared/_external/db/access')>) => {
    const actual = await importOriginal()
    return {
      ...actual,
      transactional(fn: (client: PoolClient) => Promise<unknown>) { return fn(pglite as unknown as PoolClient) },
      nontransactional(fn: (client: PoolClient) => Promise<unknown>) { return fn(pglite as unknown as PoolClient) },
    }
  })
})
