/**
 * Booking lifecycle (client spec §4.8, §6; business spec §2–3; ADR 0017).
 *
 *   client sends ─► pending ──(business confirms)──► confirmed ──(end passes)──► completed
 *        │  (instant mode or staff-made: confirmed at once)        │
 *        │                                                          ├─(complaint "Gelmedi")─► noshow
 *        └─(declined / client cancels / hold time passes)─► cancelled ◄─(client or business cancels)
 *
 * The database keeps the stored status; jobs settle expiries and completions every minute. Until a job has run,
 * `effectiveStatus` gives what people must see, so screens never show a stale "pending" or "confirmed".
 */
import {
  isOnlineSource,
  isTeamSource,
  type BookingSource,
  type BookingStatus,
  type BusinessCancelReason,
  type CancelledBy,
  type ComplaintType,
  type ConfirmMode,
} from './model'
import type { BookingRules } from './rules'
import { DAY_MINUTES, openStretches, type BusinessHours } from './hours'
import { addDays, epochOf, localOf } from './time'

/** A booking as far as the lifecycle cares: business-local date, start and end minutes, stored state. */
export interface BookingState {
  date: string
  start: number
  end: number
  status: BookingStatus
  cancelledBy?: CancelledBy | null
  /** Epoch ms; pending requests only. */
  holdUntil?: number | null
  /** The complaint filed ("Arz et"), if any; one per booking. */
  complaintType?: ComplaintType | null
}

export type LifecycleError =
  | 'invalid_status'
  | 'request_expired'
  | 'cancel_window_passed'
  | 'already_started'
  | 'not_started'
  | 'already_reported'
  | 'noshow_window_passed'
  | 'restore_expired'
  | 'undo_expired'
  | 'review_not_allowed'
  | 'review_window_passed'
  | 'complaint_locked'

/** At most this many alternative times go with a decline or an expiry. */
export const MAX_ALTERNATIVES = 3
/** A review can be edited this long after it's written. */
export const REVIEW_EDIT_DAYS = 7
/** Requests one client may have waiting for an answer at one business, and across Ýeral (book Q-124). */
export const MAX_WAITING_HERE = 3
export const MAX_WAITING_IN_ALL = 10

export const WAITING_SCOPES = ['business', 'all'] as const
// a type, not an interface: it goes into an error's details as it is
export type WaitingLimit = { scope: (typeof WAITING_SCOPES)[number]; limit: number }

/**
 * Whether a client with `here` requests waiting at this business, and `inAll` across Ýeral, may have one more waiting
 * (book Q-124): null, or which limit it would pass. A request holds its time until it's answered or its answer time
 * (counted in the business's opening hours) runs out.
 */
export function waitingLimit(here: number, inAll: number): WaitingLimit | null {
  if (here >= MAX_WAITING_HERE) return { scope: 'business', limit: MAX_WAITING_HERE }
  if (inAll >= MAX_WAITING_IN_ALL) return { scope: 'all', limit: MAX_WAITING_IN_ALL }
  return null
}
/** "Haýyşyň wagty gutarýar": this many minutes before a request's answer time ends (book S-01, business spec §16). */
export const EXPIRY_WARNING_MINUTES = 5

/** The business's reply to a review: this long at most (B-53). */
export const REVIEW_REPLY_MAX = 500
/** A reported review isn't counted while Ýeral checks it, this long at most; then it counts again (book Q-261). */
export const REVIEW_REPORT_HOURS = 48

/** A review can be written until this long after the visit ends (book Q-126). */
export const REVIEW_WRITE_DAYS = 30
/** A no-show can be marked until this long after the visit ends (book Q-254). */
export const NOSHOW_MARK_HOURS = 24

const startOf = (b: Pick<BookingState, 'date' | 'start'>) => epochOf(b.date, b.start)
const endOf = (b: Pick<BookingState, 'date' | 'end'>) => epochOf(b.date, b.end)

/** Online bookings wait for the business unless it confirms instantly; bookings made by staff are confirmed. */
export function initialStatus(source: BookingSource, confirmMode: ConfirmMode): 'pending' | 'confirmed' {
  return isOnlineSource(source) && confirmMode === 'manual' ? 'pending' : 'confirmed'
}

