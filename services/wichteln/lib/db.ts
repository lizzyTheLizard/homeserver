import 'server-only'
import { Pool } from 'pg'
import type { PoolClient } from 'pg'
import { getConfig } from './config'
import { applyMigrations, MIGRATION_LOCK_ID } from './migrate'

/** Minimal query interface shared by the pg pool, a transaction client and PGlite. */
export interface Queryable {
  query<T>(sql: string, params?: unknown[]): Promise<T[]>
}

declare global {
  var wichtelnDbPool: Promise<Pool> | undefined
}

class PgQueryable implements Queryable {
  constructor(private readonly client: Pool | PoolClient) {}

  async query<T>(sql: string, params: unknown[] = []): Promise<T[]> {
    const result = await this.client.query(sql, params)
    return result.rows as T[]
  }
}

/**
 * Returns the process-wide connection pool, creating it and running the
 * migrations on first use. A failed initialisation is not cached, so the next
 * request can retry once the database is reachable.
 */
export function getPool(): Promise<Pool> {
  globalThis.wichtelnDbPool ??= createPool().catch((error: unknown) => {
    globalThis.wichtelnDbPool = undefined
    throw error
  })
  return globalThis.wichtelnDbPool
}

/** Returns a read-only query handle backed by the pool. */
export async function getDb(): Promise<Queryable> {
  return new PgQueryable(await getPool())
}

/** Runs a read query against the pool. */
export async function query<T>(sql: string, params: unknown[] = []): Promise<T[]> {
  const pool = await getPool()
  return new PgQueryable(pool).query<T>(sql, params)
}

/** Runs `fn` inside a transaction, rolling back when it throws. */
export async function withTransaction<T>(fn: (db: Queryable) => Promise<T>): Promise<T> {
  const pool = await getPool()
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const result = await fn(new PgQueryable(client))
    await client.query('COMMIT')
    return result
  }
  catch (error) {
    try {
      await client.query('ROLLBACK')
    }
    catch {
      // Keep the original error; a failed rollback is not actionable here.
    }
    throw error
  }
  finally {
    client.release()
  }
}

async function createPool(): Promise<Pool> {
  const pool = new Pool({ connectionString: getConfig().dbConnectionString, max: 20 })
  try {
    await runMigrations(pool)
    return pool
  }
  catch (error) {
    await pool.end()
    throw error
  }
}

async function runMigrations(pool: Pool): Promise<void> {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query('SELECT pg_advisory_xact_lock($1)', [MIGRATION_LOCK_ID])
    await applyMigrations(new PgQueryable(client))
    await client.query('COMMIT')
  }
  catch (error) {
    try {
      await client.query('ROLLBACK')
    }
    catch {
      // Keep the original error; a failed rollback is not actionable here.
    }
    throw error
  }
  finally {
    client.release()
  }
}
