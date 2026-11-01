import type { CalendarBooking } from '@yeral/contract/calendar'
import { localOf } from '@yeral/domain/time'

/** The team may move a booking (book B-26): confirmed, not started yet, no client's move waiting for an answer. */
export function canMoveBooking(b: Pick<CalendarBooking, 'status' | 'date' | 'start' | 'move'>, now: number): boolean {
  const at = localOf(now)
  const ahead = b.date > at.date || (b.date === at.date && b.start >= at.min)
  return b.status === 'confirmed' && ahead && !b.move
}
