/**
 * Cloudflare Workers entry (ADR 0007): the same app as on Node. Postgres through Hyperdrive with a client per request
 * (Cloudflare's guidance for node-postgres); the Cron Trigger runs the jobs tick every minute.
 */
import pg from 'pg'
import { createApp } from '../app'
import { loadConfig, type Config } from '../config'
import { createDb } from '../db/client'
import type { Deps } from '../deps'
import { runDueJobs } from '../modules/jobs/run'
import { createLogger } from '../ports/log'
import { logSms } from '../ports/sms'

interface Env {
  HYPERDRIVE: { connectionString: string }
  [name: string]: unknown
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void
}

let config: Config | undefined
const configOf = (env: Env) => (config ??= loadConfig({ ...env, DATABASE_URL: env.HYPERDRIVE.connectionString }))

async function open(env: Env): Promise<{ deps: Deps; close: () => Promise<void> }> {
  const cfg = configOf(env)
  const log = createLogger(cfg.logLevel, { app: 'api' })
  const client = new pg.Client({ connectionString: env.HYPERDRIVE.connectionString })
  await client.connect()
  const deps: Deps = {
    db: createDb(client),
    site: cfg.site,
    now: Date.now,
    sms: logSms(log),
    media: (key) => `${cfg.mediaBaseUrl}/${key}`,
    log,
  }
  return { deps, close: () => client.end() }
}

const app = createApp(async (c, next) => {
  const { deps, close } = await open(c.env as Env)
  c.set('deps', deps)
  try {
    await next()
  } finally {
    c.executionCtx.waitUntil(close())
  }
})

export default {
  fetch: app.fetch,
  scheduled(_controller: unknown, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(
      open(env).then(async ({ deps, close }) => {
        try {
          const r = await runDueJobs(deps)
          if (r.expired || r.completed || r.jobs) deps.log.info('jobs', r)
        } finally {
          await close()
        }
      }),
    )
  },
}
