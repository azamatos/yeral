/**
 * Sessions (ADR 0019): a random token in an httpOnly cookie on the parent domain (or a bearer header for mobile apps);
 * only its SHA-256 is stored. 60 days, renewed when under 30 are left.
 */
import { and, eq, gt } from 'drizzle-orm'
import type { Context, MiddlewareHandler } from 'hono'
import { deleteCookie, getCookie, setCookie } from 'hono/cookie'
import type { Queryable } from '../../db/client'
import { sessions, users } from '../../db/schema'
import { ApiError } from '../../http/errors'
import type { AppEnv, User } from '../../http/env'
import { randomToken, sha256Hex } from '../../lib/crypto'

export const DAY = 86_400_000
export const SESSION_DAYS = 60
const RENEW_UNDER_DAYS = 30

export const cookieName = (c: Context<AppEnv>) => `${c.var.deps.site.cookiePrefix}.session`

const cookieScope = (c: Context<AppEnv>) => {
  const { site } = c.var.deps
  return { path: '/', ...(site.cookieDomain ? { domain: site.cookieDomain } : {}) }
}

function writeCookie(c: Context<AppEnv>, name: string, token: string, expiresAt: Date) {
  setCookie(c, name, token, {
    httpOnly: true,
    // https sites only: local dev and the docker stack run on plain http
    secure: c.var.deps.site.urls.api.startsWith('https:'),
    sameSite: 'Lax',
    ...cookieScope(c),
    expires: expiresAt,
  })
}

export async function startSession(c: Context<AppEnv>, db: Queryable, userId: string): Promise<void> {
  const token = randomToken()
  const expiresAt = new Date(c.var.deps.now() + SESSION_DAYS * DAY)
  await db
    .insert(sessions)
    .values({ userId, tokenHash: await sha256Hex(token), expiresAt, userAgent: c.req.header('user-agent')?.slice(0, 200) ?? null })
  writeCookie(c, cookieName(c), token, expiresAt)
}

/** The session the request came with ends, and its cookie goes. */
export async function endSession(c: Context<AppEnv>): Promise<void> {
  const auth = c.var.auth
  if (auth) await c.var.deps.db.delete(sessions).where(eq(sessions.id, auth.sessionId))
  deleteCookie(c, auth?.cookie ?? cookieName(c), cookieScope(c))
}

/** The token the request carries: a bearer header, else the session cookie. */
function tokenOf(c: Context<AppEnv>): { token: string; cookie: string | null } | null {
  const bearer = c.req.header('authorization')
  if (bearer?.startsWith('Bearer ')) return { token: bearer.slice(7).trim(), cookie: null }
  const cookie = cookieName(c)
  const token = getCookie(c, cookie)
  return token ? { token, cookie } : null
}

export const sessionMiddleware: MiddlewareHandler<AppEnv> = async (c, next) => {
  c.set('auth', null)
  const { db, now } = c.var.deps
  const carried = tokenOf(c)
  if (carried) {
    const { token, cookie } = carried
    const [row] = await db
      .select({ session: sessions, user: users })
      .from(sessions)
      .innerJoin(users, eq(users.id, sessions.userId))
      .where(and(eq(sessions.tokenHash, await sha256Hex(token)), gt(sessions.expiresAt, new Date(now()))))
    if (row) {
      c.set('auth', { user: row.user, sessionId: row.session.id, cookie })
      if (row.session.expiresAt.getTime() - now() < RENEW_UNDER_DAYS * DAY) {
        const expiresAt = new Date(now() + SESSION_DAYS * DAY)
        await db
          .update(sessions)
          .set({ expiresAt, lastSeenAt: new Date(now()) })
          .where(eq(sessions.id, row.session.id))
        if (cookie) writeCookie(c, cookie, token, expiresAt)
      }
      // the account is in use, noted once a day (book Q-270: "Is this you?" asks only after 6 months without)
      if (now() - row.user.lastSeenAt.getTime() > DAY)
        await db
          .update(users)
          .set({ lastSeenAt: new Date(now()) })
          .where(eq(users.id, row.user.id))
    }
  }
  await next()
}

/** The signed-in person, or 401. */
export function requireUser(c: Context<AppEnv>): User {
  const auth = c.var.auth
  if (!auth) throw new ApiError('unauthorized')
  return auth.user
}
