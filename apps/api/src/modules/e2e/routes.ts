/**
 * The end-to-end flows' hooks (e2e/; `E2E_HOOKS`, on in CI's stack and a developer's api, refused in production). A
 * flow can't wait half an hour for a request's hold to run out, or a day for a visit to end: the hook lets one
 * booking's time pass and the real jobs do what they would at that moment (`modules/jobs/run.ts`), so what the apps
 * then show is what they show in production. Off, the route doesn't exist (404).
 */
import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi'
import { adminInviteSchema, adminSetupLinkSchema } from '@yeral/contract/admin'
import { DAY_MINUTES, withinHours, type BusinessHours } from '@yeral/domain/hours'
import { NOSHOW_MARK_HOURS } from '@yeral/domain/lifecycle'
import { BOOKING_STATUSES } from '@yeral/domain/model'
import { addDays, epochOf, localOf, QUARTER_HOUR } from '@yeral/domain/time'
import { eq, sql } from 'drizzle-orm'
import type { Db } from '../../db/client'
import { bookingItems, bookings, businesses } from '../../db/schema'
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
    'Test hook (`E2E_HOOKS`): time passes for one booking — a waiting request’s hold ends now and the expiry job runs; a confirmed visit moves to a time that has just ended (inside the no-show window) and the completion job runs',
  request: { params: z.object({ code: z.string() }) },
  responses: { 200: json(z.object({ status: z.enum(BOOKING_STATUSES) })), 404: errors[404], 409: errors[409] },
})

/**
 * How long before now the hook's visit may have ended: a no-show is taken until 24 hours after the end (book B-28), and
 * the flow keeps an hour of it to open the drawer and report.
 */
const ENDED_WITHIN_MIN = NOSHOW_MARK_HOURS * 60 - 60

/** A visit's place in time: its business day and the minute it starts at. */
interface Slot {
  date: string
  start: number
}

/**
 * The visit moved to another day and start, its length kept: its items move by as much (their `span` follows), so
 * every specialist on it stays where the visit is; false when one of them is busy then.
 */
async function moveTo(db: Db, id: string, from: Slot, to: Slot): Promise<boolean> {
  const shift = to.start - from.start
  try {
    await db.transaction(async (tx) => {
      await tx
        .update(bookings)
        .set({ date: to.date, start: sql`${bookings.start} + ${shift}`, end: sql`${bookings.end} + ${shift}` })
        .where(eq(bookings.id, id))
      await tx
        .update(bookingItems)
        .set({ date: to.date, start: sql`${bookingItems.start} + ${shift}`, end: sql`${bookingItems.end} + ${shift}` })
        .where(eq(bookingItems.bookingId, id))
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
 * Where a visit can have just ended: by now, and no earlier than `ENDED_WITHIN_MIN` ago, so a no-show can still be
 * reported, whatever the hour and whatever else its specialist has. Its own time of day first, today or a day or two
 * back (a visit past midnight, book Q-105, ends into the next day); then, should those be busy or too long ago (once
 * the end's time of day has passed, yesterday's is more than a day back), every quarter hour back from now. Inside the
 * business's hours before outside them: the hook mustn't fail on a closed day, but a visit at night reads oddly.
 */
function endedSlots(visit: { start: number; end: number }, hours: BusinessHours, now: number): Slot[] {
  const { date: todayDate, min } = localOf(now)
  const length = visit.end - visit.start
  const endsJustNow = (s: Slot) => {
    const end = epochOf(s.date, s.start + length)
    return end <= now && end >= now - ENDED_WITHIN_MIN * 60_000
  }
  const sameTime = [0, 1, 2].map((back) => ({ date: addDays(todayDate, -back), start: visit.start }))
  const quarters: Slot[] = []
  for (let end = min - (min % QUARTER_HOUR); end >= min - ENDED_WITHIN_MIN; end -= QUARTER_HOUR) {
    // minutes counted from today's start: a negative start is the day before
    const back = Math.ceil(Math.max(0, -(end - length)) / DAY_MINUTES)
    quarters.push({ date: addDays(todayDate, -back), start: end - length + back * DAY_MINUTES })
  }
  const slots = [...sameTime, ...quarters].filter(endsJustNow)
  const inHours = (s: Slot) => withinHours(hours, s.date, { start: s.start, end: s.start + length })
  return [...slots.filter(inHours), ...slots.filter((s) => !inHours(s))]
}

/**
 * A visit that has just ended (`endedSlots`): moved to the first such time its specialists have free, then the
 * completion job takes it.
 */
async function endVisit(deps: Deps, b: { id: string; businessId: string; date: string; start: number; end: number }): Promise<void> {
  const [hours] = await deps.db
    .select({ hours: businesses.hours, exceptions: businesses.exceptions })
    .from(businesses)
    .where(eq(businesses.id, b.businessId))
  let at: Slot = { date: b.date, start: b.start }
  for (const slot of endedSlots(b, hours!, deps.now())) {
    if (!(await moveTo(deps.db, b.id, at, slot))) continue
    at = slot
    await completeVisits(deps)
    if ((await statusOf(deps.db, b.id)) !== 'confirmed') return
  }
  throw new ApiError('invalid_status', { hoursTried: ENDED_WITHIN_MIN / 60 }, 'no time that has just ended had the visit’s specialist free')
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
