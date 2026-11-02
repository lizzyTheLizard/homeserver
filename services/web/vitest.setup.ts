import { beforeAll, vi } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { promises as fs } from 'fs'
import path from 'path'
import { PoolClient } from 'pg'
import { TYPE_MAPPINGS } from './app/shared/_external/db/setup'
import { splitSql } from './app/shared/_external/db/splitSql'

const pglite = await PGlite.create({
  parsers: TYPE_MAPPINGS,
})

vi.mock('@/app/shared/_external/db/access', async (importOriginal: () => Promise<typeof import('@/app/shared/_external/db/access')>) => {
  const actual = await importOriginal()
  return {
    ...actual,
    transactional(fn: (client: PoolClient) => Promise<unknown>) { return fn(pglite as unknown as PoolClient) },
    nontransactional(fn: (client: PoolClient) => Promise<unknown>) { return fn(pglite as unknown as PoolClient) },
  }
})

beforeAll(async () => {
  const migrationsDir = path.join(process.cwd(), 'db')
  const names = (await fs.readdir(migrationsDir))
    .filter(n => n.endsWith('.sql'))
    .sort()
  for (const name of names) {
    const content = await fs.readFile(`${migrationsDir}/${name}`, 'utf-8')
    for (const command of splitSql(content)) {
      await pglite.query(command)
    }
  }
})
