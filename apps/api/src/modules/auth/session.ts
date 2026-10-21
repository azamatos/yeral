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

function writeCookie(c: Context<AppEnv>, token: string, expiresAt: Date) {
  const { site } = c.var.deps
  setCookie(c, cookieName(c), token, {
    httpOnly: true,
    // https sites only: local dev and the docker stack run on plain http
    secure: site.urls.api.startsWith('https:'),
    sameSite: 'Lax',
    path: '/',
    ...(site.cookieDomain ? { domain: site.cookieDomain } : {}),
    expires: expiresAt,
  })
}

/** "Try the business app"'s session (book F-242): one day, never renewed. */
export const DEMO_SESSION_DAYS = 1

/** `days`: how long it lasts before it's renewed; a demo account's isn't renewed (`sessionMiddleware`). */
export async function startSession(c: Context<AppEnv>, db: Queryable, userId: string, days = SESSION_DAYS): Promise<void> {
  const token = randomToken()
  const expiresAt = new Date(c.var.deps.now() + days * DAY)
  await db
    .insert(sessions)
    .values({ userId, tokenHash: await sha256Hex(token), expiresAt, userAgent: c.req.header('user-agent')?.slice(0, 200) ?? null })
  writeCookie(c, token, expiresAt)
}

export async function endSession(c: Context<AppEnv>): Promise<void> {
  const auth = c.var.auth
  if (auth) await c.var.deps.db.delete(sessions).where(eq(sessions.id, auth.sessionId))
  const { site } = c.var.deps
  deleteCookie(c, cookieName(c), { path: '/', ...(site.cookieDomain ? { domain: site.cookieDomain } : {}) })
}

function tokenOf(c: Context<AppEnv>): string | undefined {
  const bearer = c.req.header('authorization')
  if (bearer?.startsWith('Bearer ')) return bearer.slice(7).trim()
  return getCookie(c, cookieName(c))
}

export const sessionMiddleware: MiddlewareHandler<AppEnv> = async (c, next) => {
  c.set('auth', null)
  const token = tokenOf(c)
  if (token) {
    const { db, now } = c.var.deps
    const [row] = await db
      .select({ session: sessions, user: users })
      .from(sessions)
      .innerJoin(users, eq(users.id, sessions.userId))
      .where(and(eq(sessions.tokenHash, await sha256Hex(token)), gt(sessions.expiresAt, new Date(now()))))
    if (row) {
      c.set('auth', { user: row.user, sessionId: row.session.id })
      // a demo account's session isn't renewed: the visitor tries the demo for a day (book F-242)
      if (!row.user.demo && row.session.expiresAt.getTime() - now() < RENEW_UNDER_DAYS * DAY) {
        const expiresAt = new Date(now() + SESSION_DAYS * DAY)
        await db
          .update(sessions)
          .set({ expiresAt, lastSeenAt: new Date(now()) })
          .where(eq(sessions.id, row.session.id))
        writeCookie(c, token, expiresAt)
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