/**
 * When an unanswered request expires (server-enforced): after the hold time counted only while the business is open
 * (book Q-120; a break counts as closed, as in the open state), never past the visit start. A request sent at 23:00 to
 * a business opening at 09:00 with a 30-minute hold waits until 09:30. When the business isn't open at all before the
 * visit (Saturday night for Monday's first hour), the hold counts plain time, so the client isn't kept waiting until
 * the visit itself. `endBy` caps it further: a move's deadline never outlives the visit it would move (book Q-263).
 */
export function holdUntil(
  createdAt: number,
  b: Pick<BookingState, 'date' | 'start'>,
  holdMinutes: number,
  business: BusinessHours,
  endBy = Infinity,
): number {
  const start = Math.min(startOf(b), endBy)
  const hold = holdMinutes * 60_000
  const open = openStretches(business, createdAt, start)
  if (!open.length) return Math.min(createdAt + hold, start)
  let left = hold
  for (const w of open) {
    if (w.end - w.start >= left) return w.start + left
    left -= w.end - w.start
  }
  return start
}

/** No client reminder arrives between 22:00 and 08:00 at the business (book Q-285). */
export const NIGHT = { from: 22 * 60, to: 8 * 60 } as const
/** A reminder that would arrive at night goes at 21:30 the evening before the visit instead. */
export const EVENING_REMINDER_AT = 21 * 60 + 30

/** The two reminders a client can switch off ("Ertir ýatlatma", "2 sagat öň"). */
export type Reminder = 'reminderDay' | 'reminder2h'
/** Every reminder SMS; `reminderEvening`: a reminder moved out of the night, worded "tomorrow". */
export const REMINDER_KINDS = ['reminderDay', 'reminder2h', 'reminderEvening'] as const satisfies readonly (Reminder | 'reminderEvening')[]
export type ReminderKind = (typeof REMINDER_KINDS)[number]

/** A planned reminder; `covers`: the reminders it stands for, whose switches decide whether it goes. */
export interface PlannedReminder {
  kind: ReminderKind
  runAt: number
  covers: Reminder[]
}

const HOUR = 3_600_000

const isNight = (epoch: number) => {
  const { min } = localOf(epoch)
  return min >= NIGHT.from || min < NIGHT.to
}

/**
 * When a confirmed visit's reminders go (book Q-257, Q-285): a day before and 2 hours before. One that would arrive at
 * night goes at 21:30 the evening before the visit instead, worded "tomorrow". At most one reminder goes on any day
 * before the visit (the later one, standing for both): no two "tomorrow" texts the same day. A reminder already due when
 * the booking is made is left out, and so is a moved one that would come within 2 hours of it: the "confirmed" SMS has
 * just told the client.
 */
export function reminderPlan(visitStart: number, now: number): PlannedReminder[] {
  const evening = epochOf(addDays(localOf(visitStart).date, -1), EVENING_REMINDER_AT)
  const planned: [Reminder, number][] = [
    ['reminderDay', visitStart - 24 * HOUR],
    ['reminder2h', visitStart - 2 * HOUR],
  ]
  const out: PlannedReminder[] = []
  for (const [kind, runAt] of planned) {
    if (runAt <= now) continue
    const reminder: PlannedReminder = isNight(runAt)
      ? { kind: 'reminderEvening', runAt: evening, covers: [kind] }
      : { kind, runAt, covers: [kind] }
    if (reminder.kind === 'reminderEvening' && reminder.runAt < now + 2 * HOUR) continue
    // one a day before the visit: the later stands for both
    const sameDay = out.find(
      (r) => localOf(r.runAt).date === localOf(reminder.runAt).date && localOf(reminder.runAt).date !== localOf(visitStart).date,
    )
    if (!sameDay) {
      out.push(reminder)
      continue
    }
    const later = sameDay.runAt >= reminder.runAt ? sameDay : reminder
    out.splice(out.indexOf(sameDay), 1, { ...later, covers: [...sameDay.covers, ...reminder.covers] })
  }
  return out.sort((a, b) => a.runAt - b.runAt)
}

/**
 * A booking as the client knows it: its date, start, and who does it (the items' staff ids in order). Kept on the
 * booking when it's made (the client chose it, or agreed to it on the phone or at the desk) and when an SMS tells it.
 */
