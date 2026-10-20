/**
 * `runDueJobs(deps)` every minute (ADR 0005), from the jobs tick in the Node process.
 * 1. Requests whose hold time ran out → cancelled by the system, with 3 alternative times and an SMS.
 * 2. Confirmed visits that ended → completed.
 * 3. Queued work: SMS, reminders, demo businesses answering.
 */
import { DAY_MINUTES } from '@yeral/domain/hours'
import { REMINDER_KINDS } from '@yeral/domain/lifecycle'
import { MARKET } from '@yeral/domain/market'
import { isMobile } from '@yeral/domain/phone'
import { addDays, epochOf, localOf } from '@yeral/domain/time'
import { and, asc, eq, isNull, lt, lte, or } from 'drizzle-orm'
import { bookings, businesses, clients, jobs, users } from '../../db/schema'
import type { Deps } from '../../deps'
import {
  bookingSmsText,
  businessCancelText,
  cancelledOffersSmsText,
  declinedSmsText,
  emit,
  expiredSmsText,
  LINKED_SMS,
  moveRefusedSmsText,
  queueOutcomeSms,
  smsCityOf,
  type BookingSmsKind,
  type OutcomeSmsKind,
} from '../../notify'
import { loadBusinesses } from '../availability/context'
import { freeAlternatives } from '../bookings/offers'
import { confirmBooking } from '../bookings/confirm'
import { pruneIdentityChecks } from '../auth/identity'
import { newBookingLink, pruneBookingLinks } from '../bookings/links'
import { hideLinkTokens } from '../../ports/sms'
import { onlineRefusal } from '../clients/online'
import { itemsOf, recordMoveRefused, setStatus, StaleBooking, type BookingRow } from '../bookings/repo'

const BATCH = 100
/**
 * How a review ask is settled unsent (book Q-259), here and in migration 0016: done, never tried (attempts 0), so a
 * count of failed SMS (attempts reached) leaves it out.
 */
const DROPPED_REVIEW_ASK = 'dropped: no review asks (book Q-259)'
/** A reminder whose try comes once the visit has started tells the client nothing (book Q-284): settled unsent. */
const DROPPED_STARTED = 'dropped: the visit has started (book Q-284)'
const REMINDERS: ReadonlySet<string> = new Set(REMINDER_KINDS)
/** SMS go to mobile numbers only (ROUND6 C1): a client the team saved with a landline gets none. */
const DROPPED_NOT_MOBILE = 'dropped: not a mobile number (ROUND6 C1)'
const MAX_ATTEMPTS = 5

