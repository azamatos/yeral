/** Phone login (ADR 0019): send a code, verify it, log out. */
import { createRoute, OpenAPIHono } from '@hono/zod-openapi'
import {
  identityAnswerSchema,
  isThisYouSchema,
  sendCodeResponseSchema,
  sendCodeSchema,
  verifyCodeResponseSchema,
  verifyCodeSchema,
} from '@yeral/contract/account'
import { MARKET } from '@yeral/domain/market'
import { eq } from 'drizzle-orm'
import { users } from '../../db/schema'
import type { AppEnv } from '../../http/env'
import { errors, json, jsonBody, noContent } from '../../http/openapi'
import { clientIp } from '../../lib/rate-limit'
import { checkCode, sendCode } from './codes'
import { endSession } from './session'
import { afterCode, answerIdentity } from './identity'

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
  responses: { 200: json(verifyCodeResponseSchema), 202: json(isThisYouSchema), 400: errors[400], 429: errors[429] },
})

const identityRoute = createRoute({
  method: 'post',
  path: '/auth/identity',
  tags: ['auth'],
  summary: '"Is this you?": yes signs in to the account; no starts a fresh one for this phone',
  request: jsonBody(identityAnswerSchema),
  responses: { 200: json(verifyCodeResponseSchema), 400: errors[400], 409: errors[409] },
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
      onScreen: true,
    })
    return c.json(res, 200)
  })
  .openapi(verifyRoute, async (c) => {
    const { phone, code, lang } = c.req.valid('json')
    await checkCode(c.var.deps, { phone, purpose: 'login', code })
    const res = await afterCode(c, phone, lang)
    return res.status === 202 ? c.json(res.body, 202) : c.json(res.body, 200)
  })
  .openapi(identityRoute, async (c) => {
    const { ticket, yes, lang } = c.req.valid('json')
    return c.json(await answerIdentity(c, ticket, yes, lang), 200)
  })
  .openapi(logoutRoute, async (c) => {
    await endSession(c)
    return c.body(null, 204)
  })
