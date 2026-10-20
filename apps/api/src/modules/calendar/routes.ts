/**
 * The business's own bookings (book B-23–B-27; `/w/{slug}/…`): free times as the team books them, a booking for a
 * client who calls or walks in and its undo, and moving or cancelling a confirmed one. A specialist books, moves and
 * cancels only their own (chapter 3).
 */
import { createRoute, OpenAPIHono } from '@hono/zod-openapi'
import {
  blockDeleteQuerySchema,
  blockInputSchema,
  blockListSchema,
  blockParamSchema,
  blocksQuerySchema,
  businessCancelSchema,
  calendarQuerySchema,
  calendarViewSchema,
  freeTimesQuerySchema,
  freeTimesSchema,
  newBookingResultSchema,
  moveBookingSchema,
  newBookingSchema,
  setInternalStatusSchema,
  teamBookingParamSchema,
} from '@yeral/contract/calendar'
import { workspaceParamSchema } from '@yeral/contract/team'
import type { AppEnv } from '../../http/env'
import { errors, json, jsonBody, noContent } from '../../http/openapi'
import { requireMember } from '../team/service'
import { setInternalStatus } from '../settings/statuses'
import { addBlock, blocksFor, removeBlock } from './blocks'
import { calendarView } from './view'
import { addBooking, cancelByBusiness, freeTimes, moveBooking, undoBooking } from './service'

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

const moveRoute = createRoute({
  method: 'post',
  path: '/w/{slug}/bookings/{code}/move',
  tags,
  summary: '"Move to another time" or a dragged block: a new time, and another specialist when given',
  request: { params: teamBookingParamSchema, ...jsonBody(moveBookingSchema) },
  responses: { ...noContent, 400: errors[400], 409: errors[409], ...denied },
})
const cancelRoute = createRoute({
  method: 'post',
  path: '/w/{slug}/bookings/{code}/cancel',
  tags,
  summary: '"Cancel booking" with the reason the client sees ("The client called to cancel" is their own cancel)',
  request: { params: teamBookingParamSchema, ...jsonBody(businessCancelSchema) },
  responses: { ...noContent, 400: errors[400], 409: errors[409], ...denied },
})

const blocksRoute = createRoute({
  method: 'get',
  path: '/w/{slug}/calendar/blocks',
  tags,
  summary: 'Blocked time from–to the reader may see (a specialist their own)',
  request: { params: workspaceParamSchema, query: blocksQuerySchema },
  responses: { 200: json(blockListSchema), 400: errors[400], ...denied },
})
const blockRoute = createRoute({
  method: 'post',
  path: '/w/{slug}/calendar/blocks',
  tags,
  summary: '"Wagty ýap": close part of a day for one person, optionally every week up to a date; never over a booking',
  request: { params: workspaceParamSchema, ...jsonBody(blockInputSchema) },
  responses: { 201: json(blockListSchema, 'Blocked'), 400: errors[400], 409: errors[409], ...denied },
})
const unblockRoute = createRoute({
  method: 'delete',
  path: '/w/{slug}/calendar/blocks/{id}',
  tags,
  summary: 'Take blocked time away: this one, or this one and the later ones of its weekly repeat',
  request: { params: blockParamSchema, query: blockDeleteQuerySchema },
  responses: { ...noContent, ...denied },
})

const internalStatusRoute = createRoute({
  method: 'put',
  path: '/w/{slug}/bookings/{code}/internal-status',
  tags,
  summary: '"Içerki ýagdaý": a team-only marker on a confirmed booking, or none; the client never sees it',
  request: { params: teamBookingParamSchema, ...jsonBody(setInternalStatusSchema) },
  responses: { ...noContent, 400: errors[400], 409: errors[409], ...denied },
})

const calendarRoute = createRoute({
  method: 'get',
  path: '/w/{slug}/calendar',
  tags,
  summary: '"Senenama": a day or a week, everyone the reader sees or one person, with layers, markers and the day’s line',
  request: { params: workspaceParamSchema, query: calendarQuerySchema },
  responses: { 200: json(calendarViewSchema), 400: errors[400], ...denied },
})

export const calendarRoutes = new OpenAPIHono<AppEnv>()
  .openapi(calendarRoute, async (c) => {
    const { business, actor } = await requireMember(c, c.req.valid('param').slug)
    return c.json(await calendarView(c.var.deps, business, actor, c.req.valid('query')), 200)
  })
  .openapi(internalStatusRoute, async (c) => {
    const { slug, code } = c.req.valid('param')
    const { business, actor } = await requireMember(c, slug)
    await setInternalStatus(c.var.deps, business, actor, code, c.req.valid('json').statusId)
    return c.body(null, 204)
  })
  .openapi(blocksRoute, async (c) => {
    const { business, actor } = await requireMember(c, c.req.valid('param').slug)
    const { from, to } = c.req.valid('query')
    return c.json({ items: await blocksFor(c.var.deps.db, business, actor, from, to) }, 200)
  })
  .openapi(blockRoute, async (c) => {
    const { business, actor, user } = await requireMember(c, c.req.valid('param').slug)
    return c.json({ items: await addBlock(c.var.deps, business, actor, user.id, c.req.valid('json')) }, 201)
  })
  .openapi(unblockRoute, async (c) => {
    const { slug, id } = c.req.valid('param')
    const { business, actor } = await requireMember(c, slug)
    await removeBlock(c.var.deps, business, actor, id, c.req.valid('query').scope)
    return c.body(null, 204)
  })
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
  .openapi(moveRoute, async (c) => {
    const { slug, code } = c.req.valid('param')
    const { business, actor } = await requireMember(c, slug)
    await moveBooking(c.var.deps, business, actor, code, c.req.valid('json'))
    return c.body(null, 204)
  })
  .openapi(cancelRoute, async (c) => {
    const { slug, code } = c.req.valid('param')
    const { business, actor } = await requireMember(c, slug)
    await cancelByBusiness(c.var.deps, business, actor, code, c.req.valid('json'))
    return c.body(null, 204)
  })
