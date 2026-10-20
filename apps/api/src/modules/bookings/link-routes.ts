/**
 * The SMS link page (book Q-168, Q-169, Q-170, F-068): one booking read with its link's token, signed out, and a login
 * that sends the code only to the booking's own phone. Taking an offered time then goes through "my bookings" like any
 * other action.
 */
import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi'
import { linkCodeSchema, linkVerifySchema, sendCodeResponseSchema, verifyCodeResponseSchema } from '@yeral/contract/account'
import { bookingLinkSchema, linkTokenSchema } from '@yeral/contract/bookings'
import { langQuerySchema } from '@yeral/contract/common'
import { MARKET } from '@yeral/domain/market'
import { maskPhone } from '@yeral/domain/phone'
import type { AppEnv } from '../../http/env'
import { errors, json, jsonBody } from '../../http/openapi'
import { clientIp } from '../../lib/rate-limit'
import { checkCode, sendCode } from '../auth/codes'
import { signIn } from '../auth/sign-in'
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
  responses: { 200: json(verifyCodeResponseSchema), 400: errors[400], 404: errors[404], 429: errors[429] },
})

export const linkRoutes = new OpenAPIHono<AppEnv>()
  .openapi(viewRoute, async (c) => {
    const { deps } = c.var
    const row = await bookingOfLink(deps.db, c.req.valid('param').token, deps.now())
    const d = await detailOf(deps, row, c.req.valid('query').lang)
    return c.json(
      {
        code: d.code,
        business: d.business,
        what: d.what,
        date: d.date,
        start: d.start,
        end: d.end,
        status: d.status,
        cancelledBy: d.cancelledBy,
        price: d.price,
        address: d.address,
        city: d.city,
        entranceNote: d.entranceNote,
        geo: d.geo,
        holdUntil: d.holdUntil,
        cancelReason: d.cancelReason,
        decline: d.decline,
        expiredAlternatives: d.expiredAlternatives,
        offerTakenBy: d.offerTakenBy,
        moveRefused: d.moveRefused,
        reschedule: d.reschedule,
        bookOnline: d.bookOnline,
        maskedPhone: maskPhone(row.clientPhone ?? ''),
        // signed in as someone else (a shared phone): the signed-out page, with the masked-phone login (book Q-169)
        owner: !!row.userId && c.var.auth?.user.id === row.userId,
      },
      200,
    )
  })
  .openapi(codeRoute, async (c) => {
    const { deps } = c.var
    const row = await bookingOfLink(deps.db, c.req.valid('param').token, deps.now())
    const res = await sendCode(deps, {
      phone: row.clientPhone ?? '',
      purpose: 'login',
      ip: clientIp((n) => c.req.header(n), deps.trustedIpHeader),
      lang: c.req.valid('json').lang ?? MARKET.defaultLanguage,
    })
    return c.json(res, 200)
  })
  .openapi(verifyRoute, async (c) => {
    const { deps } = c.var
    const row = await bookingOfLink(deps.db, c.req.valid('param').token, deps.now())
    const { code, lang } = c.req.valid('json')
    const phone = row.clientPhone ?? ''
    await checkCode(deps, { phone, purpose: 'login', code })
    return c.json(await signIn(c, phone, lang), 200)
  })
