import type { BookingDetail, OfferSource, OfferedTime, TIMELINE_EVENTS } from '@yeral/contract/bookings'
import type { TimelineTone } from '@yeral/ui/timeline'

export type TimelineEvent = (typeof TIMELINE_EVENTS)[number]

/** A step of the drawer's status history: what happened (and when), or what's happening now and next. */
export type DrawerStep =
  | { kind: 'event'; event: TimelineEvent; at: number; tone: TimelineTone }
  | { kind: 'waiting'; tone: 'current' }
  | { kind: 'visit'; tone: 'todo' }
  | { kind: 'took'; code: string; request: boolean; tone: 'accent' }

const TONE: Record<TimelineEvent, TimelineTone> = {
  sent: 'accent',
  confirmed: 'accent',
  moved: 'accent',
  reschedule_requested: 'accent',
  completed: 'success',
  declined: 'slate',
  expired: 'slate',
  cancelled_by_client: 'slate',
  cancelled_by_business: 'slate',
  noshow: 'danger',
}

/**
 * The drawer's status history (Account-Bookings `d.steps`, book C-28): what the api's timeline says happened, in its
 * order; a move still waiting is happening now; then, while the booking is ahead, the wait for the business's answer
 * (a request) and the appointment itself; after a decline or an expiry, the booking an offered time became.
 */
export function drawerSteps(b: Pick<BookingDetail, 'timeline' | 'status' | 'reschedule' | 'offerTakenBy' | 'cancelledBy'>): DrawerStep[] {
  const steps: DrawerStep[] = b.timeline.map((e, i, all) => ({
    kind: 'event',
    event: e.event,
    at: e.at,
    // the move asked last, still unanswered, is what's happening now
    tone: e.event === 'reschedule_requested' && b.reschedule && i === all.length - 1 ? 'current' : TONE[e.event],
  }))
  if (b.status === 'pending') steps.push({ kind: 'waiting', tone: 'current' })
  if (b.status === 'pending' || b.status === 'confirmed') steps.push({ kind: 'visit', tone: 'todo' })
  if (b.offerTakenBy) steps.push({ kind: 'took', code: b.offerTakenBy, request: b.cancelledBy === 'system', tone: 'accent' })
  return steps
}

/**
 * The times offered in place of the booking (book C-24, C-25, C-27; B-39, B-40): a decline's, the business's cancel's
 * or, after an expiry, the free ones the system found; none once one is taken (the api empties them).
 */
export function offersOf(
  b: Pick<BookingDetail, 'decline' | 'cancelOffers' | 'expiredAlternatives'>,
): { source: OfferSource; times: OfferedTime[] } | null {
  if (b.decline && b.decline.alternatives.length > 0) return { source: 'decline', times: b.decline.alternatives }
  if (b.cancelOffers.length > 0) return { source: 'cancel', times: b.cancelOffers }
  if (b.expiredAlternatives.length > 0) return { source: 'expired', times: b.expiredAlternatives }
  return null
}

/** The cancel modal's reasons (Account-Bookings `reasons`): the words go to the business as the client's own. */
export const CANCEL_REASONS = ['plan', 'time', 'place', 'other'] as const
export type CancelReason = (typeof CANCEL_REASONS)[number]
