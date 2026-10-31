import type { CalendarBooking } from '@yeral/contract/calendar'
import { canBusinessCancel, canComplain, canRemoveComplaint, type BookingState } from '@yeral/domain/lifecycle'
import { COMPLAINT_TYPES, type ComplaintType } from '@yeral/domain/model'
import type { Level } from '@yeral/domain/permissions'

/** The booking as the lifecycle rules read it. */
export const stateOf = (b: CalendarBooking): BookingState => ({
  date: b.date,
  start: b.start,
  end: b.end,
  status: b.status,
  cancelledBy: b.cancelledBy,
  holdUntil: b.holdUntil,
  complaintType: b.complaint?.type ?? null,
})

/**
 * What the Report menu offers now (book B-28, design §28 round 3.1: one report per booking), in the menu's order: a
 * no-show from the visit's start until 24 hours after its end, «Came late» from the start, the rest any time on a
 * confirmed or completed booking; with a report of another kind already there, only a no-show, which replaces it.
 * Empty: no Report button.
 */
export const reportKinds = (b: CalendarBooking, now: number): ComplaintType[] => {
  const state = stateOf(b)
  return COMPLAINT_TYPES.filter((type) => canComplain(state, type, now) === null)
}

/**
 * «Remove report» (book Q-207): within 7 days of filing; the owner and administrators remove any, a specialist the
 * ones they filed (`by.staffId`; a specialist whose id isn't known removes none).
 */
export const canRemoveReport = (b: CalendarBooking, now: number, viewer: { level: Level; staffId?: string }): boolean => {
  const c = b.complaint
  if (!c || canRemoveComplaint({ complaintType: c.type, complaintAt: c.at }, now) !== null) return false
  return viewer.level !== 'specialist' || (!!viewer.staffId && c.by?.staffId === viewer.staffId)
}

/** «Cancel booking» (book B-27): a confirmed booking that hasn't started; a request is declined instead. */
export const canCancelBooking = (b: CalendarBooking, now: number): boolean => canBusinessCancel(stateOf(b), now) === null
