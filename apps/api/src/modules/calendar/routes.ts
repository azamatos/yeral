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
  bookingExportQuerySchema,
  bookingListQuerySchema,
  bookingListSchema,
  businessCancelSchema,
  calendarBookingSchema,
  calendarQuerySchema,
  calendarViewSchema,
  complaintInputSchema,
  freeTimesQuerySchema,
  freeTimesSchema,
  moveBookingSchema,
  newBookingResultSchema,
  newBookingSchema,
  setInternalStatusSchema,
  setTeamNoteSchema,
  teamBookingParamSchema,
} from '@yeral/contract/calendar'
import { langQuerySchema } from '@yeral/contract/common'
import { workspaceParamSchema } from '@yeral/contract/team'
import { today } from '@yeral/domain/time'
import { z } from 'zod'
import type { AppEnv } from '../../http/env'
import { errors, json, jsonBody, noContent } from '../../http/openapi'
import { requireMember } from '../team/service'
import { setInternalStatus } from '../settings/statuses'
import { addBlock, blocksFor, removeBlock } from './blocks'
import { fileComplaint, removeComplaint } from './complaints'
import { bookingList, exportBookings } from './list'
import { setTeamNote } from './note'
import { calendarBooking, calendarView } from './view'
import { addBooking, cancelByBusiness, freeTimes, moveBooking, undoBooking } from './service'

const tags = ['calendar']
const denied = { 401: errors[401], 403: errors[403], 404: errors[404] }

const freeTimesRoute = createRoute({
  method: 'get',
  path: '/w/{slug}/free-times',
  tags,
  summary:
    'Free times as the team books them: the nearest four with their specialist, a day’s starts, the 14-day strip; with `offer=<code>`, the times that request’s decline may offer',
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

const noteRoute = createRoute({
  method: 'put',
  path: '/w/{slug}/bookings/{code}/note',
  tags,
  summary: 'The team’s note on a saved booking, whole (null clears it); whoever sees the booking in the calendar',
  request: { params: teamBookingParamSchema, ...jsonBody(setTeamNoteSchema) },
  responses: { ...noContent, 400: errors[400], ...denied },
})

const bookingRoute = createRoute({
  method: 'get',
  path: '/w/{slug}/bookings/{code}',
  tags,
  summary: 'One booking by its code as the calendar draws it, whatever its status (the list’s drawer, a notification’s "Open")',
  request: { params: teamBookingParamSchema, query: langQuerySchema },
  responses: { 200: json(calendarBookingSchema), 400: errors[400], ...denied },
})

const calendarRoute = createRoute({
  method: 'get',
  path: '/w/{slug}/calendar',
  tags,
  summary: '"Senenama": a day or a week, everyone the reader sees or one person, with layers, markers and the day’s line',
  request: { params: workspaceParamSchema, query: calendarQuerySchema },
  responses: { 200: json(calendarViewSchema), 400: errors[400], ...denied },
})

const complaintRoute = createRoute({
  method: 'post',
  path: '/w/{slug}/bookings/{code}/complaint',
  tags,
  summary: '"Arz et": a no-show (the client sees it), late, rude or other; one per booking',
  request: { params: teamBookingParamSchema, ...jsonBody(complaintInputSchema) },
  responses: { ...noContent, 400: errors[400], 409: errors[409], ...denied },
})
const removeComplaintRoute = createRoute({
  method: 'delete',
  path: '/w/{slug}/bookings/{code}/complaint',
  tags,
  summary: 'Take a mistaken complaint back within 7 days; a no-show goes back to the visit it was',
  request: { params: teamBookingParamSchema },
  responses: { ...noContent, 409: errors[409], ...denied },
})

const listRoute = createRoute({
  method: 'get',
  path: '/w/{slug}/bookings',
  tags,
  summary: '"Ýazylyşlar": today, ahead, before or cancelled, searched by client, number or code, by specialist, service, dates',
  request: { params: workspaceParamSchema, query: bookingListQuerySchema },
  responses: { 200: json(bookingListSchema), 400: errors[400], ...denied },
})
const exportRoute = createRoute({
  method: 'get',
  path: '/w/{slug}/bookings/export',
  tags,
  summary: '"Eksport (CSV)": the rows the same filters find, in the reader\'s language (the owner and administrators)',
  request: { params: workspaceParamSchema, query: bookingExportQuerySchema },
  responses: {
    200: {
      description: 'The bookings as a CSV file; `X-Total-Count` is how many matched (the file holds 10,000 at most)',
      headers: z.object({ 'X-Total-Count': z.string() }),
      content: { 'text/csv': { schema: z.string() } },
    },
    400: errors[400],
    ...denied,
  },
})

export const calendarRoutes = new OpenAPIHono<AppEnv>()
  .openapi(listRoute, async (c) => {
    const { business, actor } = await requireMember(c, c.req.valid('param').slug)
    return c.json(await bookingList(c.var.deps, business, actor, c.req.valid('query')), 200)
  })
  .openapi(exportRoute, async (c) => {
    const { slug } = c.req.valid('param')
    const { business, actor } = await requireMember(c, slug)
    const q = c.req.valid('query')
    const { csv, total } = await exportBookings(c.var.deps, business, actor, q)
    return c.body(csv, 200, {
      'X-Total-Count': String(total),
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="bookings-${slug}-${q.tab}-${today(c.var.deps.now())}.csv"`,
    })
  })
  // after the export: `/bookings/export` is the file, not a code
  .openapi(bookingRoute, async (c) => {
    const { slug, code } = c.req.valid('param')
    const { business, actor } = await requireMember(c, slug)
    return c.json(await calendarBooking(c.var.deps, business, actor, code, c.req.valid('query').lang), 200)
  })
  .openapi(noteRoute, async (c) => {
    const { slug, code } = c.req.valid('param')
    const { business, actor } = await requireMember(c, slug)
    await setTeamNote(c.var.deps, business, actor, code, c.req.valid('json').note)
    return c.body(null, 204)
  })
  .openapi(complaintRoute, async (c) => {
    const { slug, code } = c.req.valid('param')
    const { business, actor } = await requireMember(c, slug)
    await fileComplaint(c.var.deps, business, actor, code, c.req.valid('json'))
    return c.body(null, 204)
  })
  .openapi(removeComplaintRoute, async (c) => {
    const { slug, code } = c.req.valid('param')
    const { business, actor } = await requireMember(c, slug)
    await removeComplaint(c.var.deps, business, actor, code)
    return c.body(null, 204)
  })
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
