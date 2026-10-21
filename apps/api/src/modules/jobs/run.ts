/**
 * `runDueJobs(deps)` every minute (ADR 0005), from the jobs tick in the Node process.
 * 1. Requests whose hold time ran out → cancelled by the system, with 3 alternative times and an SMS.
 * 2. Confirmed visits that ended → completed.
 * 3. Reported reviews Ýeral didn't decide in 48 hours → counted again (book Q-261).
 * 4. Invites whose 7 days ran out → the team's and the invitee's open screens refresh (S-13).
 * 5. Queued work: SMS, reminders, demo businesses answering.
 * 6. The business app's demo workspace, made again after 04:00 (book F-242).
 */
import { DAY_MINUTES } from '@yeral/domain/hours'
import {
  addressAsShown,
  addressOf,
  effectiveStatus,
  hearsOfMove,
  NEWS_QUEUED,
  newsSms,
  REMINDER_KINDS,
  sameAddressShown,
  toldOf,
  type AddressTold,
  type NewsQueued,
  type Told,
} from '@yeral/domain/lifecycle'
import { MARKET } from '@yeral/domain/market'
import { isOnlineSource, type Locale } from '@yeral/domain/model'
import { isMobile } from '@yeral/domain/phone'
import { addDays, epochOf, localOf } from '@yeral/domain/time'
import { and, asc, eq, inArray, isNull, lt, lte, or, sql } from 'drizzle-orm'
import { bookings, businesses, clients, invites, jobs, users } from '../../db/schema'
import type { Deps } from '../../deps'
import { hit, peek } from '../../lib/rate-limit'
import {
  addressSmsText,
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
  type SmsBooking,
} from '../../notify'
import { loadBusinesses } from '../availability/context'
import { freeAlternatives } from '../bookings/offers'
import { confirmBooking } from '../bookings/confirm'
import { pruneIdentityChecks } from '../auth/identity'
import { newBookingLink, pruneBookingLinks } from '../bookings/links'
import { hideLinkTokens } from '../../ports/sms'
import { onlineRefusal } from '../clients/online'
import { itemsOf, recordMoveRefused, setStatus, StaleBooking, stateOf, type BookingRow } from '../bookings/repo'
import { ADDRESS_SMS } from '../bookings/address-sms'
import { keepSandbox } from '../demo/sandbox'
import { recountReviews } from '../reviews/team'
import { teamChanged } from '../team/service'

const BATCH = 100
/**
 * How a review ask is settled unsent (book Q-259), here and in migration 0016: done, never tried (attempts 0), so a
 * count of failed SMS (attempts reached) leaves it out.
 */
const DROPPED_REVIEW_ASK = 'dropped: no review asks (book Q-259)'
/** A booking's news when it's back as the client knew it: nothing to tell, settled unsent. */
const DROPPED_NOTHING_NEW = 'dropped: the client knows the booking as it is'
/** A reminder whose try comes once the visit has started tells the client nothing (book Q-284): settled unsent. */
const DROPPED_STARTED = 'dropped: the visit has started (book Q-284)'
const REMINDERS: ReadonlySet<string> = new Set(REMINDER_KINDS)
/**
 * The reminders name the address: once the business has moved, one the client hasn't heard of says "new address" and
 * counts as telling it (book Q-215). A phone booking's first SMS names it too, but as agreed on the phone: if the
 * business moved since, the SMS about the move still goes.
 */
const NAMES_ADDRESS: ReadonlySet<BookingSmsKind> = new Set(['reminderDay', 'reminder2h', 'reminderEvening'])
/** SMS go to mobile numbers only (ROUND6 C1): a client the team saved with a landline gets none. */
const DROPPED_NOT_MOBILE = 'dropped: not a mobile number (ROUND6 C1)'
/** The business moved and back, or the client was told since: they know the address as it is (book Q-215). */
const DROPPED_SAME_ADDRESS = 'dropped: the client knows the address as it is'
/**
 * A business that isn't verified sends no SMS under Ýeral's name to a number its team typed in (chapter 10, P2 step
 * 7); its clients' own online bookings still hear what happens to them.
 */
