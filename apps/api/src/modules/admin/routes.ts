/** The Ýeral team's sign-in and accounts (ADR 0026; book F-178): `/v1/admin/*`, for the admin tool's site only. */
import { createRoute, OpenAPIHono } from '@hono/zod-openapi'
import {
  adminIdParamSchema,
  adminInviteSchema,
  adminMemberSchema,
  adminMeSchema,
  adminNewRecoveryCodesSchema,
  adminPasswordChangeSchema,
  adminRecoveryCodesSchema,
  adminSetupConfirmSchema,
  adminSetupLinkSchema,
  adminSetupPasswordSchema,
  adminSetupSchema,
  adminSetupSecretSchema,
  adminSetupTokenParamSchema,
  adminSignInSchema,
} from '@yeral/contract/admin'
import { listOf } from '@yeral/contract/common'
import type { Context } from 'hono'
import type { AppEnv } from '../../http/env'
import { errors, json, jsonBody, noContent } from '../../http/openapi'
import { clientIp } from '../../lib/rate-limit'
import {
  adminMeOf,
  adminTeam,
  changeAdminPassword,
  chooseSetupPassword,
  confirmSetup,
  disableAdmin,
  guardAddress,
  inviteAdmin,
  renewRecoveryCodes,
  resetAdmin,
  setupOf,
  signIn,
} from './accounts'
import { endAdminSession, requireAdmin, startAdminSession } from './session'

const tags = ['admin']
const signedIn = { 401: errors[401], 403: errors[403], 503: errors[503] }
const ipOf = (c: Context<AppEnv>) => clientIp((n) => c.req.header(n), c.var.deps.trustedIpHeader)

const signInRoute = createRoute({
  method: 'post',
  path: '/admin/sign-in',
  tags,
  summary: 'Sign in with the login, the password and the authenticator code (or a recovery code); any wrong part is `sign_in_failed`',
  request: jsonBody(adminSignInSchema),
  responses: { 200: json(adminMeSchema), 400: errors[400], ...signedIn, 429: errors[429] },
})
const signOutRoute = createRoute({
  method: 'post',
  path: '/admin/sign-out',
  tags,
  summary: 'Sign out of the admin tool',
  responses: { ...noContent },
})
const meRoute = createRoute({
  method: 'get',
  path: '/admin/me',
  tags,
  summary: 'The signed-in team member',
  responses: { 200: json(adminMeSchema), ...signedIn },
})
const passwordRoute = createRoute({
  method: 'put',
  path: '/admin/me/password',
  tags,
  summary: 'A new password, for the current one; the account’s other sessions end',
  request: jsonBody(adminPasswordChangeSchema),
  responses: { ...noContent, 400: errors[400], ...signedIn },
})
const recoveryCodesRoute = createRoute({
  method: 'post',
  path: '/admin/me/recovery-codes',
  tags,
  summary: 'New recovery codes for the authenticator’s current code; the old ones stop working',
  request: jsonBody(adminNewRecoveryCodesSchema),
  responses: { 200: json(adminRecoveryCodesSchema), 400: errors[400], ...signedIn },
})
const setupRoute = createRoute({
  method: 'get',
  path: '/admin/setup/{token}',
  tags,
  summary: 'What a setup link is for; `setup_expired` when it ran out or was used',
  request: { params: adminSetupTokenParamSchema },
  responses: { 200: json(adminSetupSchema), 404: errors[404], 429: errors[429], 503: errors[503] },
})
const setupPasswordRoute = createRoute({
  method: 'post',
  path: '/admin/setup/{token}/password',
  tags,
  summary: 'The password, and a secret for the authenticator app (asked again, a new one)',
  request: { params: adminSetupTokenParamSchema, ...jsonBody(adminSetupPasswordSchema) },
  responses: { 200: json(adminSetupSecretSchema), 400: errors[400], 404: errors[404], 429: errors[429], 503: errors[503] },
})
const setupConfirmRoute = createRoute({
  method: 'post',
  path: '/admin/setup/{token}/confirm',
  tags,
  summary: 'The app’s first code: the account is active and signed in; its recovery codes, shown once',
  request: { params: adminSetupTokenParamSchema, ...jsonBody(adminSetupConfirmSchema) },
  responses: { 200: json(adminRecoveryCodesSchema), 400: errors[400], 404: errors[404], 429: errors[429], 503: errors[503] },
})
const teamRoute = createRoute({
  method: 'get',
  path: '/admin/team',
  tags,
  summary: 'The Ýeral team’s accounts',
  responses: { 200: json(listOf(adminMemberSchema)), ...signedIn },
})
const inviteRoute = createRoute({
  method: 'post',
  path: '/admin/team',
  tags,
  summary: 'A new account and its setup link (24 hours); `login_taken`',
  request: jsonBody(adminInviteSchema),
  responses: { 201: json(adminSetupLinkSchema), 400: errors[400], 409: errors[409], ...signedIn },
})
const resetRoute = createRoute({
  method: 'post',
  path: '/admin/team/{id}/reset',
  tags,
  summary: 'A teammate starts again from a new setup link: password, app, recovery codes and sessions go',
  request: { params: adminIdParamSchema },
  responses: { 200: json(adminSetupLinkSchema), 404: errors[404], ...signedIn },
})
const disableRoute = createRoute({
  method: 'post',
  path: '/admin/team/{id}/disable',
  tags,
  summary: 'A teammate’s account is turned off (never one’s own); a reset brings it back',
  request: { params: adminIdParamSchema },
  responses: { ...noContent, 404: errors[404], ...signedIn },
})

