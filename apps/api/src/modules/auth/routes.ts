/** Phone login (ADR 0019): send a code, verify it, log out. */
import { createRoute, OpenAPIHono } from '@hono/zod-openapi'
import { sendCodeResponseSchema, sendCodeSchema, verifyCodeResponseSchema, verifyCodeSchema } from '@yeral/contract/account'
import { MARKET } from '@yeral/domain/market'
import { and, eq, isNull } from 'drizzle-orm'
import { bookings, clients, memberships, staff, users } from '../../db/schema'
import type { AppEnv } from '../../http/env'
import { errors, json, jsonBody, noContent } from '../../http/openapi'
import { clientIp } from '../../lib/rate-limit'
import { toMe } from '../me/me'
import { checkCode, sendCode } from './codes'
import { endSession, startSession } from './session'

const sendCodeRoute = createRoute({
  method: 'post',
  path: '/auth/code',
  tags: ['auth'],
  summary: 'Send a login code by SMS',
  request: jsonBody(sendCodeSchema),
  responses: { 200: json(sendCodeResponseSchema), 400: errors[400], 429: errors[429] },
})

const verifyRoute = createRoute({
  method: 'post',
  path: '/auth/verify',
  tags: ['auth'],
  summary: 'Check the code and sign in (creates the account on first login)',
  request: jsonBody(verifyCodeSchema),
  responses: { 200: json(verifyCodeResponseSchema), 400: errors[400], 429: errors[429] },
})

const logoutRoute = createRoute({ method: 'post', path: '/auth/logout', tags: ['auth'], summary: 'Sign out', responses: noContent })

export const authRoutes = new OpenAPIHono<AppEnv>()
  .openapi(sendCodeRoute, async (c) => {
    const { phone, lang } = c.req.valid('json')
    const [known] = await c.var.deps.db.select({ lang: users.lang }).from(users).where(eq(users.phone, phone))
    const res = await sendCode(c.var.deps, {
      phone,
      purpose: 'login',
      ip: clientIp((n) => c.req.header(n), c.var.deps.trustedIpHeader),
      lang: known?.lang ?? lang ?? MARKET.defaultLanguage,
    })
    return c.json(res, 200)
  })
  .openapi(verifyRoute, async (c) => {
    const { phone, code, lang } = c.req.valid('json')
    const { deps } = c.var
    await checkCode(deps, { phone, purpose: 'login', code })
    const result = await deps.db.transaction(async (tx) => {
      let [user] = await tx.select().from(users).where(eq(users.phone, phone))
      const isNew = !user?.name
      if (!user)
        [user] = await tx
          .insert(users)
          .values({ phone, lang: lang ?? MARKET.defaultLanguage })
          .returning()
      if (!user) throw new Error('user insert failed')
      // the same phone may already be known: an invitation to a team, a business's client list, phone bookings
      const invited = await tx
        .update(memberships)
        .set({ userId: user.id, status: 'active' })
        .where(and(eq(memberships.phone, phone), isNull(memberships.userId), eq(memberships.status, 'invited')))
        .returning({ staffId: memberships.staffId })
      for (const m of invited)
        if (m.staffId)
          await tx
            .update(staff)
            .set({ status: 'active' })
            .where(and(eq(staff.id, m.staffId), eq(staff.status, 'invited')))
      await tx
        .update(clients)
        .set({ userId: user.id })
        .where(and(eq(clients.phone, phone), isNull(clients.userId)))
      await tx
        .update(bookings)
        .set({ userId: user.id })
        .where(and(eq(bookings.clientPhone, phone), isNull(bookings.userId)))
      await startSession(c, tx, user.id)
      return { me: await toMe(tx, user), isNew }
    })
    return c.json(result, 200)
  })
  .openapi(logoutRoute, async (c) => {
    await endSession(c)
    return c.body(null, 204)
  })
