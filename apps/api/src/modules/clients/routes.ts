/**
 * "Müşderiler" (book B-32–B-36; `/w/{slug}/clients…`): the list, the new-booking drawer's lookup, the client card,
 * and keeping them. Every member reads them and adds notes (a specialist on their own clients); the owner and
 * administrators add, change and delete clients.
 */
import { createRoute, OpenAPIHono } from '@hono/zod-openapi'
import {
  clientCardQuerySchema,
  clientCardSchema,
  clientCreatedSchema,
  clientInputSchema,
  clientListQuerySchema,
  clientListSchema,
  clientLookupQuerySchema,
  clientLookupSchema,
  clientNoteInputSchema,
  clientParamSchema,
  clientUpdateSchema,
} from '@yeral/contract/clients'
import { workspaceParamSchema } from '@yeral/contract/team'
import type { AppEnv } from '../../http/env'
import { errors, json, jsonBody, noContent } from '../../http/openapi'
import { requireMember } from '../team/service'
import { clientCard, clientList, clientLookup } from './service'
import { addClient, addNote, deleteClient, updateClient } from './write'

const tags = ['clients']
const denied = { 401: errors[401], 403: errors[403], 404: errors[404] }

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

const addRoute = createRoute({
  method: 'post',
  path: '/w/{slug}/clients',
  tags,
  summary: '"Täze müşderi": a client by their number (B-33); a number already there is `client_exists` with its card',
  request: { params: workspaceParamSchema, ...jsonBody(clientInputSchema) },
  responses: { 201: json(clientCreatedSchema), 400: errors[400], 409: errors[409], ...denied },
})
const updateRoute = createRoute({
  method: 'patch',
  path: '/w/{slug}/clients/{id}',
  tags,
  summary: 'The card\'s edit and switches: name, number, birthday, source, tags, "Phone only", no reminders',
  request: { params: clientParamSchema, ...jsonBody(clientUpdateSchema) },
  responses: { ...noContent, 400: errors[400], 409: errors[409], ...denied },
})
const noteRoute = createRoute({
  method: 'post',
  path: '/w/{slug}/clients/{id}/notes',
  tags,
  summary: '"Bellik goş": a team note, shown when they book if `alert`',
  request: { params: clientParamSchema, ...jsonBody(clientNoteInputSchema) },
  responses: { 201: json(clientCreatedSchema), 400: errors[400], ...denied },
})
const deleteRoute = createRoute({
  method: 'delete',
  path: '/w/{slug}/clients/{id}',
  tags,
  summary: '"Müşderini poz": not with bookings ahead or waiting requests; past bookings stay without the name',
  request: { params: clientParamSchema },
  responses: { ...noContent, 409: errors[409], ...denied },
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
  .openapi(addRoute, async (c) => {
    const { business, actor } = await requireMember(c, c.req.valid('param').slug)
    return c.json(await addClient(c.var.deps, business, actor, c.req.valid('json')), 201)
  })
  .openapi(updateRoute, async (c) => {
    const { slug, id } = c.req.valid('param')
    const { business, actor } = await requireMember(c, slug)
    await updateClient(c.var.deps, business, actor, id, c.req.valid('json'))
    return c.body(null, 204)
  })
  .openapi(noteRoute, async (c) => {
    const { slug, id } = c.req.valid('param')
    const { business, actor } = await requireMember(c, slug)
    return c.json(await addNote(c.var.deps, business, actor, id, c.req.valid('json')), 201)
  })
  .openapi(deleteRoute, async (c) => {
    const { slug, id } = c.req.valid('param')
    const { business, actor } = await requireMember(c, slug)
    await deleteClient(c.var.deps, business, actor, id)
    return c.body(null, 204)
  })
