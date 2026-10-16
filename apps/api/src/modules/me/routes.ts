/** The signed-in person: profile, language, notifications, phone change, account deletion, favourites (client spec §4.8). */
import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi'
import { meSchema, sendCodeResponseSchema, sendCodeSchema, updateMeSchema, verifyCodeSchema } from '@yeral/contract/account'
import { businessCardSchema } from '@yeral/contract/catalog'
import { langQuerySchema, listOf, slugSchema } from '@yeral/contract/common'
import { epochOf, today } from '@yeral/domain/time'
import { and, desc, eq, inArray } from 'drizzle-orm'
import { bookings, businesses, favorites, sessions, users } from '../../db/schema'
import type { AppEnv } from '../../http/env'
import { ApiError } from '../../http/errors'
import { errors, json, jsonBody, noContent } from '../../http/openapi'
import { clientIp } from '../../lib/rate-limit'
import { emit } from '../../notify'
import { checkCode, sendCode } from '../auth/codes'
import { endSession, requireUser } from '../auth/session'
import { setStatus } from '../bookings/repo'
import { buildCards } from '../catalog/cards'
import { publicBusiness } from '../catalog/detail'
import { toMe } from './me'

const tags = ['me']
const slugParam = z.object({ slug: slugSchema })

const meRoute = createRoute({
  method: 'get',
  path: '/me',
  tags,
  summary: 'Who is signed in',
  responses: { 200: json(meSchema), 401: errors[401] },
})
const updateRoute = createRoute({
  method: 'patch',
  path: '/me',
  tags,
  summary: 'Name, language, SMS notifications',
  request: jsonBody(updateMeSchema),
  responses: { 200: json(meSchema), 400: errors[400], 401: errors[401] },
})
const deleteRoute = createRoute({
  method: 'delete',
  path: '/me',
  tags,
  summary: 'Delete my account (upcoming bookings are cancelled; history stays anonymous with the businesses)',
  responses: { ...noContent, 401: errors[401] },
})
const phoneCodeRoute = createRoute({
  method: 'post',
  path: '/me/phone/code',
  tags,
  summary: 'Send a code to a new phone number',
  request: jsonBody(sendCodeSchema),
  responses: { 200: json(sendCodeResponseSchema), 400: errors[400], 401: errors[401], 409: errors[409], 429: errors[429] },
})
const phoneVerifyRoute = createRoute({
  method: 'post',
  path: '/me/phone/verify',
  tags,
  summary: 'Confirm the new phone number',
  request: jsonBody(verifyCodeSchema),
  responses: { 200: json(meSchema), 400: errors[400], 401: errors[401], 409: errors[409], 429: errors[429] },
})
const favoritesRoute = createRoute({
  method: 'get',
  path: '/me/favorites',
  tags,
  summary: 'My favourite places',
  request: { query: langQuerySchema },
  responses: { 200: json(listOf(businessCardSchema)), 401: errors[401] },
})
const addFavoriteRoute = createRoute({
  method: 'put',
  path: '/me/favorites/{slug}',
  tags,
  summary: 'Add to favourites',
  request: { params: slugParam },
  responses: { ...noContent, 401: errors[401], 404: errors[404] },
})
const removeFavoriteRoute = createRoute({
  method: 'delete',
  path: '/me/favorites/{slug}',
  tags,
  summary: 'Remove from favourites',
  request: { params: slugParam },
  responses: { ...noContent, 401: errors[401], 404: errors[404] },
})

