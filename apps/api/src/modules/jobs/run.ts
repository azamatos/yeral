/**
 * `runDueJobs(deps)` every minute (ADR 0005), from the jobs tick in the Node process.
 * 1. Requests whose hold time ran out → cancelled by the system, with 3 alternative times and an SMS.
 * 2. Confirmed visits that ended → completed.
 * 3. Queued work: SMS, reminders, review asks, demo businesses answering.
 */
import { DAY_MINUTES } from '@yeral/domain/hours'
import { MAX_ALTERNATIVES } from '@yeral/domain/lifecycle'
import { MARKET } from '@yeral/domain/market'
import { nearestSlots, nextFreeSlot, slotStaffId, staffDoingAll, type AppointmentSlot } from '@yeral/domain/availability'
import { addDays, epochOf, localOf } from '@yeral/domain/time'
import { and, asc, eq, isNull, lt, lte, or } from 'drizzle-orm'
import { bookings, businesses, clients, jobs, users, type TimeSlot } from '../../db/schema'
import type { Deps } from '../../deps'
import { bookingSmsText, emit, expiredSmsText, moveRefusedSmsText, smsCityOf, type BookingSmsKind } from '../../notify'
import { appointmentContext, loadBusinesses, loadBusy } from '../availability/context'
import { confirmBooking } from '../bookings/confirm'
import { newBookingLink, pruneBookingLinks } from '../bookings/links'
import { hideLinkTokens } from '../../ports/sms'
import { bookedServices, onlineRefusal } from '../bookings/create'
import { recordMoveRefused, setStatus, StaleBooking, type BookingRow } from '../bookings/repo'

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
        // a move: its booking's lock first, as every client path takes them (no deadlock with a cancel or a new move)
        const [original] = b.rescheduleOf ? await tx.select().from(bookings).where(eq(bookings.id, b.rescheduleOf)).for('update') : []
        const row = await setStatus(tx, b, { status: 'cancelled', cancelledBy: 'system', at: now })
        await tx.update(bookings).set({ expiredAlternatives: alternatives }).where(eq(bookings.id, row.id))
        await emit(tx, {
          type: 'booking.expired',
          businessId: row.businessId,
          bookingId: row.id,
          bookingCode: row.code,
          userId: row.userId,
        })
        // a lapsed move: the booking it would move keeps its time and says so; the client hears so while the visit is
        // still ahead (book Q-289), checked now, not when the batch began
        const lapsedAt = b.holdUntil?.getTime() ?? now.getTime()
        const recorded = !!original && (await recordMoveRefused(tx, original, row, { by: 'system', reason: null, text: null }, lapsedAt))
        const ahead = !!original && deps.now() < epochOf(original.date, original.start)
        const told = b.rescheduleOf ? (recorded && ahead ? original : undefined) : row
        // the text and its link are made when it's sent: no stored row holds a working link
        if (told?.clientPhone) {
          const kind: OutcomeSmsKind = b.rescheduleOf ? 'moveRefused' : 'expired'
          await tx
            .insert(jobs)
            .values({
              kind: 'booking.sms',
              runAt: now,
              payload: { bookingId: told.id, kind, date: told.date, start: told.start },
              dedupeKey: `${kind}:${row.id}`,
            })
            .onConflictDoNothing({ target: jobs.dedupeKey })
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

/** The SMS about an outcome the client didn't choose: they always go (book Q-286, Q-289). */
type OutcomeSmsKind = 'expired' | 'moveRefused'

/**
 * Send with a link of its own. A failed send keeps its link: the gateway may have delivered it anyway, and an unsent
 * token is known to nobody (only its hash is stored); it's pruned when it expires.
 */
async function sendWithLink(deps: Deps, b: BookingRow, to: string, text: (link: string) => string): Promise<void> {
  const link = await newBookingLink(deps.db, deps.site, b, to, deps.now())
  try {
    await deps.sms.send({ to, text: text(link.url) })
  } catch (e) {
    // a gateway may echo the text back, escaped or encoded any way; the token's characters survive them all, so it
    // goes from the error itself before anything keeps or logs it; the original error, token and all, isn't kept
    // eslint-disable-next-line preserve-caught-error -- a cause would carry the token along
    throw new Error(String(e).split(link.token).join('…'))
  }
}

/** An expired request's times, or a move not accepted while the visit is still ahead; the client can't switch these off. */
async function sendOutcomeSms(deps: Deps, b: BookingRow, kind: OutcomeSmsKind): Promise<void> {
  const still =
    kind === 'expired'
      ? b.status === 'cancelled' && b.cancelledBy === 'system'
      : b.status === 'confirmed' && !!b.moveRefused && deps.now() < epochOf(b.date, b.start)
  if (!still) return
  const lb = (await loadBusinesses(deps.db, [b.businessId])).get(b.businessId)
  if (!lb) return
  const biz = lb.business
  const [user] = b.userId ? await deps.db.select().from(users).where(eq(users.id, b.userId)) : []
  const lang = user?.lang ?? MARKET.defaultLanguage
  const sms = { date: b.date, start: b.start, businessName: biz.name, address: biz.address }
  const to = user?.phone ?? b.clientPhone ?? ''
  // a paused business or a phone-only client: the page offers the call card, so the text asks them to call (Q-154)
  const byPhone = !!(await onlineRefusal(deps.db, lb, to))
  await sendWithLink(deps, b, to, (link) =>
    kind === 'expired'
      ? expiredSmsText(lang, { ...sms, link }, byPhone ? [] : b.expiredAlternatives, { byPhone })
      : moveRefusedSmsText(lang, { ...sms, link }),
  )
}

/**
 * A booking SMS, if the booking is still in the right state, still at the time the SMS was planned for (`at`; older
 * jobs have none), and the client wants it.
 */
async function sendBookingSms(
  deps: Deps,
  bookingId: string,
  kind: BookingSmsKind | OutcomeSmsKind | 'reviewAsk',
  at: { date?: unknown; start?: unknown; covers?: unknown },
): Promise<void> {
  const [b] = await deps.db.select().from(bookings).where(eq(bookings.id, bookingId))
  // the person deleted their account: the number may be someone else's now
  if (!b?.clientPhone || b.accountDeletedAt) return
  if (at.date !== undefined && (at.date !== b.date || at.start !== b.start)) return
  if (kind === 'expired' || kind === 'moveRefused') return sendOutcomeSms(deps, b, kind)
  // review asks queued before they went (book Q-259) are dropped
  if (kind === 'reviewAsk' || b.status !== 'confirmed') return
  const [user] = b.userId ? await deps.db.select().from(users).where(eq(users.id, b.userId)) : []
  const [client] = b.clientId ? await deps.db.select().from(clients).where(eq(clients.id, b.clientId)) : []
  if (client?.noRemindersSms && kind !== 'confirmed') return
  if (user) {
    const prefs = {
      confirmed: user.notifyConfirmation,
      reminderDay: user.notifyReminderDay,
      reminder2h: user.notifyReminder2h,
    }
    // a reminder moved out of the night goes if one of the reminders it stands for is wanted
    const covers = Array.isArray(at.covers) ? (at.covers as (keyof typeof prefs)[]) : []
    const wantedByPrefs = kind === 'reminderEvening' ? covers.some((k) => prefs[k]) : prefs[kind]
    if (!wantedByPrefs) return
  }
  const [biz] = await deps.db.select().from(businesses).where(eq(businesses.id, b.businessId))
  if (!biz) return
  const lang = user?.lang ?? MARKET.defaultLanguage
  const sms = {
    date: b.date,
    start: b.start,
    businessName: biz.name,
    address: biz.address,
    city: await smsCityOf(deps.db, biz.cityId, lang),
  }
  // the texts with a link get one of their own (book Q-168)
  // the person's phone now: a changed number gets them, the old one nothing more (book Q-171)
  const to = user?.phone ?? b.clientPhone
  if (kind === 'confirmed') await sendWithLink(deps, b, to, (link) => bookingSmsText(lang, kind, { ...sms, link }))
  else await deps.sms.send({ to, text: bookingSmsText(lang, kind, sms) })
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
      else if (job.kind === 'booking.sms')
        await sendBookingSms(deps, String(p.bookingId), p.kind as BookingSmsKind | OutcomeSmsKind | 'reviewAsk', p)
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
      // a gateway may echo the text back: no error kept or logged holds a link's token
      const error = hideLinkTokens(String(e))
      deps.log.warn('job failed', { id: job.id, kind: job.kind, attempts, error })
      await deps.db
        .update(jobs)
        .set({
          attempts,
          lockedUntil: null,
          error: error.slice(0, 500),
          // back off 1, 2, 4, 8 minutes; then give up (kept for inspection)
          ...(attempts >= MAX_ATTEMPTS ? { doneAt: new Date(deps.now()) } : { runAt: new Date(deps.now() + 2 ** (attempts - 1) * 60_000) }),
        })
        .where(eq(jobs.id, job.id))
    }
  }
  return claimed.length
}

export async function runDueJobs(deps: Deps): Promise<{ expired: number; completed: number; jobs: number }> {
  await pruneBookingLinks(deps.db, deps.now())
  const expired = await expireRequests(deps)
  const completed = await completeVisits(deps)
  const ran = await runQueue(deps)
  return { expired, completed, jobs: ran }
}
