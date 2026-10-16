import pg from 'pg'
import type { TestProject } from 'vitest/node'
import { createDb } from '../src/db/client'
import { runMigrations } from '../src/db/migrate'
import { ADMIN_URL, runPrefix, templateFor, urlFor } from './env'

declare module 'vitest' {
  export interface ProvidedContext {
    /** This run's id: its databases are `yeral_test_<run>_…` (test/env.ts). */
    testRun: string
  }
}

/** Once per run: a template database of its own with every migration applied; at the end, every database of the run goes. */
export default async function setup(project: TestProject) {
  const run = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
  const template = templateFor(run)
  const admin = new pg.Client({ connectionString: ADMIN_URL })
  await admin.connect()
  await admin.query(`create database "${template}"`)
  await admin.end()
  const teardown = async () => {
    const cleanup = new pg.Client({ connectionString: ADMIN_URL })
    await cleanup.connect()
    const { rows } = await cleanup.query<{ datname: string }>('select datname from pg_database where starts_with(datname, $1)', [
      runPrefix(run),
    ])
    for (const { datname } of rows) await cleanup.query(`drop database if exists "${datname}" with (force)`)
    await cleanup.end()
  }
  const pool = new pg.Pool({ connectionString: urlFor(template), max: 1 })
  try {
    await runMigrations(createDb(pool))
  } catch (e) {
    // a broken migration leaves no template behind either
    await pool.end()
    await teardown()
    throw e
  }
  await pool.end()
  project.provide('testRun', run)
  return teardown
}