const DROPPED_IN_REVIEW = 'dropped: the business is in review'
/** The demo workspace sends no SMS at all (book F-242): its numbers are nobody's, or whatever a visitor typed in. */
const DROPPED_SANDBOX = 'dropped: the demo workspace sends no SMS'
/**
 * SMS about a business's bookings: so many a day, reminders included, and so many in 10 minutes from what happens to
 * them (book chapter 10, P2 step 7). They carry the business's own words under Ýeral's sender, so a team can't send
 * floods to numbers it made up; past a limit an SMS waits for the window to pass, never dropped, so a client's notice
 * (a cancel, a move, a new address) still reaches them.
 */
export const BUSINESS_SMS_PER_DAY = 1000
export const BUSINESS_SMS_PER_BURST = 30

/**
 * An SMS past its business's limits: it waits until `until`, spread over the `spreadSec` after it so one business's
 * backlog doesn't stand in front of everyone else's SMS (not a try).
 */
class Deferred extends Error {
  constructor(
    readonly until: number,
    readonly spreadSec: number,
  ) {
    super('waiting for the business SMS limit')
  }
}

/**
 * Checked as an SMS about a booking goes: refused for a business in review to a typed-in number; past a limit it
 * waits (`Deferred`); else it counts, once: a retry after a failed send doesn't count again (`firstTry`). The closing's
 * notices are Ýeral's own (book Q-213): never held.
 */
async function businessSmsLimit(
  deps: Deps,
  b: BookingRow,
  biz: Pick<typeof businesses.$inferSelect, 'verification' | 'sandbox'>,
  kind: string,
  firstTry: boolean,
): Promise<string | undefined> {
  if (biz.sandbox) return DROPPED_SANDBOX
  if (b.status === 'cancelled' && b.businessCancelReason === 'business_closed') return
  if (!isOnlineSource(b.source) && biz.verification !== 'verified') return DROPPED_IN_REVIEW
  const now = deps.now()
  const limits: [string, number, number][] = [[`sms:business:${b.businessId}:day`, BUSINESS_SMS_PER_DAY, 86_400]]
  if (!REMINDERS.has(kind)) limits.push([`sms:business:${b.businessId}:burst`, BUSINESS_SMS_PER_BURST, 600])
  for (const [key, limit, windowSec] of limits) {
    const state = await peek(deps.db, key, limit, windowSec, now)
    if (state.ok) continue
    // the alerts hear it once a window (error tracking, step 7)
    if ((await hit(deps.db, `${key}:told`, 1, windowSec, now)).ok)
      deps.log.error('business SMS limit reached: its SMS wait', {
        businessId: b.businessId,
        per: windowSec === 600 ? '10 minutes' : 'day',
      })
    // the next 10 minutes, or the next hour of a new day
    throw new Deferred(now + state.retryAfterSec * 1000, Math.min(windowSec, 3600))
  }
  if (firstTry) for (const [key, limit, windowSec] of limits) await hit(deps.db, key, limit, windowSec, now)
}
const MAX_ATTEMPTS = 5

/**
 * An invite's 7 days ran out unanswered (book S-13): the team's screens and the invitee's refresh (it shows
 * "expired" now). Nothing changes in the invite: its state is worked out from the time.
 */
