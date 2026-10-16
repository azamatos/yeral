/**
 * Cloudflare Workers entry (ADR 0007): the same app as on Node. Postgres through Hyperdrive: a request opens one client
 * on its first query (preflights, /version.json and /docs never connect); the Cron Trigger runs the jobs tick every
 * minute on a small pool (the tick's lock needs a connection of its own).
 */
import pg from 'pg'
import { createApp } from '../app'
import { loadConfig, type Config } from '../config'
import { createDb, type Db } from '../db/client'
import { createDeps } from '../deps'
import { jobsTick } from '../modules/jobs/tick'
import { createLogger } from '../ports/log'

interface Env {
  HYPERDRIVE?: { connectionString: string }
  [name: string]: unknown
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void
}

/** The binding exists only in the wrangler environment (`--env production`); the top level is not deployable. */
function databaseUrl(env: Env): string {
  const url = env.HYPERDRIVE?.connectionString
  if (!url) throw new Error('The HYPERDRIVE binding is missing: deploy and run with --env (apps/api/wrangler.jsonc)')
  return url
}

let config: Config | undefined
const configOf = (env: Env) => (config ??= loadConfig({ ...env, DATABASE_URL: databaseUrl(env) }))

const app = createApp(async (c, next) => {
  const env = c.env as Env
  const url = databaseUrl(env)
  const cfg = configOf(env)
  const log = createLogger(cfg.logLevel, { app: 'api' })
  let client: pg.Client | undefined
  let db: Db | undefined
  c.set(
    'deps',
    createDeps(
      cfg,
      () => {
        if (!db) {
          client = new pg.Client({ connectionString: url })
          // node-postgres queues the queries until the connection is up, and fails them if it never comes
          client.connect().catch((e: unknown) => log.error('database connection failed', { error: String(e) }))
          db = createDb(client)
        }
        return db
      },
      log,
    ),
  )
  try {
    await next()
  } finally {
    if (client) c.executionCtx.waitUntil(client.end().catch(() => {}))
  }
})

async function scheduledTick(env: Env): Promise<void> {
  let pool: pg.Pool | undefined
  try {
    const cfg = configOf(env)
    pool = new pg.Pool({ connectionString: databaseUrl(env), max: 3 })
    await jobsTick(createDeps(cfg, createDb(pool)))
  } catch (e) {
    createLogger('error', { app: 'api' }).error('jobs failed', { error: String(e) })
  } finally {
    await pool?.end().catch(() => {})
  }
}

export default {
  fetch: app.fetch,
  scheduled(_controller: unknown, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(scheduledTick(env))
  },
}