async function expireRequests(deps: Deps): Promise<number> {
  const now = new Date(deps.now())
  const due = await deps.db
    .select()
    .from(bookings)
    .where(and(eq(bookings.status, 'pending'), lte(bookings.holdUntil, now)))
    .limit(BATCH)
  for (const b of due) {
    // a move request that wasn't answered just lapses: the booking it would move stays as it was
    const alternatives = b.rescheduleOf ? [] : await freeAlternatives(deps.db, b, deps.now())
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
        if (told?.clientPhone) await queueOutcomeSms(tx, b.rescheduleOf ? 'moveRefused' : 'expired', told, row.id, now)
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

/** An expired request's times, a declined request's reason, or a move not accepted while the visit is still ahead; the client can't switch these off. */
async function sendOutcomeSms(deps: Deps, b: BookingRow, kind: OutcomeSmsKind): Promise<void> {
  const still =
    kind === 'expired'
      ? b.status === 'cancelled' && b.cancelledBy === 'system'
      : kind === 'declined'
        ? b.status === 'cancelled' && b.cancelledBy === 'business' && !!b.declineReason
        : kind === 'cancelledOffers'
          ? b.status === 'cancelled' && (b.businessCancelReason === 'closed' || b.businessCancelReason === 'hours')
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
      : kind === 'cancelledOffers'
        ? // offered times can be taken whatever the client's online status (A7), as after a decline
          cancelledOffersSmsText(
            lang,
            { ...sms, link },
            businessCancelText(lang, b.businessCancelReason!, b.cancelReason),
            b.declineAlternatives,
            {
              byPhone: byPhone && !b.declineAlternatives.length,
            },
          )
        : kind === 'declined'
          ? // offered times can be taken whatever the client's online status (A7); with none, they call
            declinedSmsText(lang, { ...sms, link }, b.declineReason!, b.declineText, { byPhone: byPhone && !b.declineAlternatives.length })
          : moveRefusedSmsText(
              lang,
              { ...sms, link },
              b.moveRefused?.by === 'business' && b.moveRefused.reason
                ? { reason: b.moveRefused.reason, text: b.moveRefused.text }
                : undefined,
            ),
  )
}

/**
 * A booking SMS, if the booking is still in the right state, still at the time the SMS was planned for (`at`; older
 * jobs have none), and the client wants it. Says why when it settles a reminder unsent that the job should record.
 */
async function sendBookingSms(
  deps: Deps,
  bookingId: string,
  kind: BookingSmsKind | OutcomeSmsKind,
  at: { date?: unknown; start?: unknown; covers?: unknown },
): Promise<string | undefined> {
  const [b] = await deps.db.select().from(bookings).where(eq(bookings.id, bookingId))
  // the person deleted their account: the number may be someone else's now
  if (!b?.clientPhone || b.accountDeletedAt) return
  if (at.date !== undefined && (at.date !== b.date || at.start !== b.start)) return
  // an account's phone took a sign-in code, so it's a mobile; a number the team typed in may not be
  if (!b.userId && !isMobile(b.clientPhone)) return DROPPED_NOT_MOBILE
  if (kind === 'expired' || kind === 'moveRefused' || kind === 'declined' || kind === 'cancelledOffers') {
    await sendOutcomeSms(deps, b, kind)
    return
  }
  // a business's cancel goes while the booking stays cancelled by it ("Yzyna al" by the client can't undo those)
  if (kind === 'cancelled' || kind === 'cancelledAsAsked') {
    if (b.status !== 'cancelled' || !b.businessCancelReason) return
  } else if (b.status !== 'confirmed') return
  // a retried reminder can't arrive after the start (book Q-284)
  if (REMINDERS.has(kind) && deps.now() >= epochOf(b.date, b.start)) return DROPPED_STARTED
  const [user] = b.userId ? await deps.db.select().from(users).where(eq(users.id, b.userId)) : []
  const [client] = b.clientId ? await deps.db.select().from(clients).where(eq(clients.id, b.clientId)) : []
  if (client?.noRemindersSms && REMINDERS.has(kind)) return
  if (user) {
    const prefs = {
      // "Confirmations and changes": confirmations, moves and the business's cancels (book Q-286)
      confirmed: user.notifyConfirmation,
      booked: user.notifyConfirmation,
      moved: user.notifyConfirmation,
      staffChanged: user.notifyConfirmation,
      cancelled: user.notifyConfirmation,
      cancelledAsAsked: user.notifyConfirmation,
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
    reason: b.businessCancelReason ? businessCancelText(lang, b.businessCancelReason, b.cancelReason) : undefined,
    staff:
      kind === 'staffChanged'
        ? [...new Set((await itemsOf(deps.db, b.id)).flatMap((i) => (i.staffName ? [i.staffName] : [])))].join(', ')
        : undefined,
  }
  // the texts with a link get one of their own (book Q-168)
  // the person's phone now: a changed number gets them, the old one nothing more (book Q-171)
  const to = user?.phone ?? b.clientPhone
  if (LINKED_SMS.has(kind)) await sendWithLink(deps, b, to, (link) => bookingSmsText(lang, kind, { ...sms, link }))
  else await deps.sms.send({ to, text: bookingSmsText(lang, kind, sms) })
}

/** The last try failed or never finished: kept for inspection, and the error tracker (F-209) alerts on this line (book Q-284). */
async function giveUp(deps: Deps, job: { id: number; kind: string }, attempts: number, error: string): Promise<void> {
  deps.log.error('job gave up', { id: job.id, kind: job.kind, attempts, error })
  await deps.db
    .update(jobs)
    .set({ attempts, doneAt: new Date(deps.now()), lockedUntil: null, error })
    .where(eq(jobs.id, job.id))
}

async function runQueue(deps: Deps): Promise<number> {
  const now = new Date(deps.now())
  // claim a batch: other runners skip locked rows. A try counts when it starts, so one that hangs or dies past its
  // lock still counts toward giving up
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
        .set({ lockedUntil: new Date(now.getTime() + 60_000), attempts: j.attempts + 1 })
        .where(eq(jobs.id, j.id))
    return rows
  })
  for (const job of claimed) {
    const attempts = job.attempts + 1
    // tried as often as allowed, the last tries never finishing (a hung gateway, a restart): not tried again
    if (attempts > MAX_ATTEMPTS) {
      await giveUp(deps, job, job.attempts, job.error ?? 'never finished')
      continue
    }
    try {
      const p = job.payload
      // a review ask an older api queued (book Q-259): settled unsent, recorded as migration 0016 records them
      if (job.kind === 'booking.sms' && p.kind === 'reviewAsk') {
        await deps.db
          .update(jobs)
          .set({ attempts: job.attempts, doneAt: new Date(deps.now()), lockedUntil: null, error: DROPPED_REVIEW_ASK })
          .where(eq(jobs.id, job.id))
        continue
      }
      let note: string | undefined
      if (job.kind === 'sms') await deps.sms.send({ to: String(p.to), text: String(p.text) })
      else if (job.kind === 'booking.sms')
        note = await sendBookingSms(deps, String(p.bookingId), p.kind as BookingSmsKind | OutcomeSmsKind, p)
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
        // settled unsent with a note: not a try
        .set({ ...(note ? { attempts: job.attempts } : {}), doneAt: new Date(deps.now()), lockedUntil: null, error: note ?? null })
        .where(eq(jobs.id, job.id))
    } catch (e) {
      // a gateway may echo the text back: no error kept or logged holds a link's token
      const error = hideLinkTokens(String(e)).slice(0, 500)
      if (attempts >= MAX_ATTEMPTS) {
        await giveUp(deps, job, attempts, error)
        continue
      }
      deps.log.warn('job failed', { id: job.id, kind: job.kind, attempts, error })
      await deps.db
        .update(jobs)
        // back off 1, 2, 4, 8 minutes
        .set({ lockedUntil: null, error, runAt: new Date(deps.now() + 2 ** (attempts - 1) * 60_000) })
        .where(eq(jobs.id, job.id))
    }
  }
  return claimed.length
}

export async function runDueJobs(deps: Deps): Promise<{ expired: number; completed: number; jobs: number }> {
  await pruneBookingLinks(deps.db, deps.now())
  await pruneIdentityChecks(deps.db, deps.now())
  const expired = await expireRequests(deps)
  const completed = await completeVisits(deps)
  const ran = await runQueue(deps)
  return { expired, completed, jobs: ran }
}