export interface Told {
  date: string
  start: number
  staff: string
}
export const toldOf = (b: Pick<BookingState, 'date' | 'start'>, staffIds: readonly (string | null)[]): Told => ({
  date: b.date,
  start: b.start,
  staff: staffIds.join(','),
})
export const sameTold = (a: Told, b: Told) => a.date === b.date && a.start === b.start && a.staff === b.staff

/**
 * A booking's news as queued, one waiting at a time: a confirmation (`confirmed`; `booked`, entered by the team) or a
 * change the business made (`moved`), worded when it goes (`newsSms`).
 */
export const NEWS_QUEUED = ['confirmed', 'booked', 'moved'] as const
export type NewsQueued = (typeof NEWS_QUEUED)[number]
/** A confirmation outranks a change: one waiting tells a change made meanwhile too. */
export const isConfirmationNews = (queued: NewsQueued) => queued !== 'moved'
/** What a news SMS says when it goes. */
export type NewsSms = 'confirmed' | 'booked' | 'bookedWith' | 'moved' | 'movedWith' | 'staffChanged'

/**
 * What a booking's news SMS says when it goes (book B-24, B-26), from what the client knows (`told`; null on a booking
 * from before it was kept) and the booking as it is (`now`). A confirmation tells the booking as it is, naming who does
 * it when that changed after the client agreed on the phone (`bookedWith`); one the client chose online and the business
 * changed before it went is told as the change. A change says what changed since the client knew it: the time
 * (`moved`), the time and who (`movedWith`), or who (`staffChanged`); nothing when it's back as they knew it.
 */
export function newsSms(queued: NewsQueued, chosenOnline: boolean, told: Told | null, now: Told): NewsSms | null {
  if (!told) return queued
  const changed = !sameTold(told, now)
  if (queued === 'booked') return told.staff === now.staff ? 'booked' : 'bookedWith'
  if (queued === 'confirmed' && !(chosenOnline && changed)) return 'confirmed'
  if (!changed) return null
  if (told.date !== now.date || told.start !== now.start) return told.staff === now.staff ? 'moved' : 'movedWith'
  return 'staffChanged'
}

/** An offered time (after a decline or an expiry) is past once it starts earlier than now plus the lead time (book Q-264). */
export function offerPast(offer: Pick<BookingState, 'date' | 'start'>, leadMinutes: number, now = Date.now()): boolean {
  return startOf(offer) < now + leadMinutes * 60_000
}

/** The status people see now, before the jobs have caught up. */
export function effectiveStatus(b: BookingState, now = Date.now()): { status: BookingStatus; cancelledBy: CancelledBy | null } {
  if (b.status === 'pending' && now >= (b.holdUntil ?? startOf(b))) return { status: 'cancelled', cancelledBy: 'system' }
  if (b.status === 'confirmed' && now >= endOf(b)) return { status: 'completed', cancelledBy: null }
  return { status: b.status, cancelledBy: b.status === 'cancelled' ? (b.cancelledBy ?? null) : null }
}

/** Pending and confirmed bookings take their slot; everything else frees it. */
export function occupiesSlot(b: BookingState, now = Date.now()): boolean {
  const s = effectiveStatus(b, now).status
  return s === 'pending' || s === 'confirmed'
}

/**
 * What a job must do with a booking now: expire an unanswered request or complete a finished visit. Derived from
 * `effectiveStatus`, so the jobs store exactly what screens already show.
 */
export function dueTransition(b: BookingState, now = Date.now()): 'expire' | 'complete' | null {
  const { status } = effectiveStatus(b, now)
  if (status === b.status) return null
  return status === 'cancelled' ? 'expire' : 'complete'
}

/** Until when the client may cancel or move a confirmed booking (epoch ms); null window = until the start. */
export function cancelDeadline(rules: Pick<BookingRules, 'cancelWindowMinutes'>, b: Pick<BookingState, 'date' | 'start'>): number {
  return startOf(b) - (rules.cancelWindowMinutes ?? 0) * 60_000
}

type Guard = LifecycleError | null

// ── Client ──

export function canClientCancel(b: BookingState, rules: Pick<BookingRules, 'cancelWindowMinutes'>, now = Date.now()): Guard {
  const { status } = effectiveStatus(b, now)
  if (status === 'pending') return null
  if (status !== 'confirmed') return 'invalid_status'
  return now < cancelDeadline(rules, b) ? null : 'cancel_window_passed'
}

