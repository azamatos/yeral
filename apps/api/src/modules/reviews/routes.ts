/**
 * "Teswirler" (book B-53, B-54; `/w/{slug}/reviews…`): the team's reviews, the reply and reporting a review to Ýeral.
 */
import { createRoute, OpenAPIHono } from '@hono/zod-openapi'
import {
  reviewParamSchema,
  reviewReplyInputSchema,
  reviewReportInputSchema,
  teamReviewsQuerySchema,
  teamReviewsSchema,
} from '@yeral/contract/reviews'
import { workspaceParamSchema } from '@yeral/contract/team'
import type { AppEnv } from '../../http/env'
import { errors, json, jsonBody, noContent } from '../../http/openapi'
import { requireMember } from '../team/service'
import { deleteReply, replyToReview, reportReview, teamReviews } from './team'

const tags = ['reviews']
const denied = { 401: errors[401], 403: errors[403], 404: errors[404] }

const listRoute = createRoute({
  method: 'get',
  path: '/w/{slug}/reviews',
  tags,
  summary: '"Teswirler": the summary, unanswered or by stars or specialist, sorted (a specialist: their own visits)',
  request: { params: workspaceParamSchema, query: teamReviewsQuerySchema },
  responses: { 200: json(teamReviewsSchema), 400: errors[400], ...denied },
})
const replyRoute = createRoute({
  method: 'put',
  path: '/w/{slug}/reviews/{id}/reply',
  tags,
  summary: '"Jogaby çap et" or its edit: everyone sees it',
  request: { params: reviewParamSchema, ...jsonBody(reviewReplyInputSchema) },
  responses: { ...noContent, 400: errors[400], ...denied },
})
const deleteReplyRoute = createRoute({
  method: 'delete',
  path: '/w/{slug}/reviews/{id}/reply',
  tags,
  summary: 'The reply goes',
  request: { params: reviewParamSchema },
  responses: { ...noContent, 400: errors[400], ...denied },
})
const reportRoute = createRoute({
  method: 'post',
  path: '/w/{slug}/reviews/{id}/report',
  tags,
  summary: '"Arz et": Ýeral checks it within 48 hours; it isn\'t counted meanwhile; once per review',
  request: { params: reviewParamSchema, ...jsonBody(reviewReportInputSchema) },
  responses: { ...noContent, 400: errors[400], 409: errors[409], ...denied },
})

export const reviewRoutes = new OpenAPIHono<AppEnv>()
  .openapi(listRoute, async (c) => {
    const { business, actor } = await requireMember(c, c.req.valid('param').slug)
    return c.json(await teamReviews(c.var.deps.db, business, actor, c.req.valid('query')), 200)
  })
  .openapi(replyRoute, async (c) => {
    const { slug, id } = c.req.valid('param')
    const { business, actor } = await requireMember(c, slug)
    await replyToReview(c.var.deps, business, actor, id, c.req.valid('json'))
    return c.body(null, 204)
  })
  .openapi(deleteReplyRoute, async (c) => {
    const { slug, id } = c.req.valid('param')
    const { business, actor } = await requireMember(c, slug)
    await deleteReply(c.var.deps, business, actor, id)
    return c.body(null, 204)
  })
  .openapi(reportRoute, async (c) => {
    const { slug, id } = c.req.valid('param')
    const { business, actor } = await requireMember(c, slug)
    await reportReview(c.var.deps, business, actor, id, c.req.valid('json'))
    return c.body(null, 204)
  })
