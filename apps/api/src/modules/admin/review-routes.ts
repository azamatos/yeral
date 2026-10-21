/** Reported reviews in the admin tool (book ROUND6 F2, Q-261, Q-262): `/v1/admin/reviews/*`. */
import { createRoute, OpenAPIHono } from '@hono/zod-openapi'
import { adminReasonSchema, adminReviewParamSchema, adminReviewSchema, adminReviewsQuerySchema } from '@yeral/contract/admin'
import { listOf } from '@yeral/contract/common'
import type { AppEnv } from '../../http/env'
import { errors, json, jsonBody, noContent } from '../../http/openapi'
import { adminReviews, clearReview, removeReview } from './reviews'
import { requireAdmin } from './session'

const tags = ['admin']
const signedIn = { 401: errors[401], 403: errors[403], 503: errors[503] }

const listRoute = createRoute({
  method: 'get',
  path: '/admin/reviews',
  tags,
  summary: 'Reported reviews waiting (the longest waiting first), kept or removed',
  request: { query: adminReviewsQuerySchema },
  responses: { 200: json(listOf(adminReviewSchema)), 400: errors[400], ...signedIn },
})
const clearRoute = createRoute({
  method: 'post',
  path: '/admin/reviews/{id}/clear',
  tags,
  summary: 'Kept: it counts and can’t be reported again',
  request: { params: adminReviewParamSchema },
  responses: { ...noContent, 404: errors[404], 409: errors[409], ...signedIn },
})
const removeRoute = createRoute({
  method: 'post',
  path: '/admin/reviews/{id}/remove',
  tags,
  summary: 'Removed with the team’s note: gone from the page, the team’s list and the rating',
  request: { params: adminReviewParamSchema, ...jsonBody(adminReasonSchema) },
  responses: { ...noContent, 400: errors[400], 404: errors[404], 409: errors[409], ...signedIn },
})

export const adminReviewRoutes = new OpenAPIHono<AppEnv>()
  .openapi(listRoute, async (c) => {
    requireAdmin(c)
    return c.json({ items: await adminReviews(c.var.deps.db, c.req.valid('query').view) }, 200)
  })
  .openapi(clearRoute, async (c) => {
    await clearReview(c.var.deps, requireAdmin(c), c.req.valid('param').id)
    return c.body(null, 204)
  })
  .openapi(removeRoute, async (c) => {
    await removeReview(c.var.deps, requireAdmin(c), c.req.valid('param').id, c.req.valid('json').reason)
    return c.body(null, 204)
  })