export const meRoutes = new OpenAPIHono<AppEnv>()
  .openapi(meRoute, async (c) => c.json(await toMe(c.var.deps.db, requireUser(c)), 200))
  .openapi(updateRoute, async (c) => {
    const user = requireUser(c)
    const { name, lang, notifications: n } = c.req.valid('json')
    const [row] = await c.var.deps.db
      .update(users)
      .set({
        ...(name !== undefined ? { name } : {}),
        ...(lang !== undefined ? { lang } : {}),
        ...(n?.confirmation !== undefined ? { notifyConfirmation: n.confirmation } : {}),
        ...(n?.reminderDay !== undefined ? { notifyReminderDay: n.reminderDay } : {}),
        ...(n?.reminder2h !== undefined ? { notifyReminder2h: n.reminder2h } : {}),
        ...(n?.reviewAsk !== undefined ? { notifyReviewAsk: n.reviewAsk } : {}),
      })
      .where(eq(users.id, user.id))
      .returning()
    return c.json(await toMe(c.var.deps.db, row ?? user), 200)
  })
  .openapi(deleteRoute, async (c) => {
    const user = requireUser(c)
    const { deps } = c.var
    const now = deps.now()
    await deps.db.transaction(async (tx) => {
      const mine = await tx
        .select()
        .from(bookings)
        .where(and(eq(bookings.userId, user.id), eq(bookings.active, true)))
      for (const b of mine.filter((x) => epochOf(x.date, x.start) > now)) {
        const row = await setStatus(tx, b, { status: 'cancelled', cancelledBy: 'client', at: new Date(now) })
        await emit(tx, { type: 'booking.cancelled', businessId: row.businessId, bookingId: row.id, bookingCode: row.code })
      }
      await tx.delete(users).where(eq(users.id, user.id))
    })
    await endSession(c)
    return c.body(null, 204)
  })
  .openapi(phoneCodeRoute, async (c) => {
    const user = requireUser(c)
    const { phone } = c.req.valid('json')
    const [taken] = await c.var.deps.db.select({ id: users.id }).from(users).where(eq(users.phone, phone))
    if (taken) throw new ApiError('phone_taken')
    return c.json(
      await sendCode(c.var.deps, {
        phone,
        purpose: 'change_phone',
        ip: clientIp((n) => c.req.header(n), c.var.deps.trustedIpHeader),
        lang: user.lang,
        userId: user.id,
      }),
      200,
    )
  })
  .openapi(phoneVerifyRoute, async (c) => {
    const user = requireUser(c)
    const { phone, code } = c.req.valid('json')
    const { userId } = await checkCode(c.var.deps, { phone, purpose: 'change_phone', code })
    if (userId !== user.id) throw new ApiError('code_expired')
    const [taken] = await c.var.deps.db.select({ id: users.id }).from(users).where(eq(users.phone, phone))
    if (taken) throw new ApiError('phone_taken')
    const [row] = await c.var.deps.db.update(users).set({ phone }).where(eq(users.id, user.id)).returning()
    // other devices sign in again with the new number
    const current = c.var.auth?.sessionId
    const others = (await c.var.deps.db.select({ id: sessions.id }).from(sessions).where(eq(sessions.userId, user.id))).filter(
      (s) => s.id !== current,
    )
    if (others.length)
      await c.var.deps.db.delete(sessions).where(
        inArray(
          sessions.id,
          others.map((s) => s.id),
        ),
      )
    return c.json(await toMe(c.var.deps.db, row ?? user), 200)
  })
  .openapi(favoritesRoute, async (c) => {
    const user = requireUser(c)
    const { lang } = c.req.valid('query')
    const rows = await c.var.deps.db
      .select({ id: businesses.id })
      .from(favorites)
      .innerJoin(businesses, eq(businesses.id, favorites.businessId))
      .where(and(eq(favorites.userId, user.id), eq(businesses.verification, 'verified')))
      .orderBy(desc(favorites.createdAt))
    const cards = await buildCards(
      c.var.deps,
      rows.map((r) => r.id),
      { lang, date: today(c.var.deps.now()), days: 1, partySize: 2, position: null },
    )
    return c.json({ items: cards.map((x) => x.card) }, 200)
  })
  .openapi(addFavoriteRoute, async (c) => {
    const user = requireUser(c)
    const b = await publicBusiness(c.var.deps, c.req.valid('param').slug)
    await c.var.deps.db.insert(favorites).values({ userId: user.id, businessId: b.id }).onConflictDoNothing()
    return c.body(null, 204)
  })
  .openapi(removeFavoriteRoute, async (c) => {
    const user = requireUser(c)
    const b = await publicBusiness(c.var.deps, c.req.valid('param').slug)
    await c.var.deps.db.delete(favorites).where(and(eq(favorites.userId, user.id), eq(favorites.businessId, b.id)))
    return c.body(null, 204)
  })
