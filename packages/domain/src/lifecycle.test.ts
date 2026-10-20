import { describe, expect, it } from 'vitest'
import {
  canAnswerRequest,
  canBusinessCancel,
  canBusinessMove,
  cancelledByFor,
  canUndoNewBooking,
  canClientCancel,
  canClientReschedule,
  canClientRestore,
  canComplain,
  canEditNote,
  canWriteReview,
  keptCancelReason,
  NEW_BOOKING_SMS_AFTER_MS,
  newsSms,
  toldOf,
  NEW_BOOKING_UNDO_MS,
  waitingLimit,
  cancelDeadline,
  clientActions,
  dueTransition,
  effectiveStatus,
  holdUntil,
  initialStatus,
  occupiesSlot,
  offerPast,
  type BookingState,
  type RestoreState,
  typicalAnswerMinutes,
} from './lifecycle'
import type { BusinessHours } from './hours'
import { epochOf } from './time'

// Wednesday 2026-10-14, 10:00 at the business
const NOW = Date.parse('2026-10-14T05:00:00Z')
const TODAY = '2026-10-14'
const THU = '2026-10-15'
const MIN = 60_000

const booking = (over: Partial<BookingState> = {}): BookingState => ({ date: THU, start: 870, end: 930, status: 'confirmed', ...over })
const rules = { cancelWindowMinutes: 120 }

describe('typicalAnswerMinutes (book Q-113)', () => {
  it('the median, rounded up to a step; hidden under 5 answers', () => {
    expect(typicalAnswerMinutes([3, 4, 6, 8])).toBeNull()
    expect(typicalAnswerMinutes([3, 4, 6, 8, 9])).toBe(10)
    expect(typicalAnswerMinutes([12, 14, 15, 2, 300])).toBe(15)
    expect(typicalAnswerMinutes([40, 50, 70, 80, 90, 100])).toBe(90) // median 75
    expect(typicalAnswerMinutes([60, 60, 60, 60, 60])).toBe(60)
    expect(typicalAnswerMinutes([2000, 2000, 2000, 2000, 2000])).toBe(2880)
    // requests let run out count at the wait the client had; the five are answers only
    expect(typicalAnswerMinutes([5, 5, 5, 5, 5], [30, 30, 30, 30, 30, 30])).toBe(30)
    expect(typicalAnswerMinutes([5, 5, 5, 5], [30, 30, 30, 30, 30, 30])).toBeNull()
  })
})

describe('newsSms (book B-24, B-26)', () => {
  const at10 = toldOf({ date: THU, start: 600 }, ['maral'])
  const at11 = toldOf({ date: THU, start: 660 }, ['maral'])
  const jeren10 = toldOf({ date: THU, start: 600 }, ['jeren'])
  const jeren11 = toldOf({ date: THU, start: 660 }, ['jeren'])

  it('a confirmation tells the booking as it is; one the client chose online and that changed says what changed', () => {
    expect(newsSms('booked', false, at10, at11)).toBe('booked')
    // agreed with Maral on the phone, given to Jeren before the SMS went: it names Jeren
    expect(newsSms('booked', false, at10, jeren10)).toBe('bookedWith')
    expect(newsSms('confirmed', true, at10, at10)).toBe('confirmed')
    expect(newsSms('confirmed', true, at10, at11)).toBe('moved')
    expect(newsSms('confirmed', true, at10, jeren10)).toBe('staffChanged')
  })

  it('a change says what changed since the client knew it, and nothing when it’s back as they knew it', () => {
    expect(newsSms('moved', false, at10, at11)).toBe('moved')
    expect(newsSms('moved', false, at10, jeren11)).toBe('movedWith')
    expect(newsSms('moved', false, at10, jeren10)).toBe('staffChanged')
    expect(newsSms('moved', true, at10, at10)).toBeNull()
  })

  it('a booking from before what the client knows was kept: told as queued', () => {
    expect(newsSms('moved', false, null, at11)).toBe('moved')
    expect(newsSms('confirmed', true, null, at11)).toBe('confirmed')
  })
})

