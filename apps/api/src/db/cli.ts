/**
 * `pnpm db:migrate | db:seed | db:setup` (root: `pnpm db:setup`). Seeding writes demo data, so it runs only against a
 * local database unless `--allow-remote` is passed (production, by hand), and only with YERAL_ENV set (`seedMode()`):
 * production gets the category catalogue only. There is no staging (ADR 0020).
 * `setup` = create the database if missing, migrate, and seed it while it has no businesses. The demo's dates are fixed
 * at seed time (the demo day becomes that day), so a long-lived database goes stale: `seed` starts it over on today.
 */
import { sql } from 'drizzle-orm'
import pg from 'pg'
import { loadConfig } from '../config'
import { createDb } from './client'
import { runMigrations } from './migrate'
import { seed } from './seed'
import { seedMode } from './seed/mode'

const [command = 'setup', ...flags] = process.argv.slice(2)
const config = loadConfig(process.env)
const url = new URL(config.databaseUrl)
const isLocal = ['localhost', '127.0.0.1', 'postgres', 'db'].includes(url.hostname)

async function ensureDatabase() {
  if (!isLocal) return
  const name = url.pathname.slice(1)
  const admin = new URL(url)
  admin.pathname = '/postgres'
  const client = new pg.Client({ connectionString: admin.toString() })
  await client.connect()
  const { rowCount } = await client.query('select 1 from pg_database where datname = $1', [name])
  if (!rowCount) {
    await client.query(`create database "${name.replace(/"/g, '')}"`)
    console.warn(`created database ${name}`)
  }
  await client.end()
}

async function main() {
  const seeds = command === 'seed' || command === 'setup'
  // checked before anything runs: a misconfigured server gets an error, not a half-done setup
  const demo = seeds && seedMode(process.env.YERAL_ENV) === 'demo'
  if (seeds && !isLocal && !flags.includes('--allow-remote'))
    throw new Error(`Refusing to seed ${url.hostname}: pass --allow-remote for a remote database`)
  if (command === 'setup') await ensureDatabase()
  const pool = new pg.Pool({ connectionString: config.databaseUrl, max: 2 })
  const db = createDb(pool)
  try {
    if (command === 'migrate' || command === 'setup') {
      await runMigrations(db)
      console.warn('migrations applied')
    }
    if (seeds) {
      // `setup` seeds an empty database only; `seed` starts the demo over
      const [{ n } = { n: 0 }] = (await db.execute<{ n: number }>(sql`select count(*)::int as n from businesses`)).rows
      if (command === 'setup' && demo && n > 0) {
        console.warn(`the database already has ${n} businesses: kept (db:seed starts the demo over on today's date)`)
      } else {
        const counts = await seed(db, { demo, now: Date.now() })
        console.warn(`seeded ${demo ? 'demo data' : 'the category catalogue'}: ${JSON.stringify(counts)}`)
      }
    }
  } finally {
    await pool.end()
  }
}

main().catch((e: unknown) => {
  console.error(e)
  process.exit(1)
})
