/**
 * "Müşderiler" (book B-32, B-34; `/w/{slug}/clients…`): the list, the new-booking drawer's lookup and the client card.
 * Every member reads them; a specialist only their own clients.
 */
import { createRoute, OpenAPIHono } from '@hono/zod-openapi'
import {
  clientCardQuerySchema,
  clientCardSchema,
  clientListQuerySchema,
  clientListSchema,
  clientLookupQuerySchema,
  clientLookupSchema,
  clientParamSchema,
} from '@yeral/contract/clients'
import { workspaceParamSchema } from '@yeral/contract/team'
import type { AppEnv } from '../../http/env'
import { errors, json } from '../../http/openapi'
import { requireMember } from '../team/service'
import { clientCard, clientList, clientLookup } from './service'

const tags = ['clients']

const listRoute = createRoute({
  method: 'get',
  path: '/w/{slug}/clients',
  tags,
  summary: '"Müşderiler": the clients the reader may see, the most recently seen first, by name, number or chip',
  request: { params: workspaceParamSchema, query: clientListQuerySchema },
  responses: { 200: json(clientListSchema), 400: errors[400], 401: errors[401], 404: errors[404] },
})
const lookupRoute = createRoute({
  method: 'get',
  path: '/w/{slug}/clients/lookup',
  tags,
  summary: 'The new-booking drawer: up to 3 clients by the start of their number or a part of their name',
  request: { params: workspaceParamSchema, query: clientLookupQuerySchema },
  responses: { 200: json(clientLookupSchema), 400: errors[400], 401: errors[401], 404: errors[404] },
})
const cardRoute = createRoute({
  method: 'get',
  path: '/w/{slug}/clients/{id}',
  tags,
  summary: 'The client card: numbers, notes, bookings ahead and before, reports and switches',
  request: { params: clientParamSchema, query: clientCardQuerySchema },
  responses: { 200: json(clientCardSchema), 400: errors[400], 401: errors[401], 404: errors[404] },
})

export const clientRoutes = new OpenAPIHono<AppEnv>()
  .openapi(listRoute, async (c) => {
    const { business, actor } = await requireMember(c, c.req.valid('param').slug)
    return c.json(await clientList(c.var.deps.db, business, actor, c.req.valid('query'), c.var.deps.now()), 200)
  })
  .openapi(lookupRoute, async (c) => {
    const { business, actor } = await requireMember(c, c.req.valid('param').slug)
    const items = await clientLookup(c.var.deps.db, business, actor, c.req.valid('query'), c.var.deps.now())
    return c.json({ items }, 200)
  })
  .openapi(cardRoute, async (c) => {
    const { slug, id } = c.req.valid('param')
    const { business, actor } = await requireMember(c, slug)
    return c.json(await clientCard(c.var.deps, business, actor, id, c.req.valid('query')), 200)
  })
