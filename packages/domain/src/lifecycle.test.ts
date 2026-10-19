import { describe, expect, it } from 'vitest'
import {
  canAnswerRequest,
  canBusinessCancel,
  canBusinessMove,
  canClientCancel,
  canClientReschedule,
  canComplain,
  canEditNote,
  cancelDeadline,
  clientActions,
  dueTransition,
  effectiveStatus,
  holdUntil,
  initialStatus,
  occupiesSlot,
  type BookingState,
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

  it('a night open past midnight keeps counting after it', () => {
    const bar: BusinessHours = { hours: Array.from({ length: 7 }, () => h(1080, 1560)), exceptions: [] }
    // sent Wednesday at 23:50 for Friday, an hour's hold: until Thursday 00:50, still Wednesday's night
    expect(holdUntil(epochOf(TODAY, 1430), booking({ date: '2026-10-16', start: 1200 }), 60, bar)).toBe(epochOf(TODAY, 1490))
    // sent Thursday 00:30 (Wednesday's night): from yesterday's day too
    expect(holdUntil(epochOf(THU, 30), booking({ date: '2026-10-16', start: 1200 }), 30, bar)).toBe(epochOf(THU, 60))
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
    expect(canBusinessMove(booking({ status: 'pending', holdUntil: NOW + MIN }), NOW)).toBeNull()
    expect(canBusinessMove(booking(), epochOf(THU, 880))).toBe('already_started')
  })

  it('files one complaint once the visit has started', () => {
    expect(canComplain(booking(), NOW)).toBe('not_started')
    expect(canComplain(booking(), epochOf(THU, 870))).toBeNull()
    expect(canComplain(booking(), epochOf(THU, 1000))).toBeNull() // completed by then
    expect(canComplain(booking({ hasComplaint: true }), epochOf(THU, 900))).toBe('already_reported')
    expect(canComplain(booking({ status: 'cancelled' }), epochOf(THU, 900))).toBe('invalid_status')
  })
})
