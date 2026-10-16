/** Node entry (Docker, own server, local dev): one pool, one app, a jobs tick. */
import { fileURLToPath } from 'node:url'
import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { createApp } from '../app'
import { loadConfig } from '../config'
import { createDb, createPool } from '../db/client'
import type { Deps } from '../deps'
import { runDueJobs } from '../modules/jobs/run'
import { createLogger } from '../ports/log'
import { logSms } from '../ports/sms'

const config = loadConfig(process.env)
const log = createLogger(config.logLevel, { app: 'api' })
const pool = createPool(config.databaseUrl)
const deps: Deps = {
  db: createDb(pool),
  site: config.site,
  now: Date.now,
  sms: logSms(log),
  media: (key) => `${config.mediaBaseUrl}/${key}`,
  log,
  trustedIpHeader: config.trustedIpHeader,
}

const app = createApp(async (c, next) => {
  c.set('deps', deps)
  await next()
})

if (config.site.demo) {
  // demo photos from the design export (free Unsplash licence, docs/design/assets/photos/CREDITS.md)
  const root = process.env.DEMO_MEDIA_DIR ?? fileURLToPath(new URL('../../../../docs/design/assets/photos', import.meta.url))
  app.use('/media/demo/*', serveStatic({ root, rewriteRequestPath: (p) => p.replace(/^\/media\/demo/, '') }))
}

const server = serve({ fetch: app.fetch, port: config.port }, (info) => log.info('listening', { port: info.port, env: config.site.env }))

// the jobs tick (ADR 0005): expiries, completions, SMS, reminders; one run at a time
let running = false
const tick = () => {
  if (running) return
  running = true
  runDueJobs(deps)
    .then((r) => (r.expired || r.completed || r.jobs ? log.info('jobs', r) : undefined))
    .catch((e: unknown) => log.error('jobs failed', { error: String(e) }))
    .finally(() => (running = false))
}
const timer = setInterval(tick, 60_000)
tick()

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    clearInterval(timer)
    server.close()
    void pool.end().then(() => process.exit(0))
  })
}