/** Moving = a new request for the new time; the original stays confirmed until the business answers. */
export function canClientReschedule(b: BookingState, rules: Pick<BookingRules, 'cancelWindowMinutes'>, now = Date.now()): Guard {
  const { status } = effectiveStatus(b, now)
  if (status !== 'confirmed') return 'invalid_status'
  return now < cancelDeadline(rules, b) ? null : 'cancel_window_passed'
}

export function canEditNote(b: BookingState, now = Date.now()): Guard {
  return effectiveStatus(b, now).status === 'pending' ? null : 'invalid_status'
}

export interface ClientActions {
  cancel: boolean
  reschedule: boolean
  editNote: boolean
  /** The window has passed: only "Jaň et" is offered. */
  callOnly: boolean
  review: boolean
  editReview: boolean
  bookAgain: boolean
}

/** Write a review ("Teswir ýaz"): a completed visit, until 30 days after it ends (book Q-126); one per booking. */
export function canWriteReview(b: BookingState, now = Date.now()): Guard {
  if (effectiveStatus(b, now).status !== 'completed') return 'review_not_allowed'
  return now <= endOf(b) + REVIEW_WRITE_DAYS * 24 * HOUR ? null : 'review_window_passed'
}

/**
 * The reason kept with a client's cancel (book Q-163): only when the business asks for one ("Ýatyrylanda sebäp sora"),
 * and never a blank one.
 */
export function keptCancelReason(rules: Pick<BookingRules, 'askCancelReason'>, reason: string | null | undefined): string | null {
  return (rules.askCancelReason && reason?.trim()) || null
}

/** The typical answer time counts the answers of this many days (book Q-113)… */
export const TYPICAL_ANSWER_DAYS = 30
/** …and shows once the business has answered this many requests in them. */
export const TYPICAL_ANSWER_MIN_ANSWERS = 5
/** The steps it's rounded up to, in minutes; past a day, whole days. */
const ANSWER_STEPS = [5, 10, 15, 20, 30, 45, 60, 90, 120, 180, 240, 360, 480, 720, DAY_MINUTES]

/**
 * "Adatça 15 minudyň dowamynda tassyklaýar" (book Q-113): the median wait for an answer, in open minutes, over the last
 * 30 days, rounded up to a step (15 min, 1 h …). `answers`: the requests the business answered; `lapsed`: those it let
 * run out, counted at the wait the client had. Null until it has answered 5 requests in those days.
 */
export function typicalAnswerMinutes(answers: readonly number[], lapsed: readonly number[] = []): number | null {
  if (answers.length < TYPICAL_ANSWER_MIN_ANSWERS) return null
  const sorted = [...answers, ...lapsed].sort((a, b) => a - b)
  const mid = sorted.length / 2
  const median = sorted.length % 2 ? sorted[Math.floor(mid)]! : (sorted[mid - 1]! + sorted[mid]!) / 2
  return ANSWER_STEPS.find((step) => median <= step) ?? Math.ceil(median / DAY_MINUTES) * DAY_MINUTES
}

/** "Yzyna al" works this long after the client's own cancel (ROUND6 A6). */
export const RESTORE_MINUTES = 5

/** A cancelled booking as "Yzyna al" reads it. */
export interface RestoreState extends BookingState {
  /** Epoch ms of the cancel. */
  cancelledAt: number | null
  /** It had been confirmed: it comes back confirmed, a request comes back waiting. */
  wasConfirmed: boolean
  /** A move request: withdrawn or replaced, it stays so (the client asks again). */
  isMove: boolean
  /** The team entered the cancel ("The client called to cancel", B-27): the client calls again instead. */
  byTeam: boolean
}

/**
 * "Yzyna al": the client's own cancel, undone within 5 minutes (ROUND6 A6). Not their cancel (or already undone, a
 * second tap): `invalid_status`; the 5 minutes passed: `restore_expired`; the visit has started: `already_started`; a
 * request whose answer time ran out: `request_expired`. The time taken and a full class are found when it comes back.
 */
export function canClientRestore(b: RestoreState, now = Date.now()): Guard {
  if (b.status !== 'cancelled' || b.cancelledBy !== 'client' || b.cancelledAt === null || b.isMove || b.byTeam) return 'invalid_status'
  if (now - b.cancelledAt >= RESTORE_MINUTES * 60_000) return 'restore_expired'
  if (now >= startOf(b)) return 'already_started'
  if (!b.wasConfirmed && !(b.holdUntil && b.holdUntil > now)) return 'request_expired'
  return null
}

