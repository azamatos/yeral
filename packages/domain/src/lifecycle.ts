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
import { isOnlineSource, type BookingSource, type BookingStatus, type CancelledBy, type ConfirmMode } from './model'
import type { BookingRules } from './rules'
import { openStretches, type BusinessHours } from './hours'
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
  /** A complaint was filed ("Arz et"); one per booking. */
  hasComplaint?: boolean
}

export type LifecycleError =
  'invalid_status' | 'request_expired' | 'cancel_window_passed' | 'already_started' | 'not_started' | 'already_reported'

/** At most this many alternative times go with a decline or an expiry. */
export const MAX_ALTERNATIVES = 3
/** A review can be edited this long after it's written. */
export const REVIEW_EDIT_DAYS = 7

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
 * the visit itself.
 */
export function holdUntil(
  createdAt: number,
  b: Pick<BookingState, 'date' | 'start'>,
  holdMinutes: number,
  business: BusinessHours,
): number {
  const start = startOf(b)
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

/** `reminderEvening`: a reminder moved out of the night, worded "tomorrow". */
export type ReminderKind = 'reminderDay' | 'reminder2h' | 'reminderEvening'

const isNight = (epoch: number) => {
  const { min } = localOf(epoch)
  return min >= NIGHT.from || min < NIGHT.to
}

/**
 * When a confirmed visit's reminders go (book Q-257, Q-285): a day before and 2 hours before. One that would arrive at
 * night goes at 21:30 the evening before the visit instead, worded "tomorrow"; when both would, only one goes. A
 * reminder already due when the booking is made (short notice) is left out: the "confirmed" SMS has just told the client.
 */
export function reminderPlan(visitStart: number, now: number): { kind: ReminderKind; runAt: number }[] {
  const evening = epochOf(addDays(localOf(visitStart).date, -1), EVENING_REMINDER_AT)
  const out: { kind: ReminderKind; runAt: number }[] = []
  const planned: [ReminderKind, number][] = [
    ['reminderDay', visitStart - 24 * 3_600_000],
    ['reminder2h', visitStart - 2 * 3_600_000],
  ]
  for (const [kind, runAt] of planned) {
    if (runAt <= now) continue
    if (!isNight(runAt)) out.push({ kind, runAt })
    else if (evening > now && !out.some((r) => r.kind === 'reminderEvening')) out.push({ kind: 'reminderEvening', runAt: evening })
  }
  return out.sort((a, b) => a.runAt - b.runAt)
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
    review: status === 'completed' && !review,
    editReview: status === 'completed' && !!review && now - review.createdAt < REVIEW_EDIT_DAYS * 86_400_000,
    bookAgain: status === 'completed' || status === 'cancelled' || status === 'noshow',
  }
}

// ── Business ──

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

/** Move to another time or specialist (drag in the calendar, "Başga wagta geçir"). */
export function canBusinessMove(b: BookingState, now = Date.now()): Guard {
  const { status } = effectiveStatus(b, now)
  if (status !== 'pending' && status !== 'confirmed') return 'invalid_status'
  return now < startOf(b) ? null : 'already_started'
}

/** "Arz et": once the visit has started, on a confirmed or completed booking, once. */
export function canComplain(b: BookingState, now = Date.now()): Guard {
  if (b.hasComplaint) return 'already_reported'
  const { status } = effectiveStatus(b, now)
  if (status !== 'confirmed' && status !== 'completed') return 'invalid_status'
  return now >= startOf(b) ? null : 'not_started'
}
