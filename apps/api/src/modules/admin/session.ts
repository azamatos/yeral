/**
 * The Ýeral team's sessions (ADR 0026): a random token in an httpOnly cookie on the api's own host (not the parent
 * domain the client site and the business app share), `SameSite=Strict`, path `/v1/admin`, 12 hours and never renewed;
 * only its SHA-256 is kept. From a browser, admin requests come from the admin tool's site only.
 */
import { and, eq, gt } from 'drizzle-orm'
import type { Context, MiddlewareHandler } from 'hono'
import { deleteCookie, getCookie, setCookie } from 'hono/cookie'
import type { Queryable } from '../../db/client'
import { adminSessions, admins } from '../../db/schema'
import type { Admin, AppEnv } from '../../http/env'
import { ApiError, errorBody } from '../../http/errors'
import { randomToken, sha256Hex } from '../../lib/crypto'

export const ADMIN_SESSION_HOURS = 12
const PATH = '/v1/admin'

const cookieName = (c: Context<AppEnv>) => `${c.var.deps.site.cookiePrefix}.admin`

export async function startAdminSession(c: Context<AppEnv>, db: Queryable, adminId: string): Promise<void> {
  const token = randomToken()
  const expiresAt = new Date(c.var.deps.now() + ADMIN_SESSION_HOURS * 3_600_000)
  await db
    .insert(adminSessions)
    .values({ adminId, tokenHash: await sha256Hex(token), expiresAt, userAgent: c.req.header('user-agent')?.slice(0, 200) ?? null })
  setCookie(c, cookieName(c), token, {
    httpOnly: true,
    // https sites only: local dev and the docker stack run on plain http
    secure: c.var.deps.site.urls.api.startsWith('https:'),
    sameSite: 'Strict',
    path: PATH,
    expires: expiresAt,
  })
}

export async function endAdminSession(c: Context<AppEnv>): Promise<void> {
  const session = c.var.admin
  if (session) await c.var.deps.db.delete(adminSessions).where(eq(adminSessions.id, session.sessionId))
  deleteCookie(c, cookieName(c), { path: PATH })
}

export const adminSessionMiddleware: MiddlewareHandler<AppEnv> = async (c, next) => {
  // a page of the client site or the business app can't use an admin's cookie
  const origin = c.req.header('Origin')
  if (origin && origin !== c.var.deps.site.urls.cms) return c.json(errorBody('forbidden', undefined, 'origin'), 403)
  c.set('admin', null)
  const token = getCookie(c, cookieName(c))
  if (token) {
    const { db, now } = c.var.deps
    const [row] = await db
      .select({ session: adminSessions, admin: admins })
      .from(adminSessions)
      .innerJoin(admins, eq(admins.id, adminSessions.adminId))
      .where(
        and(eq(adminSessions.tokenHash, await sha256Hex(token)), gt(adminSessions.expiresAt, new Date(now())), eq(admins.status, 'active')),
      )
    if (row) c.set('admin', { admin: row.admin, sessionId: row.session.id })
  }
  await next()
}

/** The signed-in team member, or 401. */
export function requireAdmin(c: Context<AppEnv>): Admin {
  const session = c.var.admin
  if (!session) throw new ApiError('unauthorized')
  return session.admin
}
