/** The admin tool's businesses (book F-179, S-17; Q-274, Q-275, Q-012, Q-215): `/v1/admin/businesses/*`. */
import { createRoute, OpenAPIHono } from '@hono/zod-openapi'
import {
  adminBusinessesQuerySchema,
  adminBusinessItemSchema,
  adminBusinessParamSchema,
  adminBusinessSchema,
  adminReasonSchema,
  adminVerifyQuerySchema,
} from '@yeral/contract/admin'
import { langQuerySchema, listOf } from '@yeral/contract/common'
import type { AppEnv } from '../../http/env'
import { errors, json, jsonBody, noContent } from '../../http/openapi'
import { adminBusiness, adminBusinesses, hideBusiness, rejectBusiness, showBusiness, verifyBusiness } from './businesses'
import { requireAdmin } from './session'

const tags = ['admin']
const signedIn = { 401: errors[401], 403: errors[403], 503: errors[503] }

const listRoute = createRoute({
  method: 'get',
  path: '/admin/businesses',
  tags,
  summary: 'A list: the queue to review (the longest waiting first), moves to check, sent back, hidden, live, or a search',
  request: { query: adminBusinessesQuerySchema },
  responses: { 200: json(listOf(adminBusinessItemSchema)), 400: errors[400], ...signedIn },
})
const detailRoute = createRoute({
  method: 'get',
  path: '/admin/businesses/{id}',
  tags,
  summary: 'A business to check (Q-276): the phone, the name, the map, the category, the photos, and its history',
  request: { params: adminBusinessParamSchema, query: langQuerySchema },
  responses: { 200: json(adminBusinessSchema), 404: errors[404], ...signedIn },
})
const verifyRoute = createRoute({
  method: 'post',
  path: '/admin/businesses/{id}/verify',
  tags,
  summary: 'Verified: public, and the owner told; a verified one that moved is checked again with `moved` as seen',
  request: { params: adminBusinessParamSchema, query: adminVerifyQuerySchema },
  responses: { ...noContent, 404: errors[404], 409: errors[409], ...signedIn },
})
const rejectRoute = createRoute({
  method: 'post',
  path: '/admin/businesses/{id}/reject',
  tags,
  summary: 'Sent back with a reason the owner reads; a live business sent back is un-verified',
  request: { params: adminBusinessParamSchema, ...jsonBody(adminReasonSchema) },
  responses: { ...noContent, 400: errors[400], 404: errors[404], 409: errors[409], ...signedIn },
})
const hideRoute = createRoute({
  method: 'post',
  path: '/admin/businesses/{id}/hide',
  tags,
  summary: 'Hidden from search and visitors, with a reason to the owner; its bookings and its team go on',
  request: { params: adminBusinessParamSchema, ...jsonBody(adminReasonSchema) },
  responses: { ...noContent, 400: errors[400], 404: errors[404], 409: errors[409], ...signedIn },
})
const showRoute = createRoute({
  method: 'post',
  path: '/admin/businesses/{id}/show',
  tags,
  summary: 'Shown again after being hidden',
  request: { params: adminBusinessParamSchema },
  responses: { ...noContent, 404: errors[404], 409: errors[409], ...signedIn },
})

export const adminBusinessRoutes = new OpenAPIHono<AppEnv>()
  .openapi(listRoute, async (c) => {
    requireAdmin(c)
    return c.json({ items: await adminBusinesses(c.var.deps.db, c.req.valid('query')) }, 200)
  })
  .openapi(detailRoute, async (c) => {
    requireAdmin(c)
    return c.json(await adminBusiness(c.var.deps, c.req.valid('param').id, c.req.valid('query').lang), 200)
  })
  .openapi(verifyRoute, async (c) => {
    await verifyBusiness(c.var.deps, requireAdmin(c), c.req.valid('param').id, c.req.valid('query').moved)
    return c.body(null, 204)
  })
  .openapi(rejectRoute, async (c) => {
    await rejectBusiness(c.var.deps, requireAdmin(c), c.req.valid('param').id, c.req.valid('json').reason)
    return c.body(null, 204)
  })
  .openapi(hideRoute, async (c) => {
    await hideBusiness(c.var.deps, requireAdmin(c), c.req.valid('param').id, c.req.valid('json').reason)
    return c.body(null, 204)
  })
  .openapi(showRoute, async (c) => {
    await showBusiness(c.var.deps, requireAdmin(c), c.req.valid('param').id)
    return c.body(null, 204)
  })
