/** Node entry (Docker, own server, local dev): one pool, one app, a jobs tick. */
import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { createApp } from '../app'
import { loadConfig } from '../config'
import { createDb, createPool } from '../db/client'
import { createDeps } from '../deps'
import { findUp } from '../lib/find-up'
import { jobsTick } from '../modules/jobs/tick'

const config = loadConfig(process.env)
const pool = createPool(config.databaseUrl)
const deps = createDeps(config, createDb(pool))
const { log } = deps

const app = createApp(async (c, next) => {
  c.set('deps', deps)
  await next()
})

if (config.site.demo || config.exampleBusinesses) {
  // demo photos from the design export (free Unsplash licence, docs/design/assets/photos/CREDITS.md), found from
  // src/entry/ (dev) and dist/ (`start`) alike; the api image carries them at /app/demo-photos (DEMO_MEDIA_DIR), for
  // the first launch's example businesses (book Q-004)
  const root = process.env.DEMO_MEDIA_DIR ?? findUp(new URL(import.meta.url), 'docs/design/assets/photos')
  if (root) app.use('/media/demo/*', serveStatic({ root, rewriteRequestPath: (p) => p.replace(/^\/media\/demo/, '') }))
  else log.warn('demo photos not found: set DEMO_MEDIA_DIR')
}

const server = serve({ fetch: app.fetch, port: config.port }, (info) => log.info('listening', { port: info.port, env: config.site.env }))

// the jobs tick (ADR 0005): expiries, completions, SMS, reminders; one run at a time in this process, and across
// processes through the tick's database lock
let running = false
const tick = () => {
  if (running) return
  running = true
  void jobsTick(deps).finally(() => (running = false))
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
