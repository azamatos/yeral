/** Client bookings: send, list, detail and the actions on one booking (client spec §4.4–4.8). */
import { createRoute, OpenAPIHono, type z } from '@hono/zod-openapi'
import {
  acceptAlternativeSchema,
  bookingCodeParamSchema,
  bookingDetailSchema,
  bookingListSchema,
  cancelBookingSchema,
  createBookingSchema,
  editNoteSchema,
  myBookingsQuerySchema,
  rescheduleSchema,
  reviewInputSchema,
} from '@yeral/contract/bookings'
import { langQuerySchema } from '@yeral/contract/common'
import { effectiveStatus } from '@yeral/domain/lifecycle'
import { and, eq, isNull } from 'drizzle-orm'
import { bookings } from '../../db/schema'
import type { AppEnv } from '../../http/env'
import { errors, json, jsonBody } from '../../http/openapi'
import { requireUser } from '../auth/session'
import {
  acceptAlternative,
  cancelBooking,
  editNote,
  editReview,
  rescheduleBooking,
  restoreBooking,
  withdrawMove,
  writeReview,
} from './actions'
import { createBooking } from './create'
import { myBooking, stateOf } from './repo'
import { detailOf, summaries } from './view'

const tags = ['bookings']
const detail = { 200: json(bookingDetailSchema), 401: errors[401], 404: errors[404], 409: errors[409] }
const codeAndLang = { params: bookingCodeParamSchema, query: langQuerySchema }

const createRouteDef = createRoute({
  method: 'post',
  path: '/bookings',
  tags,
  summary: 'Send a booking (appointment, table or class)',
  request: { query: langQuerySchema, ...jsonBody(createBookingSchema) },
  responses: {
    201: json(bookingDetailSchema, 'Sent (pending) or confirmed'),
    400: errors[400],
    401: errors[401],
    403: errors[403],
    404: errors[404],
    409: errors[409],
  },
})

const listRoute = createRoute({
  method: 'get',
  path: '/me/bookings',
  tags,
  summary: 'My bookings: upcoming (soonest first) or past (newest first)',
  request: { query: myBookingsQuerySchema },
  responses: { 200: json(bookingListSchema), 401: errors[401] },
})

const detailRoute = createRoute({
  method: 'get',
  path: '/me/bookings/{code}',
  tags,
  summary: 'One of my bookings',
  request: codeAndLang,
  responses: detail,
})

/** `path` stays a literal type, so the RPC client sees each action as its own route. */
const action = <P extends string, B extends z.ZodType>(path: P, summary: string, body: B) =>
  createRoute({ method: 'post', path, tags, summary, request: { ...codeAndLang, ...jsonBody(body) }, responses: detail })

const cancelRoute = action(
  '/me/bookings/{code}/cancel',
  'Cancel (requests any time; confirmed bookings until the cancellation window)',
  cancelBookingSchema,
)
const restoreRoute = createRoute({
  method: 'post',
  path: '/me/bookings/{code}/restore',
  tags,
  summary: '"Yzyna al": undo my cancel for a few minutes',
  request: codeAndLang,
  responses: detail,
})
const rescheduleRoute = action('/me/bookings/{code}/reschedule', 'Ask to move to another time', rescheduleSchema)
const withdrawMoveRoute = createRoute({
  method: 'post',
  path: '/me/bookings/{code}/withdraw-move',
  tags,
  summary: '"Haýyşy yzyna al": withdraw my waiting move; the booking keeps its time',
  request: codeAndLang,
  responses: detail,
})
const alternativeRoute = action('/me/bookings/{code}/accept-alternative', 'Take one of the offered times', acceptAlternativeSchema)
const reviewRoute = action('/me/bookings/{code}/review', 'Review a completed visit', reviewInputSchema)
const noteRoute = createRoute({
  method: 'patch',
  path: '/me/bookings/{code}/note',
  tags,
  summary: 'Edit the note while the request waits',
  request: { ...codeAndLang, ...jsonBody(editNoteSchema) },
  responses: detail,
})
const editReviewRoute = createRoute({
  method: 'patch',
  path: '/me/bookings/{code}/review',
  tags,
  summary: 'Edit my review (7 days)',
  request: { ...codeAndLang, ...jsonBody(reviewInputSchema) },
  responses: detail,
})

