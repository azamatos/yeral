/** "Try the business app" (book F-242): the demo workspace's owner session, without a number of one's own. */
import { createRoute, OpenAPIHono } from '@hono/zod-openapi'
import { demoSessionSchema } from '@yeral/contract/demo'
import { and, eq } from 'drizzle-orm'
import { businesses, sessions, staff, users } from '../../db/schema'
import { SANDBOX_SLUG } from '../../db/seed'
import type { AppEnv } from '../../http/env'
import { ApiError } from '../../http/errors'
import { errors, json } from '../../http/openapi'
import { clientIp, hit, rateLimited } from '../../lib/rate-limit'
import { DEMO_SESSION_DAYS, startSession } from '../auth/session'
import { toMe } from '../me/me'
import { signsIn } from '../team/members'

/** Demo sessions an internet address may start in an hour: a person tries it a few times, a script many. */
export const DEMO_SESSIONS_PER_HOUR = 30

const sessionRoute = createRoute({
  method: 'post',
  path: '/demo/session',
  tags: ['demo'],
  summary: '"Try the business app" (book F-242): a day in the demo workspace as its owner; whoever was signed in is signed out',
  responses: { 200: json(demoSessionSchema), 404: errors[404], 429: errors[429] },
})

export const demoRoutes = new OpenAPIHono<AppEnv>().openapi(sessionRoute, async (c) => {
  const { deps } = c.var
  const ip = clientIp((n) => c.req.header(n), deps.trustedIpHeader)
  const r = await hit(deps.db, `demo:ip:${ip}`, DEMO_SESSIONS_PER_HOUR, 3600, deps.now())
  if (!r.ok) throw rateLimited(r.retryAfterSec)
  const [owner] = deps.demoWorkspace
    ? await deps.db
        .select({ user: users })
        .from(staff)
        .innerJoin(businesses, eq(businesses.id, staff.businessId))
        .innerJoin(users, eq(users.id, staff.userId))
        .where(and(eq(businesses.sandbox, true), eq(staff.level, 'owner'), signsIn))
    : []
  if (!owner) throw new ApiError('not_found')
  // whoever was signed in is signed out: their session ends, and the demo's cookie takes its place
  if (c.var.auth) await deps.db.delete(sessions).where(eq(sessions.id, c.var.auth.sessionId))
  await startSession(c, deps.db, owner.user.id, DEMO_SESSION_DAYS)
  return c.json({ me: await toMe(deps.db, owner.user, deps), slug: SANDBOX_SLUG }, 200)
})
