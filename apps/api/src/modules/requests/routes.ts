/**
 * Booking requests (book B-19, B-20, B-21; `/w/{slug}/requests…`): every team member sees the requests their level
 * sees (a specialist, the ones they're on); who may answer one follows the "who answers" setting.
 */
import { createRoute, OpenAPIHono } from '@hono/zod-openapi'
import { declineInputSchema, requestListSchema, requestParamSchema } from '@yeral/contract/requests'
import { workspaceParamSchema } from '@yeral/contract/team'
import { MARKET } from '@yeral/domain/market'
import type { AppEnv } from '../../http/env'
import { errors, json, jsonBody, noContent } from '../../http/openapi'
import { requireMember } from '../team/service'
import { confirmRequest, declineRequest, requestsFor } from './service'

const tags = ['requests']
const denied = { 401: errors[401], 403: errors[403], 404: errors[404] }

const listRoute = createRoute({
  method: 'get',
  path: '/w/{slug}/requests',
  tags,
  summary: 'The waiting requests the viewer may see, most urgent first, with whether they may answer each',
  request: { params: workspaceParamSchema },
  responses: { 200: json(requestListSchema), 401: errors[401], 404: errors[404] },
})
const confirmRoute = createRoute({
  method: 'post',
  path: '/w/{slug}/requests/{code}/confirm',
  tags,
  summary: '"Tassykla": confirm a request (a move moves its booking); the client is told',
  request: { params: requestParamSchema },
  responses: { ...noContent, 409: errors[409], ...denied },
})
const declineRoute = createRoute({
  method: 'post',
  path: '/w/{slug}/requests/{code}/decline',
  tags,
  summary: '"Ret et": decline with a reason and, for a new request, up to 3 offered times; a move keeps its booking',
  request: { params: requestParamSchema, ...jsonBody(declineInputSchema) },
  responses: { ...noContent, 400: errors[400], 409: errors[409], ...denied },
})

export const requestRoutes = new OpenAPIHono<AppEnv>()
  .openapi(listRoute, async (c) => {
    const { user, business, actor } = await requireMember(c, c.req.valid('param').slug)
    const items = await requestsFor(c.var.deps.db, business, actor, user.lang ?? MARKET.defaultLanguage, c.var.deps.now())
    return c.json({ items }, 200)
  })
  .openapi(confirmRoute, async (c) => {
    const { slug, code } = c.req.valid('param')
    const { business, actor } = await requireMember(c, slug)
    await confirmRequest(c.var.deps, business, actor, code)
    return c.body(null, 204)
  })
  .openapi(declineRoute, async (c) => {
    const { slug, code } = c.req.valid('param')
    const { business, actor } = await requireMember(c, slug)
    await declineRequest(c.var.deps, business, actor, code, c.req.valid('json'))
    return c.body(null, 204)
  })