export const adminRoutes = new OpenAPIHono<AppEnv>()
  .openapi(signInRoute, async (c) => {
    const { deps } = c.var
    const input = c.req.valid('json')
    await guardAddress(deps, ipOf(c), input.login)
    const admin = await signIn(deps, input, (tx, signed) => startAdminSession(c, tx, signed.id))
    return c.json(adminMeOf(admin), 200)
  })
  .openapi(signOutRoute, async (c) => {
    await endAdminSession(c)
    return c.body(null, 204)
  })
  .openapi(meRoute, (c) => c.json(adminMeOf(requireAdmin(c)), 200))
  .openapi(passwordRoute, async (c) => {
    const admin = requireAdmin(c)
    await changeAdminPassword(c.var.deps, admin, c.var.admin!.sessionId, c.req.valid('json'))
    return c.body(null, 204)
  })
  .openapi(recoveryCodesRoute, async (c) => {
    const codes = await renewRecoveryCodes(c.var.deps, requireAdmin(c), c.req.valid('json').code)
    return c.json({ codes }, 200)
  })
  .openapi(setupRoute, async (c) => {
    await guardAddress(c.var.deps, ipOf(c))
    return c.json(await setupOf(c.var.deps, c.req.valid('param').token), 200)
  })
  .openapi(setupPasswordRoute, async (c) => {
    await guardAddress(c.var.deps, ipOf(c))
    return c.json(await chooseSetupPassword(c.var.deps, c.req.valid('param').token, c.req.valid('json').password), 200)
  })
  .openapi(setupConfirmRoute, async (c) => {
    const { deps } = c.var
    await guardAddress(deps, ipOf(c))
    const { codes } = await confirmSetup(deps, c.req.valid('param').token, c.req.valid('json').code, (tx, admin) =>
      startAdminSession(c, tx, admin.id),
    )
    return c.json({ codes }, 200)
  })
  .openapi(teamRoute, async (c) => {
    requireAdmin(c)
    return c.json({ items: await adminTeam(c.var.deps.db) }, 200)
  })
  .openapi(inviteRoute, async (c) => c.json(await inviteAdmin(c.var.deps, requireAdmin(c), c.req.valid('json')), 201))
  .openapi(resetRoute, async (c) => c.json(await resetAdmin(c.var.deps, requireAdmin(c), c.req.valid('param').id), 200))
  .openapi(disableRoute, async (c) => {
    await disableAdmin(c.var.deps, requireAdmin(c), c.req.valid('param').id)
    return c.body(null, 204)
  })