describe('canClientRestore (ROUND6 A6)', () => {
  const cancelled = (over: Partial<RestoreState> = {}): RestoreState => ({
    ...booking({ status: 'cancelled', cancelledBy: 'client', holdUntil: NOW + 30 * MIN }),
    cancelledAt: NOW,
    wasConfirmed: false,
    isMove: false,
    byTeam: false,
    ...over,
  })
  it('within 5 minutes of the client’s own cancel, each refusal its own reason', () => {
    expect(canClientRestore(cancelled(), NOW + MIN)).toBeNull()
    expect(canClientRestore(cancelled(), NOW + 5 * MIN)).toBe('restore_expired')
    expect(canClientRestore(cancelled({ cancelledBy: 'business' }), NOW + MIN)).toBe('invalid_status')
    // a second tap, after the first brought it back
    expect(canClientRestore(cancelled({ status: 'pending' }), NOW + MIN)).toBe('invalid_status')
    expect(canClientRestore(cancelled({ isMove: true }), NOW + MIN)).toBe('invalid_status')
    // "The client called to cancel", entered by the team (B-27): the client calls again
    expect(canClientRestore(cancelled({ byTeam: true }), NOW + MIN)).toBe('invalid_status')
    // the visit started a minute after the cancel
    expect(canClientRestore(cancelled({ date: TODAY, start: 601 }), NOW + 2 * MIN)).toBe('already_started')
    // the answer time ran out; a confirmed booking has none to run out
    expect(canClientRestore(cancelled({ holdUntil: NOW + MIN }), NOW + 2 * MIN)).toBe('request_expired')
    expect(canClientRestore(cancelled({ holdUntil: null, wasConfirmed: true }), NOW + 2 * MIN)).toBeNull()
  })
})

describe('keptCancelReason (book Q-163)', () => {
  it('kept only when the business asks, and never blank', () => {
    expect(keptCancelReason({ askCancelReason: true }, 'Meýilnamam üýtgedi')).toBe('Meýilnamam üýtgedi')
    expect(keptCancelReason({ askCancelReason: true }, '   ')).toBeNull()
    expect(keptCancelReason({ askCancelReason: true }, undefined)).toBeNull()
    expect(keptCancelReason({ askCancelReason: false }, 'Meýilnamam üýtgedi')).toBeNull()
  })
})

describe('waitingLimit (book Q-124)', () => {
  it('3 waiting at one business, 10 in all', () => {
    expect(waitingLimit(2, 9)).toBeNull()
    expect(waitingLimit(3, 3)).toEqual({ scope: 'business', limit: 3 })
    expect(waitingLimit(0, 10)).toEqual({ scope: 'all', limit: 10 })
    expect(waitingLimit(3, 10)).toEqual({ scope: 'business', limit: 3 })
  })
})

describe('initialStatus', () => {
  it.each([
    ['web', 'manual', 'pending'],
    ['app', 'manual', 'pending'],
    ['web', 'instant', 'confirmed'],
    ['phone', 'manual', 'confirmed'],
    ['walkin', 'manual', 'confirmed'],
  ] as const)('%s booking in %s mode starts %s', (source, mode, expected) => {
    expect(initialStatus(source, mode)).toBe(expected)
  })
})

