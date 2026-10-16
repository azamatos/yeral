import pg from 'pg'
import { afterAll } from 'vitest'
import { createDb, type Db } from '../src/db/client'
import { wipe } from '../src/db/seed'
import { ADMIN_URL, TEMPLATE_DB, urlFor } from './env'

/**
 * A database of its own for this test file, copied from the migrated template (fast), dropped after the file.
 * `reset()` empties every table between tests.
 */
export async function testDatabase(): Promise<{ db: Db; name: string; reset: () => Promise<void> }> {
  const name = `yeral_test_${process.env.VITEST_POOL_ID ?? '0'}_${Math.random().toString(36).slice(2, 8)}`
  const admin = new pg.Client({ connectionString: ADMIN_URL })
  await admin.connect()
  await admin.query(`create database "${name}" template "${TEMPLATE_DB}"`)
  await admin.end()
  const pool = new pg.Pool({ connectionString: urlFor(name), max: 4 })
  const db = createDb(pool)
  afterAll(async () => {
    await pool.end()
    const cleanup = new pg.Client({ connectionString: ADMIN_URL })
    await cleanup.connect()
    await cleanup.query(`drop database if exists "${name}" with (force)`)
    await cleanup.end()
  })
  return { db, name, reset: () => wipe(db) }
}