async function tellExpiredInvites(deps: Deps): Promise<number> {
  const now = new Date(deps.now())
  return deps.db.transaction(async (tx) => {
    // a batch at a time, the rows someone else holds left for the next tick
    const due = await tx
      .select({ id: invites.id })
      .from(invites)
      .where(and(eq(invites.status, 'pending'), lte(invites.expiresAt, now), isNull(invites.expiryToldAt)))
      .orderBy(asc(invites.id))
      .limit(BATCH)
      .for('update', { skipLocked: true })
    if (!due.length) return 0
    const told = await tx
      .update(invites)
      .set({ expiryToldAt: now })
      .where(
        inArray(
          invites.id,
          due.map((d) => d.id),
        ),
      )
      .returning({ businessId: invites.businessId, phone: invites.phone })
    // once per business and person, however many of their invites ran out
    const seen = new Set<string>()
    for (const i of told) {
      if (seen.has(`${i.businessId}:${i.phone}`)) continue
      seen.add(`${i.businessId}:${i.phone}`)
      await teamChanged(tx, i.businessId, { phone: i.phone })
    }
    return told.length
  })
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

interface OutcomeSms {
  /** The booking is still as the SMS says: nothing changed since it was queued. */
  still: (b: BookingRow, now: number) => boolean
  /** Its text; `byPhone`: a paused business or a phone-only client, whom the page offers the call card (Q-154). */
  text: (lang: Locale, sms: SmsBooking & { link: string }, b: BookingRow, byPhone: boolean) => string
}

/**
 * The SMS about an outcome the client didn't choose, which always go: an expired request's times, a declined request's
 * reason, a business that closed over a booking with its times, a move not accepted while the visit is still ahead.
 * Offered times can be taken whatever the client's online status (A7); with none, a client who can't book online calls.
 */
const OUTCOMES: Record<OutcomeSmsKind, OutcomeSms> = {
  expired: {
    still: (b) => b.status === 'cancelled' && b.cancelledBy === 'system',
    text: (lang, sms, b, byPhone) => expiredSmsText(lang, sms, byPhone ? [] : b.expiredAlternatives, { byPhone }),
  },
  declined: {
    still: (b) => b.status === 'cancelled' && b.cancelledBy === 'business' && !!b.declineReason,
    text: (lang, sms, b, byPhone) =>
      declinedSmsText(lang, sms, b.declineReason!, b.declineText, { byPhone: byPhone && !b.declineAlternatives.length }),
  },
  cancelledOffers: {
    still: (b) =>
      b.status === 'cancelled' &&
      (b.businessCancelReason === 'closed' || b.businessCancelReason === 'hours' || b.businessCancelReason === 'staff_away'),
    text: (lang, sms, b, byPhone) =>
      cancelledOffersSmsText(lang, sms, businessCancelText(lang, b.businessCancelReason!, b.cancelReason), b.declineAlternatives, {
        byPhone: byPhone && !b.declineAlternatives.length,
      }),
  },
  moveRefused: {
    still: (b, now) => b.status === 'confirmed' && !!b.moveRefused && now < epochOf(b.date, b.start),
    text: (lang, sms, b) =>
      moveRefusedSmsText(
        lang,
        sms,
        b.moveRefused?.by === 'business' && b.moveRefused.reason ? { reason: b.moveRefused.reason, text: b.moveRefused.text } : undefined,
      ),
  },
}

const isOutcome = (kind: string): kind is OutcomeSmsKind => Object.hasOwn(OUTCOMES, kind)

/** The time a cancel names: the one the client knows, not one a change they weren't told yet moved it to. */
const knownTime = (b: BookingRow) => ({ date: b.told?.date ?? b.date, start: b.told?.start ?? b.start })

async function sendOutcomeSms(deps: Deps, b: BookingRow, kind: OutcomeSmsKind, firstTry: boolean): Promise<string | undefined> {
  const outcome = OUTCOMES[kind]
  if (!outcome.still(b, deps.now())) return
  const lb = (await loadBusinesses(deps.db, [b.businessId])).get(b.businessId)
  if (!lb) return
  const biz = lb.business
  const [user] = b.userId ? await deps.db.select().from(users).where(eq(users.id, b.userId)) : []
  const lang = user?.lang ?? MARKET.defaultLanguage
  const at = kind === 'cancelledOffers' ? knownTime(b) : { date: b.date, start: b.start }
  const sms = { ...at, businessName: biz.name, address: biz.address }
  const to = user?.phone ?? b.clientPhone ?? ''
  const byPhone = !!(await onlineRefusal(deps.db, lb, to))
  const limited = await businessSmsLimit(deps, b, biz, kind, firstTry)
  if (limited) return limited
  await sendWithLink(deps, b, to, (link) => outcome.text(lang, { ...sms, link }, b, byPhone))
}

/** What the client knows now, written unless something else changed it since the job read the booking. */
async function noteTold(deps: Deps, b: BookingRow, told: Told): Promise<void> {
  await deps.db
    .update(bookings)
    .set({ told })
    .where(and(eq(bookings.id, b.id), sql`${bookings.told} is not distinct from ${b.told === null ? null : JSON.stringify(b.told)}::jsonb`))
}

/**
 * A booking SMS, if the booking is still in the right state and the client wants it. News (`NEWS_QUEUED`) is worded
 * from what the client knows and the booking as it is now (`newsSms`); a reminder goes only while the booking is still
 * at the time it was planned for (`at`). Says why when it settles one unsent that the job should record.
 */
async function sendBookingSms(
  deps: Deps,
  bookingId: string,
  queuedKind: BookingSmsKind | OutcomeSmsKind | 'staffChanged',
  at: { date?: unknown; start?: unknown; covers?: unknown },
  firstTry: boolean,
): Promise<string | undefined> {
  // a change queued by an older api, worded now like any news
  const queued = queuedKind === 'staffChanged' ? 'moved' : queuedKind
  const news = (NEWS_QUEUED as readonly string[]).includes(queued)
  const read = deps.db.select().from(bookings).where(eq(bookings.id, bookingId))
  // news about a booking the team may still be undoing waits for the undo, then finds it gone
  const [b] = news ? await read.for('share') : await read
  // the person deleted their account: the number may be someone else's now
  if (!b?.clientPhone || b.accountDeletedAt) return
  if (!news && at.date !== undefined && (at.date !== b.date || at.start !== b.start)) return
  // an account's phone took a sign-in code, so it's a mobile; a number the team typed in may not be
  if (!b.userId && !isMobile(b.clientPhone)) return DROPPED_NOT_MOBILE
  if (isOutcome(queued)) return sendOutcomeSms(deps, b, queued, firstTry)
  // a business's cancel goes while the booking stays cancelled by it ("Yzyna al" by the client can't undo those)
  const cancel = queued === 'cancelled' || queued === 'cancelledAsAsked'
  if (cancel) {
    if (b.status !== 'cancelled' || !b.businessCancelReason) return
  } else if (b.status !== 'confirmed') return
  // a retried reminder can't arrive after the start (book Q-284)
  if (REMINDERS.has(queued) && deps.now() >= epochOf(b.date, b.start)) return DROPPED_STARTED
  let kind: BookingSmsKind = queued
  let items: Awaited<ReturnType<typeof itemsOf>> = []
  let told: Told | undefined
  if (news) {
    // the news says what the client doesn't know yet, or nothing (book B-24, B-26)
    items = await itemsOf(deps.db, b.id)
    told = toldOf(
      b,
      items.map((i) => i.staffId),
    )
    const said = newsSms(queued as NewsQueued, isOnlineSource(b.source), b.told, told)
    if (!said) return DROPPED_NOTHING_NEW
    kind = said
  } else if (REMINDERS.has(queued) && b.told) {
    // a reminder tells the time
    told = { ...b.told, date: b.date, start: b.start }
  }
  const [user] = b.userId ? await deps.db.select().from(users).where(eq(users.id, b.userId)) : []
  const [client] = b.clientId ? await deps.db.select().from(clients).where(eq(clients.id, b.clientId)) : []
  if (client?.noRemindersSms && REMINDERS.has(kind)) return
  if (user) {
    const prefs = {
      // "Confirmations and changes": confirmations, moves and the business's cancels (book Q-286)
      confirmed: user.notifyConfirmation,
      booked: user.notifyConfirmation,
      bookedWith: user.notifyConfirmation,
      moved: user.notifyConfirmation,
      movedWith: user.notifyConfirmation,
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
  // the business moved since the client last heard where it is: a reminder says it's new (book Q-215)
  const heard =
    NAMES_ADDRESS.has(kind) && b.addressTold && !sameAddressShown(b.addressTold, addressOf(biz), biz.hideExactAddress, b.status)
      ? addressOf(biz)
      : null
  const sms = {
    ...(cancel ? knownTime(b) : { date: b.date, start: b.start }),
    businessName: biz.name,
    address: biz.address,
    newAddress: !!heard,
    city: await smsCityOf(deps.db, biz.cityId, lang),
    reason: b.businessCancelReason ? businessCancelText(lang, b.businessCancelReason, b.cancelReason) : undefined,
    staff: [...new Set(items.flatMap((i) => (i.staffName ? [i.staffName] : [])))].join(', '),
  }
  // the texts with a link get one of their own (book Q-168)
  // the person's phone now: a changed number gets them, the old one nothing more (book Q-171)
  const to = user?.phone ?? b.clientPhone
  const limited = await businessSmsLimit(deps, b, biz, kind, firstTry)
  if (limited) return limited
  if (LINKED_SMS.has(kind)) await sendWithLink(deps, b, to, (link) => bookingSmsText(lang, kind, { ...sms, link }))
  else await deps.sms.send({ to, text: bookingSmsText(lang, kind, sms) })
  // what the client knows now: the next news compares with it
  if (told) await noteTold(deps, b, told)
  if (heard) await noteAddressTold(deps, b, heard)
}

/**
 * The SMS about a new address (book Q-215). It goes whatever the client's switches, like a decline: without it they'd go
 * to the old place. Worded from the address as it is when it goes, against the one the client last heard
 * (`addressTold`): the same, it settles unsent. While a home-based business's request waits, the client knows only its
 * street, and that's what it compares and tells.
 */
async function sendAddressSms(deps: Deps, bookingId: string, firstTry: boolean): Promise<string | undefined> {
  // a team's undo under way finishes first, and then there's nothing to tell
  const [b] = await deps.db.select().from(bookings).where(eq(bookings.id, bookingId)).for('share')
  if (!b?.clientPhone || b.accountDeletedAt) return
  const now = deps.now()
  const { status } = effectiveStatus(stateOf(b), now)
  if (!hearsOfMove(status, b, now)) return status === 'pending' || status === 'confirmed' ? DROPPED_STARTED : undefined
  if (!b.userId && !isMobile(b.clientPhone)) return DROPPED_NOT_MOBILE
  // a profile save under way finishes first: this tells the address as it's saved
  const [biz] = await deps.db.select().from(businesses).where(eq(businesses.id, b.businessId)).for('share')
  if (!biz) return
  const current = addressOf(biz)
  if (b.addressTold && sameAddressShown(b.addressTold, current, biz.hideExactAddress, status)) return DROPPED_SAME_ADDRESS
  const [user] = b.userId ? await deps.db.select().from(users).where(eq(users.id, b.userId)) : []
  const lang = user?.lang ?? MARKET.defaultLanguage
  const sms = {
    date: b.date,
    start: b.start,
    businessName: biz.name,
    address: addressAsShown(current, biz.hideExactAddress, status),
    city: await smsCityOf(deps.db, biz.cityId, lang),
  }
  const limited = await businessSmsLimit(deps, b, biz, ADDRESS_SMS, firstTry)
  if (limited) return limited
  await sendWithLink(deps, b, user?.phone ?? b.clientPhone, (link) => addressSmsText(lang, { ...sms, link }))
  await noteAddressTold(deps, b, current)
}

/**
 * The address an SMS told the client: the next move compares with it (book Q-215), unless something else changed it
 * since the job read the booking.
 */
async function noteAddressTold(deps: Deps, b: BookingRow, heard: AddressTold): Promise<void> {
  await deps.db
    .update(bookings)
    .set({ addressTold: { ...heard, at: deps.now() } })
    .where(
      and(
        eq(bookings.id, b.id),
        sql`${bookings.addressTold} is not distinct from ${b.addressTold === null ? null : JSON.stringify(b.addressTold)}::jsonb`,
      ),
    )
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
      // its first try: an SMS counts toward its business's limits when it goes, a retry not again
      const firstTry = job.attempts === 0
      let note: string | undefined
      if (job.kind === 'sms') await deps.sms.send({ to: String(p.to), text: String(p.text) })
      else if (job.kind === 'booking.sms' && p.kind === ADDRESS_SMS) note = await sendAddressSms(deps, String(p.bookingId), firstTry)
      else if (job.kind === 'booking.sms')
        note = await sendBookingSms(deps, String(p.bookingId), p.kind as BookingSmsKind | OutcomeSmsKind, p, firstTry)
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
      // past its business's limit: it waits for the window, not a try
      if (e instanceof Deferred) {
        await deps.db
          .update(jobs)
          .set({ attempts: job.attempts, lockedUntil: null, runAt: new Date(e.until + (job.id % e.spreadSec) * 1000) })
          .where(eq(jobs.id, job.id))
        continue
      }
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

export async function runDueJobs(
  deps: Deps,
): Promise<{ expired: number; completed: number; recounted: number; invitesExpired: number; jobs: number }> {
  await pruneBookingLinks(deps.db, deps.now())
  await pruneIdentityChecks(deps.db, deps.now())
  const expired = await expireRequests(deps)
  const completed = await completeVisits(deps)
  const recounted = await recountReviews(deps)
  const invitesExpired = await tellExpiredInvites(deps)
  const ran = await runQueue(deps)
  await keepSandbox(deps)
  return { expired, completed, recounted, invitesExpired, jobs: ran }
}