describe('hold time (counted only while the business is open, book Q-120)', () => {
  const h = (open: number, close: number, br?: { start: number; end: number }) => ({ open, close, break: br ?? null })
  /** every day 09:00–20:00 */
  const DAYS: BusinessHours = { hours: Array.from({ length: 7 }, () => h(540, 1200)), exceptions: [] }

  it('holds a request for the business’s hold time while it’s open', () => {
    expect(holdUntil(NOW, booking(), 30, DAYS)).toBe(NOW + 30 * MIN)
  })

  it('never past the visit start', () => {
    expect(holdUntil(NOW, booking({ date: TODAY, start: 615 }), 30, DAYS)).toBe(epochOf(TODAY, 615))
  })

  it('sent while closed, the hold starts at the opening; before closing, it carries over to the next day', () => {
    // sent Wednesday 23:00 for Friday: the 30 minutes run from Thursday 09:00
    expect(holdUntil(epochOf(TODAY, 1380), booking({ date: '2026-10-16' }), 30, DAYS)).toBe(epochOf(THU, 570))
    // sent Wednesday 19:50 with an hour's hold: 10 minutes today, 50 from Thursday 09:00
    expect(holdUntil(epochOf(TODAY, 1190), booking({ date: '2026-10-16' }), 60, DAYS)).toBe(epochOf(THU, 590))
  })

  it('a break stops the hold; a closed day doesn’t count', () => {
    const lunch: BusinessHours = { hours: Array.from({ length: 7 }, () => h(540, 1200, { start: 780, end: 840 })), exceptions: [] }
    // sent Wednesday 12:50 with a 30-minute hold: 10 minutes before the break, 20 after it
    expect(holdUntil(epochOf(TODAY, 770), booking(), 30, lunch)).toBe(epochOf(TODAY, 860))
    const thursdayOff: BusinessHours = { hours: DAYS.hours, exceptions: [{ name: 'Baýramçylyk', from: THU, to: THU, yearly: false }] }
    expect(holdUntil(epochOf(TODAY, 1380), booking({ date: '2026-10-16' }), 30, thursdayOff)).toBe(epochOf('2026-10-16', 570))
  })

  it('no open time before the visit: the hold counts plain time, not until the visit', () => {
    // sent Wednesday 23:00 for Thursday 09:00, the opening: nothing open in between
    expect(holdUntil(epochOf(TODAY, 1380), booking({ date: THU, start: 540 }), 30, DAYS)).toBe(epochOf(TODAY, 1410))
  })

  it('overlapping hours (a special day past midnight) aren’t counted twice', () => {
    // Wednesday a special 18:00–04:00, Thursday opens at 02:00: 02:00–04:00 is one stretch of open time
    const overlap: BusinessHours = {
      hours: Array.from({ length: 7 }, () => h(120, 1200)),
      exceptions: [{ name: 'Gala', from: TODAY, to: TODAY, yearly: false, hours: { open: 1080, close: 1680 } }],
    }
    // sent Thursday 01:00 (Wednesday's night), a 6-hour hold: 01:00–07:00 Thursday, open the whole time
    expect(holdUntil(epochOf(THU, 60), booking({ date: '2026-10-16' }), 360, overlap)).toBe(epochOf(THU, 420))
  })

  it('a night open past midnight keeps counting after it', () => {
    const bar: BusinessHours = { hours: Array.from({ length: 7 }, () => h(1080, 1560)), exceptions: [] }
    // sent Wednesday at 23:50 for Friday, an hour's hold: until Thursday 00:50, still Wednesday's night
    expect(holdUntil(epochOf(TODAY, 1430), booking({ date: '2026-10-16', start: 1200 }), 60, bar)).toBe(epochOf(TODAY, 1490))
    // sent Thursday 00:30 (Wednesday's night): from yesterday's day too
    expect(holdUntil(epochOf(THU, 30), booking({ date: '2026-10-16', start: 1200 }), 30, bar)).toBe(epochOf(THU, 60))
  })
})

describe('a move’s hold (book Q-263)', () => {
  it('never outlives the visit it would move', () => {
    const allDay: BusinessHours = { hours: Array.from({ length: 7 }, () => ({ open: 0, close: 1440 })), exceptions: [] }
    // asked at 10:00 to move a 10:40 visit to Thursday: a 2-hour hold would end at 12:00
    expect(holdUntil(NOW, { date: THU, start: 600 }, 120, allDay)).toBe(NOW + 120 * MIN)
    expect(holdUntil(NOW, { date: THU, start: 600 }, 120, allDay, epochOf(TODAY, 640))).toBe(epochOf(TODAY, 640))
  })
})

describe('offered times (book Q-264)', () => {
  it('an offered time is past once it starts earlier than now plus the lead time', () => {
    // now 10:00, lead 60 minutes
    expect(offerPast({ date: TODAY, start: 660 }, 60, NOW)).toBe(false)
    expect(offerPast({ date: TODAY, start: 659 }, 60, NOW)).toBe(true)
    expect(offerPast({ date: THU, start: 540 }, 60, NOW)).toBe(false)
  })
})

