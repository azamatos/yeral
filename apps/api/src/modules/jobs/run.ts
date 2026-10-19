/**
 * `runDueJobs(deps)` every minute (ADR 0005), from the jobs tick in the Node process.
 * 1. Requests whose hold time ran out → cancelled by the system, with 3 alternative times and an SMS.
 * 2. Confirmed visits that ended → completed.
 * 3. Queued work: SMS, reminders, review asks, demo businesses answering.
 */
import { DAY_MINUTES } from '@yeral/domain/hours'
import { effectiveStatus, MAX_ALTERNATIVES } from '@yeral/domain/lifecycle'
import { MARKET } from '@yeral/domain/market'
import { nearestSlots, nextFreeSlot, slotStaffId, staffDoingAll, type AppointmentSlot } from '@yeral/domain/availability'
import { addDays, localOf } from '@yeral/domain/time'
import { and, asc, eq, isNull, lt, lte, or } from 'drizzle-orm'
import { bookings, businesses, clients, jobs, users, type TimeSlot } from '../../db/schema'
import type { Deps } from '../../deps'
import { bookingSmsText, emit, expiredSmsText, moveRefusedSmsText, queueSms, smsCityOf, type BookingSmsKind } from '../../notify'
import { appointmentContext, loadBusinesses, loadBusy } from '../availability/context'
import { confirmBooking } from '../bookings/confirm'
import { bookedServices } from '../bookings/create'
import { setStatus, StaleBooking, stateOf, type BookingRow } from '../bookings/repo'

const BATCH = 100
const MAX_ATTEMPTS = 5

/**
 * Up to three free times for the same services after an expired request: that day first, then the next free days.
 * Each names one specialist who does every service (book Q-159); at the same start the one asked for comes first.
 * Services nobody does alone keep being split between people, and those times name nobody.
 */
async function alternativesFor(deps: Deps, b: BookingRow): Promise<TimeSlot[]> {
  if (b.type !== 'appointment') return []
  const lb = (await loadBusinesses(deps.db, [b.businessId])).get(b.businessId)
  if (!lb) return []
  const booked = await bookedServices(deps.db, b.id)
  if (!booked.serviceIds.length) return []
  const now = deps.now()
  const from = localOf(now).date
  const ctx = appointmentContext(lb, await loadBusy(deps.db, [b.businessId], from, addDays(from, lb.rules.windowDays)), now)
  const q = {
    serviceIds: booked.serviceIds,
    staffId: null,
    by: 'client' as const,
    oneSpecialist: staffDoingAll(ctx, booked.serviceIds).length > 0,
    preferStaffId: booked.staffId,
    // still pending while this runs: its own time mustn't count as busy
    excludeBookingIds: [b.id],
  }
  const offer = (date: string, s: AppointmentSlot): TimeSlot => ({ date, start: s.start, end: s.end, staffId: slotStaffId(s) })
  const out = nearestSlots(ctx, { ...q, date: b.date }, b.start, MAX_ALTERNATIVES).map((s) => offer(b.date, s))
  // the days after the request's own (strict: never back to it, even when it was last night's)
  for (let day = addDays(b.date, 1); out.length < MAX_ALTERNATIVES;) {
    const next = nextFreeSlot(ctx, q, day, lb.rules.windowDays, { strict: true })
    if (!next) break
    out.push(offer(next.date, next.slot))
    day = addDays(next.date, 1)
  }
  return out.slice(0, MAX_ALTERNATIVES)
}