/** What the client can do with a booking ("Client actions by status", client spec §4.8). */
export function clientActions(
  b: BookingState,
  rules: Pick<BookingRules, 'cancelWindowMinutes'>,
  review: { createdAt: number } | null,
  now = Date.now(),
): ClientActions {
  const { status } = effectiveStatus(b, now)
  const cancel = canClientCancel(b, rules, now) === null
  return {
    cancel,
    reschedule: canClientReschedule(b, rules, now) === null,
    editNote: canEditNote(b, now) === null,
    callOnly: status === 'confirmed' && !cancel,
    review: !review && canWriteReview(b, now) === null,
    editReview: status === 'completed' && !!review && now - review.createdAt < REVIEW_EDIT_DAYS * 86_400_000,
    bookAgain: status === 'completed' || status === 'cancelled' || status === 'noshow',
  }
}

// ── Business ──

/**
 * "Yzyna al" on a booking the team just added (B-24): its toast shows for 6 seconds, the undo is taken a little longer
 * (a slow network). The client's SMS waits longer still (`NEW_BOOKING_SMS_AFTER_MS`).
 */
export const NEW_BOOKING_UNDO_MS = 10_000

/**
 * The client's first SMS about a booking the team just added goes this long after it's saved: once "Yzyna al" can't
 * take it back, with a margin for an undo still on its way, so an undo never leaves an SMS behind (B-24).
 */
export const NEW_BOOKING_SMS_AFTER_MS = NEW_BOOKING_UNDO_MS + 5_000

/** When a booking's SMS may go: one the team entered once its undo can't come any more (B-24), any other now. */
export const firstSmsFrom = (b: { source: BookingSource; createdAt: number }, now: number): number =>
  Math.max(now, isTeamSource(b.source) ? b.createdAt + NEW_BOOKING_SMS_AFTER_MS : 0)

// ── A new address (book Q-215) ──

/**
 * A business that moves tells every client with a booking ahead (owner, 20.10.2026): the SMS goes this long after the
 * save that changed the address, so a typo fixed straight after makes one SMS, or none when it's back as it was.
 */
export const ADDRESS_SMS_AFTER_MS = 10 * 60_000
/** A visit sooner than the wait hears it this long before it starts, or at once. */
export const ADDRESS_SMS_LEAD_MS = 30 * 60_000

/** A business's address as a client knows it: the line, the street a home-based business shows first, the city. */
export interface AddressTold {
  address: string
  street: string
  cityId: string
  /** When an SMS told the client this one as new (the booking says "New address" from then); none: they booked with it. */
  at?: number
}

/** A business's address as `AddressTold` keeps it. */
export const addressOf = (b: { address: string; street: string; cityId: string }): AddressTold => ({
  address: b.address,
  street: b.street,
  cityId: b.cityId,
})

/** A booking whose client hears that the business moved, and sees it on the booking: waiting or confirmed, still ahead. */
export const hearsOfMove = (status: BookingStatus, b: { date: string; start: number }, now: number): boolean =>
  (status === 'pending' || status === 'confirmed') && now < epochOf(b.date, b.start)

/** A move: the line, the street or the city changed; a new pin alone isn't one. */
export const sameAddress = (a: AddressTold, b: AddressTold): boolean =>
  a.address === b.address && a.street === b.street && a.cityId === b.cityId

/** A home-based business shows its exact address once the booking is confirmed (and after the visit); before, the street. */
export const showsExactAddress = (status: BookingStatus): boolean => status === 'confirmed' || status === 'completed'

/** The address a client reads on a booking in `status`. */
export const addressAsShown = (a: AddressTold, hideExact: boolean, status: BookingStatus): string =>
  hideExact && !showsExactAddress(status) ? a.street : a.address

/** Whether a client reading a booking in `status` sees the two addresses alike. */
export const sameAddressShown = (a: AddressTold, b: AddressTold, hideExact: boolean, status: BookingStatus): boolean =>
  a.cityId === b.cityId && addressAsShown(a, hideExact, status) === addressAsShown(b, hideExact, status)