describe('effectiveStatus and jobs', () => {
  const pending = booking({ status: 'pending', holdUntil: NOW + 30 * MIN })

  it('an unanswered request expires as cancelled by the system', () => {
    expect(effectiveStatus(pending, NOW)).toEqual({ status: 'pending', cancelledBy: null })
    expect(effectiveStatus(pending, NOW + 30 * MIN)).toEqual({ status: 'cancelled', cancelledBy: 'system' })
    expect(dueTransition(pending, NOW + 30 * MIN)).toBe('expire')
  })

  it('a confirmed visit is completed once it ends', () => {
    const end = epochOf(THU, 930)
    expect(effectiveStatus(booking(), end - 1).status).toBe('confirmed')
    expect(effectiveStatus(booking(), end).status).toBe('completed')
    expect(dueTransition(booking(), end)).toBe('complete')
    expect(dueTransition(booking(), end - 1)).toBeNull()
  })

  it('keeps who cancelled and leaves final statuses alone', () => {
    expect(effectiveStatus(booking({ status: 'cancelled', cancelledBy: 'business' }), NOW)).toEqual({
      status: 'cancelled',
      cancelledBy: 'business',
    })
    expect(effectiveStatus(booking({ status: 'noshow' }), NOW).status).toBe('noshow')
  })

  it('a job does exactly what effectiveStatus already shows', () => {
    const statuses = ['pending', 'confirmed', 'completed', 'cancelled', 'noshow'] as const
    const holds = [null, NOW + 30 * MIN]
    const times = [NOW, NOW + 30 * MIN, epochOf(THU, 870), epochOf(THU, 930), epochOf(THU, 931)]
    for (const status of statuses)
      for (const hold of holds)
        for (const now of times) {
          const b = booking({ status, holdUntil: hold })
          const shown = effectiveStatus(b, now).status
          const expected = shown === b.status ? null : shown === 'cancelled' ? 'expire' : 'complete'
          expect(dueTransition(b, now), `${status} ${hold} ${now}`).toBe(expected)
        }
  })

  it('pending and confirmed bookings take their slot', () => {
    expect(occupiesSlot(pending, NOW)).toBe(true)
    expect(occupiesSlot(pending, NOW + 31 * MIN)).toBe(false)
    expect(occupiesSlot(booking({ status: 'cancelled' }), NOW)).toBe(false)
  })
})

describe('client actions', () => {
  it('the cancellation deadline is the window before the start; no window = until the start', () => {
    expect(cancelDeadline(rules, booking())).toBe(epochOf(THU, 750))
    expect(cancelDeadline({ cancelWindowMinutes: null }, booking())).toBe(epochOf(THU, 870))
    // a window can reach into the day before
    expect(cancelDeadline({ cancelWindowMinutes: 1440 }, booking({ start: 60 }))).toBe(epochOf(TODAY, 60))
  })

  it('a request can be cancelled any time; a confirmed booking until the window', () => {
    expect(canClientCancel(booking({ status: 'pending', holdUntil: NOW + MIN }), rules, NOW)).toBeNull()
    expect(canClientCancel(booking(), rules, epochOf(THU, 749))).toBeNull()
    expect(canClientCancel(booking(), rules, epochOf(THU, 750))).toBe('cancel_window_passed')
    expect(canClientCancel(booking({ status: 'completed' }), rules, NOW)).toBe('invalid_status')
  })

  it('only a confirmed booking can be moved, and only until the window', () => {
    expect(canClientReschedule(booking(), rules, NOW)).toBeNull()
    expect(canClientReschedule(booking({ status: 'pending', holdUntil: NOW + MIN }), rules, NOW)).toBe('invalid_status')
    expect(canClientReschedule(booking(), rules, epochOf(THU, 800))).toBe('cancel_window_passed')
  })

  it('the note can be edited while the request waits', () => {
    expect(canEditNote(booking({ status: 'pending', holdUntil: NOW + MIN }), NOW)).toBeNull()
    expect(canEditNote(booking(), NOW)).toBe('invalid_status')
  })

  it('lists the actions per status (client spec §4.8)', () => {
    expect(clientActions(booking(), rules, null, NOW)).toEqual({
      cancel: true,
      reschedule: true,
      editNote: false,
      callOnly: false,
      review: false,
      editReview: false,
      bookAgain: false,
    })
    expect(clientActions(booking(), rules, null, epochOf(THU, 800))).toMatchObject({ cancel: false, reschedule: false, callOnly: true })
    const after = epochOf(THU, 940)
    expect(clientActions(booking(), rules, null, after)).toMatchObject({ review: true, bookAgain: true })
    expect(clientActions(booking(), rules, { createdAt: after }, after + 6 * 86_400_000)).toMatchObject({ review: false, editReview: true })
    expect(clientActions(booking(), rules, { createdAt: after }, after + 7 * 86_400_000)).toMatchObject({ editReview: false })
    expect(clientActions(booking({ status: 'noshow' }), rules, null, NOW)).toMatchObject({ bookAgain: true, review: false })
  })
})

