/** Node entry (Docker, own server, local dev): one pool, one app, a jobs tick. */
import { fileURLToPath } from 'node:url'
import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { createApp } from '../app'
import { loadConfig } from '../config'
import { createDb, createPool } from '../db/client'
import { createDeps } from '../deps'
import { jobsTick } from '../modules/jobs/tick'

const config = loadConfig(process.env)
const pool = createPool(config.databaseUrl)
const deps = createDeps(config, createDb(pool))
const { log } = deps

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
