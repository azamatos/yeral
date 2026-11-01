/**
 * The end-to-end flows' hooks (e2e/; `E2E_HOOKS`, on in CI's stack and a developer's api, refused in production). A
 * flow can't wait half an hour for a request's hold to run out, or a day for a visit to end: the hook lets one
 * booking's time pass and the real jobs do what they would at that moment (`modules/jobs/run.ts`), so what the apps
 * then show is what they show in production. Off, the route doesn't exist (404).
 */
import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi'
import { adminInviteSchema, adminSetupLinkSchema } from '@yeral/contract/admin'
import { BOOKING_STATUSES } from '@yeral/domain/model'
import { addDays, today } from '@yeral/domain/time'
import { eq } from 'drizzle-orm'
import type { Db } from '../../db/client'
import { bookingItems, bookings } from '../../db/schema'
import type { Deps } from '../../deps'
import type { AppEnv } from '../../http/env'
import { ApiError } from '../../http/errors'
import { errors, json, jsonBody } from '../../http/openapi'
import { inviteAdmin } from '../admin/accounts'
import { isSlotConflict } from '../bookings/repo'
import { completeVisits, expireRequests } from '../jobs/run'

const elapseRoute = createRoute({
  method: 'post',
  path: '/e2e/bookings/{code}/elapse',
  // a test hook has no place in the public OpenAPI document (`/openapi.json`)
  hide: true,
  tags: ['e2e'],
  summary:
    'Test hook (`E2E_HOOKS`): time passes for one booking — a waiting request’s hold ends now and the expiry job runs; a confirmed visit moves to the latest day it has ended by now and the completion job runs',
  request: { params: z.object({ code: z.string() }) },
  responses: { 200: json(z.object({ status: z.enum(BOOKING_STATUSES) })), 404: errors[404], 409: errors[409] },
})

/** How many days back a visit may go to find its specialist free: the seed's days are never full that long. */
const DAYS_BACK = 7

/** The visit on another day, the same time (the items' `span` follows `date`); false when its specialist is busy then. */
async function moveTo(db: Db, id: string, date: string): Promise<boolean> {
  try {
    await db.transaction(async (tx) => {
      await tx.update(bookings).set({ date }).where(eq(bookings.id, id))
      await tx.update(bookingItems).set({ date }).where(eq(bookingItems.bookingId, id))
    })
    return true
  } catch (e) {
    if (isSlotConflict(e)) return false
    throw e
  }
}

const statusOf = async (db: Db, id: string) =>
  (await db.select({ status: bookings.status }).from(bookings).where(eq(bookings.id, id)))[0]!.status

/**
 * A visit that has ended: the same time on the latest day that makes it so, where its specialist's day has room and
 * the completion job then takes it. Counted back from today or the visit's own day, whichever is earlier: a visit
 * booked days ahead stepped back from its own day would still be ahead. Today comes first: a visit whose time of day
 * has passed ended just now, and one a day back could be past the 24 hours a no-show may be reported in (book B-28).
 * One day back isn't always enough (a visit past midnight, book Q-105, ends into the next day), so the job runs after
 * each step until it did.
 */
async function endVisit(deps: Deps, b: { id: string; date: string }): Promise<void> {
  const todayDate = today(deps.now())
  const from = b.date < todayDate ? b.date : todayDate
  for (let back = 0; back <= DAYS_BACK; back++) {
    if (!(await moveTo(deps.db, b.id, addDays(from, -back)))) continue
    await completeVisits(deps)
    if ((await statusOf(deps.db, b.id)) !== 'confirmed') return
  }
  throw new ApiError(
    'invalid_status',
    { daysTried: DAYS_BACK },
    'no earlier day ended the visit: its specialist is busy at that time, or its end is still ahead',
  )
}

const adminInviteRoute = createRoute({
  method: 'post',
  path: '/e2e/admin-invite',
  hide: true,
  tags: ['e2e'],
  summary: 'Test hook (`E2E_HOOKS`): a new team account and its setup link, as the server command makes them',
  request: jsonBody(adminInviteSchema),
  responses: { 200: json(adminSetupLinkSchema), 404: errors[404], 409: errors[409] },
})

export const e2eRoutes = new OpenAPIHono<AppEnv>()
  .openapi(elapseRoute, async (c) => {
    const { deps } = c.var
    if (!deps.e2eHooks) throw new ApiError('not_found')
    const { code } = c.req.valid('param')
    const [b] = await deps.db.select().from(bookings).where(eq(bookings.code, code))
    if (!b) throw new ApiError('not_found')
    if (b.status === 'pending') {
      await deps.db
        .update(bookings)
        .set({ holdUntil: new Date(deps.now()) })
        .where(eq(bookings.id, b.id))
      await expireRequests(deps)
    } else if (b.status === 'confirmed') {
      // moving a class or table booking's day would part it from its session or table: the flows book appointments
      if (b.type !== 'appointment') throw new ApiError('invalid_status', { type: b.type }, 'only an appointment can end here')
      await endVisit(deps, b)
    } else throw new ApiError('invalid_status')
    return c.json({ status: await statusOf(deps.db, b.id) }, 200)
  })
  .openapi(adminInviteRoute, async (c) => {
    const { deps } = c.var
    if (!deps.e2eHooks) throw new ApiError('not_found')
    return c.json(await inviteAdmin(deps, null, c.req.valid('json')), 200)
  })