describe('business actions', () => {
  it('answers a request until it expires', () => {
    const pending = booking({ status: 'pending', holdUntil: NOW + 30 * MIN })
    expect(canAnswerRequest(pending, NOW)).toBeNull()
    expect(canAnswerRequest(pending, NOW + 30 * MIN)).toBe('request_expired')
    expect(canAnswerRequest(booking(), NOW)).toBe('invalid_status')
  })

  it('cancels or moves a booking before it starts', () => {
    expect(canBusinessCancel(booking(), NOW)).toBeNull()
    expect(canBusinessCancel(booking(), epochOf(THU, 870))).toBe('already_started')
    expect(canBusinessCancel(booking({ status: 'pending', holdUntil: NOW + MIN }), NOW)).toBe('invalid_status')
    // a request is answered, not moved (B-26)
    expect(canBusinessMove(booking({ status: 'pending', holdUntil: NOW + MIN }), NOW)).toBe('invalid_status')
    expect(canBusinessMove(booking(), NOW)).toBeNull()
    expect(cancelledByFor('client_called')).toBe('client')
    expect(cancelledByFor('staff_away')).toBe('business')
    expect(cancelledByFor('other')).toBe('business')
    expect(canBusinessMove(booking(), epochOf(THU, 880))).toBe('already_started')
  })

  it('undoes a booking it just added by phone or for a walk-in, within the undo time (B-24)', () => {
    const added = { status: 'confirmed' as const, source: 'phone' as const, createdAt: NOW }
    expect(canUndoNewBooking(added, NOW + NEW_BOOKING_UNDO_MS - 1)).toBeNull()
    expect(canUndoNewBooking({ ...added, source: 'walkin' }, NOW)).toBeNull()
    expect(canUndoNewBooking(added, NOW + NEW_BOOKING_UNDO_MS)).toBe('undo_expired')
    expect(canUndoNewBooking({ ...added, source: 'web' }, NOW)).toBe('invalid_status')
    expect(canUndoNewBooking({ ...added, status: 'cancelled' }, NOW)).toBe('invalid_status')
    // the client's SMS waits past the last moment an undo is taken
    expect(NEW_BOOKING_SMS_AFTER_MS).toBeGreaterThan(NEW_BOOKING_UNDO_MS)
  })

  it('a no-show from the start until a day after the end; other complaints any time (book Q-206, Q-254)', () => {
    expect(canComplain(booking(), 'noshow', NOW)).toBe('not_started')
    expect(canComplain(booking(), 'noshow', epochOf(THU, 870))).toBeNull()
    expect(canComplain(booking(), 'noshow', epochOf(THU, 1000))).toBeNull() // completed by then
    // the visit ends at 15:30: until 15:30 the next day
    expect(canComplain(booking(), 'noshow', epochOf(THU, 930) + 24 * 60 * MIN)).toBeNull()
    expect(canComplain(booking(), 'noshow', epochOf(THU, 930) + 24 * 60 * MIN + 1)).toBe('noshow_window_passed')
    // rude on the phone the day before: a complaint already; late only once the visit has started
    expect(canComplain(booking(), 'rude', NOW)).toBeNull()
    expect(canComplain(booking(), 'late', NOW)).toBe('not_started')
    expect(canComplain(booking(), 'late', epochOf(THU, 930) + 40 * 24 * 60 * MIN)).toBeNull()
    expect(canComplain(booking({ complaintType: 'late' }), 'other', epochOf(THU, 900))).toBe('already_reported')
    // the rude call the day before doesn't keep the no-show from counting; a no-show stays one
    expect(canComplain(booking({ complaintType: 'rude' }), 'noshow', epochOf(THU, 880))).toBeNull()
    expect(canComplain(booking({ complaintType: 'noshow' }), 'noshow', epochOf(THU, 880))).toBe('already_reported')
    expect(canComplain(booking({ status: 'cancelled' }), 'rude', epochOf(THU, 900))).toBe('invalid_status')
  })

  it('a review of a completed visit, until 30 days after it (book Q-126)', () => {
    const end = epochOf(THU, 930)
    expect(canWriteReview(booking(), end - MIN)).toBe('review_not_allowed')
    expect(canWriteReview(booking(), end + 30 * 24 * 60 * MIN)).toBeNull()
    expect(canWriteReview(booking(), end + 30 * 24 * 60 * MIN + 1)).toBe('review_window_passed')
    expect(clientActions(booking(), rules, null, end + 30 * 24 * 60 * MIN).review).toBe(true)
    expect(clientActions(booking(), rules, null, end + 30 * 24 * 60 * MIN + 1).review).toBe(false)
  })
})