async function expireRequests(deps: Deps): Promise<number> {
  const now = new Date(deps.now())
  const due = await deps.db
    .select()
    .from(bookings)
    .where(and(eq(bookings.status, 'pending'), lte(bookings.holdUntil, now)))
    .limit(BATCH)
  for (const b of due) {
    // a move request that wasn't answered just lapses: the booking it would move stays as it was
    const alternatives = b.rescheduleOf ? [] : await alternativesFor(deps, b)
    // answered meanwhile: setStatus refuses, nothing is sent
    await skipStale(
      deps.db.transaction(async (tx) => {
        const row = await setStatus(tx, b, { status: 'cancelled', cancelledBy: 'system', at: now })
        await tx.update(bookings).set({ expiredAlternatives: alternatives }).where(eq(bookings.id, row.id))
        await emit(tx, {
          type: 'booking.expired',
          businessId: row.businessId,
          bookingId: row.id,
          bookingCode: row.code,
          userId: row.userId,
        })
        // a lapsed move: the booking it would move keeps its time, says so, and the client hears so (book Q-289);
        // a booking that ended or went meanwhile hears nothing
        const [original] = b.rescheduleOf ? await tx.select().from(bookings).where(eq(bookings.id, b.rescheduleOf)) : []
        const live = original && effectiveStatus(stateOf(original), now.getTime()).status === 'confirmed'
        if (original && live) {
          await tx
            .update(bookings)
            .set({ moveRefused: { date: row.date, start: row.start, end: row.end, by: 'system', reason: null, text: null } })
            .where(eq(bookings.id, original.id))
        }
        const told = b.rescheduleOf ? (live ? original : undefined) : row
        const [biz] = told?.clientPhone ? await tx.select().from(businesses).where(eq(businesses.id, row.businessId)) : []
        if (told?.clientPhone && biz) {
          const [user] = told.userId ? await tx.select().from(users).where(eq(users.id, told.userId)) : []
          const lang = user?.lang ?? MARKET.defaultLanguage
          const sms = { code: told.code, date: told.date, start: told.start, businessName: biz.name, address: biz.address }
          await queueSms(tx, {
            to: told.clientPhone,
            text: b.rescheduleOf ? moveRefusedSmsText(deps.site, lang, sms) : expiredSmsText(deps.site, lang, sms, alternatives),
            runAt: now,
            dedupeKey: `${b.rescheduleOf ? 'moveRefused' : 'expired'}:${row.id}`,
          })
        }
      }),
    )
  }
  return due.length
}

async function skipStale(work: Promise<unknown>): Promise<void> {
  try {
    await work
  } catch (e) {
    if (!(e instanceof StaleBooking)) throw e
  }
}

async function completeVisits(deps: Deps): Promise<number> {
  const { date, min } = localOf(deps.now())
  // a visit ends at minute `end` of its business day, which may run past midnight (book Q-105): yesterday's day is
  // done only once its end, counted into today (end − 1440), has passed
  const yesterday = addDays(date, -1)
  const due = await deps.db
    .select()
    .from(bookings)
    .where(
      and(
        eq(bookings.status, 'confirmed'),
        or(
          lt(bookings.date, yesterday),
          and(eq(bookings.date, yesterday), lte(bookings.end, min + DAY_MINUTES)),
          and(eq(bookings.date, date), lte(bookings.end, min)),
        ),
      ),
    )
    .limit(BATCH)
  for (const b of due) {
    await skipStale(
      deps.db.transaction(async (tx) => {
        const row = await setStatus(tx, b, { status: 'completed', at: new Date(deps.now()) })
        await emit(tx, {
          type: 'booking.completed',
          businessId: row.businessId,
          bookingId: row.id,
          bookingCode: row.code,
          userId: row.userId,
        })
      }),
    )
  }
  return due.length
}

/**
 * A booking SMS, if the booking is still in the right state, still at the time the SMS was planned for (`at`; older
 * jobs have none), and the client wants it.
 */
