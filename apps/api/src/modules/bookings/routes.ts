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
  howWasItSchema,
  myBookingsQuerySchema,
  rescheduleSchema,
  reviewInputSchema,
} from '@yeral/contract/bookings'
import { langQuerySchema } from '@yeral/contract/common'
import { asksHowItWas, effectiveStatus } from '@yeral/domain/lifecycle'
import { addDays, epochOf, today } from '@yeral/domain/time'
import { and, eq, gte, inArray, isNull } from 'drizzle-orm'
import { bookings, reviews } from '../../db/schema'
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
import { withOffersAhead } from './offers'
import { myBooking, stateOf, type BookingRow } from './repo'
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
  summary: 'My bookings: upcoming (requests with an offered time ahead first, then soonest first) or past (newest first)',
  request: { query: myBookingsQuerySchema },
  responses: { 200: json(bookingListSchema), 401: errors[401] },
})

const howWasItRoute = createRoute({
  method: 'get',
  path: '/me/how-was-it',
  tags,
  summary: '"How was it?": the latest completed visit still open to a review, without one, its card not closed (book F-243)',
  request: { query: langQuerySchema },
  responses: { 200: json(howWasItSchema), 401: errors[401] },
})
const closeHowWasItRoute = createRoute({
  method: 'post',
  path: '/me/bookings/{code}/how-was-it/close',
  tags,
  summary: '"How was it?" closed for good for this visit (book F-243)',
  request: { params: bookingCodeParamSchema },
  responses: { 204: { description: 'Closed' }, 401: errors[401], 404: errors[404] },
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
  .openapi(howWasItRoute, async (c) => {
    const user = requireUser(c)
    const { deps } = c.var
    const now = deps.now()
    // the visits that ended in the last 30 days (the review window; one past midnight ends a day later)
    const rows = await deps.db
      .select({ b: bookings, reviewed: reviews.id })
      .from(bookings)
      .leftJoin(reviews, eq(reviews.bookingId, bookings.id))
      .where(
        and(
          eq(bookings.userId, user.id),
          inArray(bookings.status, ['confirmed', 'completed']),
          isNull(bookings.rescheduleOf),
          gte(bookings.date, addDays(today(now), -32)),
        ),
      )
    const asked = rows
      .filter((r) => asksHowItWas(stateOf(r.b), !!r.reviewed, !!r.b.howWasItClosedAt, now))
      .sort((x, y) => epochOf(y.b.date, y.b.end) - epochOf(x.b.date, x.b.end))[0]
    const [visit] = asked ? await summaries(deps, [asked.b], c.req.valid('query').lang) : []
    return c.json({ visit: visit ?? null }, 200)
  })
  .openapi(closeHowWasItRoute, async (c) => {
    const user = requireUser(c)
    const row = await myBooking(c.var.deps.db, user.id, c.req.valid('param').code)
    await c.var.deps.db
      .update(bookings)
      .set({ howWasItClosedAt: new Date(c.var.deps.now()) })
      .where(and(eq(bookings.id, row.id), isNull(bookings.howWasItClosedAt)))
    return c.body(null, 204)
  })
  .openapi(listRoute, async (c) => {
    const user = requireUser(c)
    const { tab, lang, cursor, limit } = c.req.valid('query')
    const now = c.var.deps.now()
    const rows = await c.var.deps.db
      .select()
      .from(bookings)
      .where(and(eq(bookings.userId, user.id), isNull(bookings.rescheduleOf)))
    // a declined or expired request with an offered time ahead stays on top of upcoming, soonest offer first (book C-40)
    const offers = await withOffersAhead(c.var.deps.db, rows, user.phone, now)
    const upcoming = (r: BookingRow) =>
      offers.has(r.id) ||
      ['pending', 'confirmed'].includes(effectiveStatus(stateOf(r), now).status) ||
      // a request that just ran out keeps its place until the jobs record it with its times
      (r.status === 'pending' && r.holdUntil !== null)
    const top = (r: BookingRow) => offers.get(r.id) ?? Infinity
    const picked = rows
      .filter((r) => upcoming(r) === (tab === 'upcoming'))
      .sort((a, b) => {
        if (tab === 'upcoming' && top(a) !== top(b)) return top(a) < top(b) ? -1 : 1
        // the code breaks ties, so a page always holds the same bookings
        const order = a.date.localeCompare(b.date) || a.start - b.start || a.code.localeCompare(b.code)
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
