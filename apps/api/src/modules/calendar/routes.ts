/**
 * The business's own bookings (book B-23, B-24, B-25; `/w/{slug}/…`): free times as the team books them, a booking for
 * a client who calls or walks in, and its undo. A specialist books only themself (chapter 3).
 */
import { createRoute, OpenAPIHono } from '@hono/zod-openapi'
import {
  freeTimesQuerySchema,
  freeTimesSchema,
  newBookingResultSchema,
  newBookingSchema,
  teamBookingParamSchema,
} from '@yeral/contract/calendar'
import { workspaceParamSchema } from '@yeral/contract/team'
import type { AppEnv } from '../../http/env'
import { errors, json, jsonBody, noContent } from '../../http/openapi'
import { requireMember } from '../team/service'
import { addBooking, freeTimes, undoBooking } from './service'

const tags = ['calendar']
const denied = { 401: errors[401], 403: errors[403], 404: errors[404] }

const freeTimesRoute = createRoute({
  method: 'get',
  path: '/w/{slug}/free-times',
  tags,
  summary: 'Free times as the team books them: the nearest four with their specialist, a day’s starts, the 14-day strip',
  request: { params: workspaceParamSchema, query: freeTimesQuerySchema },
  responses: { 200: json(freeTimesSchema), 400: errors[400], ...denied },
})
const addRoute = createRoute({
  method: 'post',
  path: '/w/{slug}/bookings',
  tags,
  summary: '"Ýazyp goý": a booking for a client who calls or walks in, confirmed at once',
  request: { params: workspaceParamSchema, ...jsonBody(newBookingSchema) },
  responses: { 201: json(newBookingResultSchema, 'Booked'), 400: errors[400], 409: errors[409], ...denied },
})
const undoRoute = createRoute({
  method: 'post',
  path: '/w/{slug}/bookings/{code}/undo',
  tags,
  summary: '"Yzyna al": a booking the team just added goes as if never made, before its SMS',
  request: { params: teamBookingParamSchema },
  responses: { ...noContent, 409: errors[409], ...denied },
})

export const calendarRoutes = new OpenAPIHono<AppEnv>()
  .openapi(freeTimesRoute, async (c) => {
    const { business, actor } = await requireMember(c, c.req.valid('param').slug)
    return c.json(await freeTimes(c.var.deps, business, actor, c.req.valid('query')), 200)
  })
  .openapi(addRoute, async (c) => {
    const { business, actor } = await requireMember(c, c.req.valid('param').slug)
    return c.json(await addBooking(c.var.deps, business, actor, c.req.valid('json')), 201)
  })
  .openapi(undoRoute, async (c) => {
    const { slug, code } = c.req.valid('param')
    const { business, actor } = await requireMember(c, slug)
    await undoBooking(c.var.deps, business, actor, code)
    return c.body(null, 204)
  })