/** When the SMS about a new address goes for this booking: the wait, a soon visit's lead, never before its first SMS may. */
export const addressSmsAt = (b: { source: BookingSource; createdAt: number; date: string; start: number }, now: number): number =>
  Math.max(firstSmsFrom(b, now), Math.min(now + ADDRESS_SMS_AFTER_MS, epochOf(b.date, b.start) - ADDRESS_SMS_LEAD_MS))

/** The business page says "New address" this long after the business moved. */
export const NEW_ADDRESS_DAYS = 30

/** When the business moved, while its page still says so; else null. */
export const newAddressSince = (movedAt: number | null, now: number): number | null =>
  movedAt !== null && movedAt <= now && now - movedAt < NEW_ADDRESS_DAYS * 86_400_000 ? movedAt : null

/**
 * Undo a booking the team just added by phone or for a walk-in: it goes as if never made, while the undo time runs and
 * it's still confirmed (`undo_expired` after).
 */
export function canUndoNewBooking(b: Pick<BookingState, 'status'> & { source: BookingSource; createdAt: number }, now = Date.now()): Guard {
  if (b.status !== 'confirmed' || (b.source !== 'phone' && b.source !== 'walkin')) return 'invalid_status'
  return now < b.createdAt + NEW_BOOKING_UNDO_MS ? null : 'undo_expired'
}

/** Confirm or decline a request. */
export function canAnswerRequest(b: BookingState, now = Date.now()): Guard {
  if (b.status !== 'pending') return 'invalid_status'
  return effectiveStatus(b, now).status === 'pending' ? null : 'request_expired'
}

/** Cancel a confirmed booking ("Ýatyr"; requests are declined instead). */
export function canBusinessCancel(b: BookingState, now = Date.now()): Guard {
  if (effectiveStatus(b, now).status !== 'confirmed') return 'invalid_status'
  return now < startOf(b) ? null : 'already_started'
}

/**
 * "The client called to cancel" is the client's own cancel, which the team enters: the client sees "You cancelled". The
 * other reasons are the business's, with the reason shown (B-27).
 */
export const cancelledByFor = (reason: BusinessCancelReason): CancelledBy => (reason === 'client_called' ? 'client' : 'business')

/**
 * Move to another time or specialist (drag in the calendar, "Başga wagta geçir"): a confirmed booking that hasn't
 * started (B-26). A request is answered, not moved.
 */
export function canBusinessMove(b: BookingState, now = Date.now()): Guard {
  if (effectiveStatus(b, now).status !== 'confirmed') return 'invalid_status'
  return now < startOf(b) ? null : 'already_started'
}

/**
 * "Arz et", one per booking, on a confirmed or completed booking (book Q-206, Q-254). "Gelmedi" (a no-show) from the
 * visit's start until 24 hours after its end, and it takes the place of another complaint filed before (a rude call
 * the day before mustn't keep the no-show from counting). "Gijä galdy" (late) from the start, since no one is late
 * before it; rude and anything else any time, a rude call before the visit included.
 */
export function canComplain(b: BookingState, type: ComplaintType, now = Date.now()): Guard {
  if (b.complaintType && (type !== 'noshow' || b.complaintType === 'noshow')) return 'already_reported'
  const { status } = effectiveStatus(b, now)
  if (status !== 'confirmed' && status !== 'completed') return 'invalid_status'
  if (type !== 'noshow' && type !== 'late') return null
  if (now < startOf(b)) return 'not_started'
  if (type === 'late') return null
  return now <= endOf(b) + NOSHOW_MARK_HOURS * HOUR ? null : 'noshow_window_passed'
}

/** A mistaken complaint is taken back from the booking drawer this long after it was filed (book Q-207). */
export const COMPLAINT_UNDO_DAYS = 7

/** Take a complaint back (Q-207): one there, filed less than 7 days ago. A no-show goes back to the visit it was. */
export function canRemoveComplaint(b: { complaintType: ComplaintType | null; complaintAt: number | null }, now = Date.now()): Guard {
  if (!b.complaintType || b.complaintAt === null) return 'invalid_status'
  return now - b.complaintAt < COMPLAINT_UNDO_DAYS * 86_400_000 ? null : 'complaint_locked'
}

/** The status a booking takes back when its no-show is taken back: completed once the visit's end has passed. */
export const statusWithoutNoShow = (b: Pick<BookingState, 'date' | 'end'>, now = Date.now()): 'confirmed' | 'completed' =>
  now >= endOf(b) ? 'completed' : 'confirmed'
