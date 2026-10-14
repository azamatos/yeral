import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi'
import { sql } from 'drizzle-orm'
import type { AppEnv } from '../../http/env'
import { build } from '../../version'

const healthSchema = z.object({ ok: z.boolean(), db: z.boolean(), version: z.string() }).meta({ id: 'Health' })

const health = createRoute({
  method: 'get',
  path: '/health',
  tags: ['system'],
  summary: 'Liveness and database reachability',
  responses: {
    200: { content: { 'application/json': { schema: healthSchema } }, description: 'Up' },
    503: { content: { 'application/json': { schema: healthSchema } }, description: 'Database unreachable' },
  },
})

export const healthRoutes = new OpenAPIHono<AppEnv>().openapi(health, async (c) => {
  try {
    await c.var.deps.db.execute(sql`select 1`)
    return c.json({ ok: true, db: true, version: build.version }, 200)
  } catch (e) {
    c.var.deps.log.error('health: database unreachable', { error: String(e) })
    return c.json({ ok: false, db: false, version: build.version }, 503)
  }
})