async function sendBookingSms(
  deps: Deps,
  bookingId: string,
  kind: BookingSmsKind,
  at: { date?: unknown; start?: unknown; covers?: unknown },
): Promise<void> {
  const [b] = await deps.db.select().from(bookings).where(eq(bookings.id, bookingId))
  if (!b?.clientPhone) return
  if (at.date !== undefined && (at.date !== b.date || at.start !== b.start)) return
  const wanted = kind === 'reviewAsk' ? b.status === 'completed' || b.status === 'confirmed' : b.status === 'confirmed'
  if (!wanted) return
  const [user] = b.userId ? await deps.db.select().from(users).where(eq(users.id, b.userId)) : []
  const [client] = b.clientId ? await deps.db.select().from(clients).where(eq(clients.id, b.clientId)) : []
  if (client?.noRemindersSms && kind !== 'confirmed') return
  if (user) {
    const prefs = {
      confirmed: user.notifyConfirmation,
      reminderDay: user.notifyReminderDay,
      reminder2h: user.notifyReminder2h,
      reviewAsk: user.notifyReviewAsk,
    }
    // a reminder moved out of the night goes if one of the reminders it stands for is wanted
    const covers = Array.isArray(at.covers) ? (at.covers as (keyof typeof prefs)[]) : []
    const wantedByPrefs = kind === 'reminderEvening' ? covers.some((k) => prefs[k]) : prefs[kind]
    if (!wantedByPrefs) return
  }
  const [biz] = await deps.db.select().from(businesses).where(eq(businesses.id, b.businessId))
  if (!biz) return
  const lang = user?.lang ?? MARKET.defaultLanguage
  const text = bookingSmsText(deps.site, lang, kind, {
    code: b.code,
    date: b.date,
    start: b.start,
    businessName: biz.name,
    address: biz.address,
    city: await smsCityOf(deps.db, biz.cityId, lang),
  })
  await deps.sms.send({ to: b.clientPhone, text })
}

async function runQueue(deps: Deps): Promise<number> {
  const now = new Date(deps.now())
  // claim a batch: other runners skip locked rows
  const claimed = await deps.db.transaction(async (tx) => {
    const rows = await tx
      .select()
      .from(jobs)
      .where(and(isNull(jobs.doneAt), lte(jobs.runAt, now), or(isNull(jobs.lockedUntil), lt(jobs.lockedUntil, now))))
      .orderBy(asc(jobs.runAt))
      .limit(BATCH)
      .for('update', { skipLocked: true })
    for (const j of rows)
      await tx
        .update(jobs)
        .set({ lockedUntil: new Date(now.getTime() + 60_000) })
        .where(eq(jobs.id, j.id))
    return rows
  })
  for (const job of claimed) {
    try {
      const p = job.payload
      if (job.kind === 'sms') await deps.sms.send({ to: String(p.to), text: String(p.text) })
      else if (job.kind === 'booking.sms') await sendBookingSms(deps, String(p.bookingId), p.kind as BookingSmsKind, p)
      else if (job.kind === 'demo.answer') {
        const [b] = await deps.db
          .select()
          .from(bookings)
          .where(eq(bookings.id, String(p.bookingId)))
        if (b?.status === 'pending' && (b.holdUntil?.getTime() ?? 0) > deps.now())
          await skipStale(deps.db.transaction((tx) => confirmBooking(tx, deps, b)))
      }
      await deps.db
        .update(jobs)
        .set({ doneAt: new Date(deps.now()), lockedUntil: null, error: null })
        .where(eq(jobs.id, job.id))
    } catch (e) {
      const attempts = job.attempts + 1
      deps.log.warn('job failed', { id: job.id, kind: job.kind, attempts, error: String(e) })
      await deps.db
        .update(jobs)
        .set({
          attempts,
          lockedUntil: null,
          error: String(e).slice(0, 500),
          // back off 1, 2, 4, 8 minutes; then give up (kept for inspection)
          ...(attempts >= MAX_ATTEMPTS ? { doneAt: new Date(deps.now()) } : { runAt: new Date(deps.now() + 2 ** (attempts - 1) * 60_000) }),
        })
        .where(eq(jobs.id, job.id))
    }
  }
  return claimed.length
}

export async function runDueJobs(deps: Deps): Promise<{ expired: number; completed: number; jobs: number }> {
  const expired = await expireRequests(deps)
  const completed = await completeVisits(deps)
  const ran = await runQueue(deps)
  return { expired, completed, jobs: ran }
}
