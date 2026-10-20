/**
 * The SMS link page (book Q-168, Q-169, Q-170, F-068): one booking read with its link's token, signed out, and a login
 * that sends the code only to the booking's own phone. Taking an offered time then goes through "my bookings" like any
 * other action.
 */
import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi'
import {
  isThisYouSchema,
  linkCodeSchema,
  linkVerifySchema,
  sendCodeResponseSchema,
  verifyCodeResponseSchema,
} from '@yeral/contract/account'
import { bookingLinkSchema, linkTokenSchema, type BookingLink } from '@yeral/contract/bookings'
import { langQuerySchema } from '@yeral/contract/common'
import { MARKET } from '@yeral/domain/market'
import { maskPhone } from '@yeral/domain/phone'
import { eq } from 'drizzle-orm'
import { users } from '../../db/schema'
import type { AppEnv } from '../../http/env'
import { errors, json, jsonBody } from '../../http/openapi'
import { clientIp } from '../../lib/rate-limit'
import { checkCode, sendCode } from '../auth/codes'
import { afterCode } from '../auth/identity'
import { bookingOfLink } from './links'
import { detailOf } from './view'

const tags = ['bookings']
const tokenParam = z.object({ token: linkTokenSchema })

const viewRoute = createRoute({
  method: 'get',
  path: '/links/{token}',
  tags,
  summary: 'The booking an SMS link opens, signed out',
  request: { params: tokenParam, query: langQuerySchema },
  responses: { 200: json(bookingLinkSchema), 404: errors[404] },
})

const codeRoute = createRoute({
  method: 'post',
  path: '/links/{token}/code',
  tags,
  summary: "Send a login code to the booking's own phone",
  request: { params: tokenParam, ...jsonBody(linkCodeSchema) },
  responses: { 200: json(sendCodeResponseSchema), 400: errors[400], 404: errors[404], 429: errors[429] },
})

const verifyRoute = createRoute({
  method: 'post',
  path: '/links/{token}/verify',
  tags,
  summary: "Check the code and sign in with the booking's own phone",
  request: { params: tokenParam, ...jsonBody(linkVerifySchema) },
  responses: { 200: json(verifyCodeResponseSchema), 202: json(isThisYouSchema), 400: errors[400], 404: errors[404], 429: errors[429] },
})

export const linkRoutes = new OpenAPIHono<AppEnv>()
  .openapi(viewRoute, async (c) => {
    const { deps } = c.var
    const row = await bookingOfLink(deps.db, c.req.valid('param').token, deps.now())
    const d = await detailOf(deps, row, c.req.valid('query').lang)
    const full: Record<string, unknown> = {
      ...d,
      maskedPhone: maskPhone(row.phone),
      // signed in as someone else (a shared phone): the signed-out page, with the masked-phone login (book Q-169)
      owner: !!row.userId && c.var.auth?.user.id === row.userId,
      canReview: d.actions.review,
    }
    // the contract's fields decide what a signed-out visitor sees: whatever else the detail has (the note, the actions)
    // goes
    const page = Object.fromEntries(Object.keys(bookingLinkSchema.shape).map((k) => [k, full[k]])) as BookingLink
    return c.json(page, 200)
  })
  .openapi(codeRoute, async (c) => {
    const { deps } = c.var
    const row = await bookingOfLink(deps.db, c.req.valid('param').token, deps.now())
    const { phone } = row
    // the language the person chose, as the plain login sends it
    const [known] = await deps.db.select({ lang: users.lang }).from(users).where(eq(users.phone, phone))
    const res = await sendCode(deps, {
      phone,
      purpose: 'login',
      ip: clientIp((n) => c.req.header(n), deps.trustedIpHeader),
      lang: known?.lang ?? c.req.valid('json').lang ?? MARKET.defaultLanguage,
    })
    return c.json(res, 200)
  })
  .openapi(verifyRoute, async (c) => {
    const { deps } = c.var
    const row = await bookingOfLink(deps.db, c.req.valid('param').token, deps.now())
    const { code, lang } = c.req.valid('json')
    const { phone } = row
    await checkCode(deps, { phone, purpose: 'login', code })
    const res = await afterCode(c, phone, lang)
    return res.status === 202 ? c.json(res.body, 202) : c.json(res.body, 200)
  })
