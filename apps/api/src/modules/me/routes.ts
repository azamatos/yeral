/** The signed-in person: profile, language, notifications, phone change, account deletion, favourites (client spec §4.8). */
import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi'
import { meSchema, sendCodeResponseSchema, sendCodeSchema, updateMeSchema, verifyCodeSchema } from '@yeral/contract/account'
import { businessCardSchema } from '@yeral/contract/catalog'
import { langQuerySchema, listOf, slugSchema } from '@yeral/contract/common'
import { NAME_MAX, splitName } from '@yeral/domain/names'
import { today } from '@yeral/domain/time'
import { and, desc, eq, inArray } from 'drizzle-orm'
import { businesses, favorites, sessions, users } from '../../db/schema'
import type { AppEnv } from '../../http/env'
import { ApiError, invalid } from '../../http/errors'
import { errors, json, jsonBody, noContent } from '../../http/openapi'
import { clientIp } from '../../lib/rate-limit'
import { checkCode, sendCode } from '../auth/codes'
import { endSession, requireUser } from '../auth/session'
import { buildCards } from '../catalog/cards'
import { publicBusiness } from '../catalog/detail'
import { changePhone, releaseAccount } from './account'
import { accountName, phoneChangeOpen, toMe } from './me'

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
  summary: 'Delete my account (upcoming bookings are cancelled, reviews deleted; visit history stays anonymous with the businesses)',
  description: 'Refused with `owns_workspace` while the person owns a workspace: the Ýeral team closes it first (book Q-213).',
  responses: { ...noContent, 401: errors[401], 409: errors[409] },
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
  .openapi(meRoute, async (c) => c.json(await toMe(c.var.deps.db, requireUser(c), c.var.deps), 200))
  .openapi(updateRoute, async (c) => {
    const user = requireUser(c)
    const { name, firstName, surname, lang, notifications: n } = c.req.valid('json')
    // an older client's one field, split at the first space (book Q-156); sent back as it was read, it changes nothing,
    // so a first name of two words stays one
    const parts = name !== undefined && name !== accountName(user) ? splitName(name) : undefined
    if (parts && ((parts.first?.length ?? 0) > NAME_MAX || (parts.surname?.length ?? 0) > NAME_MAX))
      throw invalid({ path: ['name'], code: 'too_big' })
    const next = {
      first: parts ? parts.first : firstName !== undefined ? firstName : user.name,
      surname: parts ? parts.surname : surname !== undefined ? surname || null : user.surname,
    }
    // a surname alone isn't a name
    if (next.surname && !next.first) throw invalid({ path: ['firstName'], code: 'required' })
    const set = {
      ...(parts || firstName !== undefined ? { name: next.first } : {}),
      ...(parts || surname !== undefined ? { surname: next.surname } : {}),
      ...(lang !== undefined ? { lang } : {}),
      ...(n?.confirmation !== undefined ? { notifyConfirmation: n.confirmation } : {}),
      ...(n?.reminderDay !== undefined ? { notifyReminderDay: n.reminderDay } : {}),
      ...(n?.reminder2h !== undefined ? { notifyReminder2h: n.reminder2h } : {}),
    }
    // nothing to change (only the deprecated review-ask switch, say): the profile as it is
    if (!Object.keys(set).length) return c.json(await toMe(c.var.deps.db, user, c.var.deps), 200)
    const [row] = await c.var.deps.db.update(users).set(set).where(eq(users.id, user.id)).returning()
    return c.json(await toMe(c.var.deps.db, row ?? user, c.var.deps), 200)
  })
  .openapi(deleteRoute, async (c) => {
    const user = requireUser(c)
    const { deps } = c.var
    const now = deps.now()
    await deps.db.transaction((tx) => releaseAccount(tx, user, now, 'deleted'))
    await endSession(c)
    return c.body(null, 204)
  })
  .openapi(phoneCodeRoute, async (c) => {
    const user = requireUser(c)
    // with the code on the screen the number wouldn't be shown to be theirs, and a change merges the businesses'
    // records of it into the account (book Q-036)
    if (!phoneChangeOpen(c.var.deps)) throw new ApiError('phone_change_unavailable')
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
    if (!phoneChangeOpen(c.var.deps)) throw new ApiError('phone_change_unavailable')
    const { phone, code } = c.req.valid('json')
    const { userId } = await checkCode(c.var.deps, { phone, purpose: 'change_phone', code })
    if (userId !== user.id) throw new ApiError('code_expired')
    const [taken] = await c.var.deps.db.select({ id: users.id }).from(users).where(eq(users.phone, phone))
    if (taken) throw new ApiError('phone_taken')
    const now = c.var.deps.now()
    const row = await c.var.deps.db.transaction((tx) => changePhone(tx, user, phone, now))
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
    return c.json(await toMe(c.var.deps.db, row, c.var.deps), 200)
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