export const bookingRoutes = new OpenAPIHono<AppEnv>()
  .openapi(createRouteDef, async (c) => {
    const user = requireUser(c)
    const row = await createBooking(c.var.deps, user, c.req.valid('json'))
    return c.json(await detailOf(c.var.deps, row, c.req.valid('query').lang), 201)
  })
  .openapi(listRoute, async (c) => {
    const user = requireUser(c)
    const { tab, lang, cursor, limit } = c.req.valid('query')
    const now = c.var.deps.now()
    const rows = await c.var.deps.db
      .select()
      .from(bookings)
      .where(and(eq(bookings.userId, user.id), isNull(bookings.rescheduleOf)))
    const upcoming = (s: string) => s === 'pending' || s === 'confirmed'
    const picked = rows
      .filter((r) => upcoming(effectiveStatus(stateOf(r), now).status) === (tab === 'upcoming'))
      .sort((a, b) => {
        const order = a.date.localeCompare(b.date) || a.start - b.start
        return tab === 'upcoming' ? order : -order
      })
    const offset = Number(cursor ?? 0) || 0
    const page = picked.slice(offset, offset + limit)
    return c.json(
      {
        items: await summaries(c.var.deps, page, lang),
        total: picked.length,
        cursor: offset + limit < picked.length ? String(offset + limit) : null,
      },
      200,
    )
  })
  .openapi(detailRoute, async (c) => {
    const user = requireUser(c)
    const row = await myBooking(c.var.deps.db, user.id, c.req.valid('param').code)
    return c.json(await detailOf(c.var.deps, row, c.req.valid('query').lang), 200)
  })
  .openapi(cancelRoute, async (c) => {
    const user = requireUser(c)
    const row = await cancelBooking(
      c.var.deps,
      await myBooking(c.var.deps.db, user.id, c.req.valid('param').code),
      c.req.valid('json').reason,
    )
    return c.json(await detailOf(c.var.deps, row, c.req.valid('query').lang), 200)
  })
  .openapi(withdrawMoveRoute, async (c) => {
    const user = requireUser(c)
    const row = await withdrawMove(c.var.deps, await myBooking(c.var.deps.db, user.id, c.req.valid('param').code))
    return c.json(await detailOf(c.var.deps, row, c.req.valid('query').lang), 200)
  })
  .openapi(restoreRoute, async (c) => {
    const user = requireUser(c)
    const row = await restoreBooking(c.var.deps, await myBooking(c.var.deps.db, user.id, c.req.valid('param').code))
    return c.json(await detailOf(c.var.deps, row, c.req.valid('query').lang), 200)
  })
  .openapi(noteRoute, async (c) => {
    const user = requireUser(c)
    const row = await editNote(c.var.deps, await myBooking(c.var.deps.db, user.id, c.req.valid('param').code), c.req.valid('json').note)
    return c.json(await detailOf(c.var.deps, row, c.req.valid('query').lang), 200)
  })
  .openapi(rescheduleRoute, async (c) => {
    const user = requireUser(c)
    const row = await rescheduleBooking(
      c.var.deps,
      user,
      await myBooking(c.var.deps.db, user.id, c.req.valid('param').code),
      c.req.valid('json'),
    )
    return c.json(await detailOf(c.var.deps, row, c.req.valid('query').lang), 200)
  })
  .openapi(alternativeRoute, async (c) => {
    const user = requireUser(c)
    const { source, index } = c.req.valid('json')
    const row = await acceptAlternative(c.var.deps, user, await myBooking(c.var.deps.db, user.id, c.req.valid('param').code), source, index)
    return c.json(await detailOf(c.var.deps, row, c.req.valid('query').lang), 200)
  })
  .openapi(reviewRoute, async (c) => {
    const user = requireUser(c)
    const row = await myBooking(c.var.deps.db, user.id, c.req.valid('param').code)
    await writeReview(c.var.deps, user, row, c.req.valid('json'))
    return c.json(await detailOf(c.var.deps, row, c.req.valid('query').lang), 200)
  })
  .openapi(editReviewRoute, async (c) => {
    const user = requireUser(c)
    const row = await myBooking(c.var.deps.db, user.id, c.req.valid('param').code)
    await editReview(c.var.deps, row, c.req.valid('json'))
    return c.json(await detailOf(c.var.deps, row, c.req.valid('query').lang), 200)
  })
