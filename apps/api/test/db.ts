import pg from 'pg'
import { inject } from 'vitest'
import { createDb, type Db } from '../src/db/client'
import { wipe } from '../src/db/seed'
import { ADMIN_URL, runPrefix, templateFor, urlFor } from './env'

/**
 * A database of its own for this test file, copied from the run's migrated template (fast); the run drops it at the end
 * (global-setup.ts). `reset()` empties every table between tests.
 */
export async function testDatabase(): Promise<{ db: Db; name: string; reset: () => Promise<void> }> {
  const run = inject('testRun')
  const name = `${runPrefix(run)}${process.env.VITEST_POOL_ID ?? '0'}_${Math.random().toString(36).slice(2, 8)}`
  const admin = new pg.Client({ connectionString: ADMIN_URL })
  await admin.connect()
  await admin.query(`create database "${name}" template "${templateFor(run)}"`)
  await admin.end()
  const pool = new pg.Pool({ connectionString: urlFor(name), max: 4 })
  const db = createDb(pool)
  return { db, name, reset: () => wipe(db) }
}
