/**
 * `pnpm db:migrate | db:seed | db:setup` (root: `pnpm db:setup`). Seeding writes demo data, so it runs only against a
 * local database unless `--allow-remote` is passed (production, by hand), and only with YERAL_ENV set (`seedMode()`):
 * production gets the cities and the category catalogue only. There is no staging (ADR 0020).
 * `setup` = create the database if missing, migrate, and seed it while it has no businesses; a kept demo still gets the
 * cities and categories brought up to date. The demo's dates are fixed
 * at seed time (the demo day becomes that day), so a long-lived database goes stale: `seed` starts it over on today.
 *
 * `admin-invite <login> "<name>"` (`pnpm --filter @yeral/api admin:invite`; on the server `node dist/cli.js
 * admin-invite` in the api's container): a Ýeral team account and its setup link, or a new link for a login that exists
 * (ADR 0026).
 */
import { sql } from 'drizzle-orm'
import pg from 'pg'
import { adminLoginSchema } from '@yeral/contract/admin'
import { loadConfig } from '../config'
import { inviteOrReset } from '../modules/admin/accounts'
import { createDb } from './client'
import { runMigrations } from './migrate'
import { seed, seedCatalogue } from './seed'
import { assertSeedTarget, seedMode } from './seed/mode'

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

/** The setup link goes to the terminal only: whoever runs this on the server hands it over. */
async function adminInvite(db: ReturnType<typeof createDb>, [login, ...name]: string[]) {
  const parsed = adminLoginSchema.safeParse(login ?? '')
  if (!parsed.success || !name.join(' ').trim()) throw new Error('usage: admin-invite <login> "<name>" (login: 3–32 of a-z 0-9 . -)')
  const link = await inviteOrReset({ db, now: Date.now, site: config.site, adminKey: config.adminKey }, parsed.data, name.join(' ').trim())
  console.warn(`${link.reset ? 'reset' : 'invited'} ${parsed.data}; the setup link, valid until ${new Date(link.expiresAt).toISOString()}:`)
  // eslint-disable-next-line no-console -- the link alone on stdout, for whoever runs this
  console.log(link.url)
}

async function main() {
  if (command === 'admin-invite') {
    const pool = new pg.Pool({ connectionString: config.databaseUrl, max: 1 })
    try {
      return await adminInvite(createDb(pool), flags)
    } finally {
      await pool.end()
    }
  }
  const seeds = command === 'seed' || command === 'setup'
  // checked before anything runs: a misconfigured server gets an error, not a half-done setup
  const demo = seeds && seedMode(process.env.YERAL_ENV) === 'demo'
  if (seeds) assertSeedTarget({ demo, local: isLocal, allowRemote: flags.includes('--allow-remote'), host: url.hostname })
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
        const counts = await db.transaction((tx) => seedCatalogue(tx))
        console.warn(`brought the catalogue up to date: ${JSON.stringify(counts)}`)
      } else {
        const counts = await seed(db, { demo, now: Date.now() })
        console.warn(`seeded ${demo ? 'demo data' : 'the cities and the category catalogue'}: ${JSON.stringify(counts)}`)
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
