import type { ClientCard } from '@yeral/contract/clients'
import { COMPLAINT_UNDO_DAYS } from '@yeral/domain/lifecycle'
import { localOf } from '@yeral/domain/time'

export type ClientBooking = ClientCard['history'][number]
export type ClientNote = ClientCard['notes'][number]

/** What stops a delete (book Q-208): the visits ahead to cancel and the requests to decline. */
export const aheadOf = (upcoming: readonly ClientBooking[]) => ({
  bookings: upcoming.filter((b) => b.status === 'confirmed').length,
  requests: upcoming.filter((b) => b.status === 'pending').length,
})

/** Alert notes first, each group as the api gives it (B-Client `sorted`). */
export const notesInOrder = (notes: readonly ClientNote[]): ClientNote[] => [
  ...notes.filter((n) => n.alert),
  ...notes.filter((n) => !n.alert),
]

/** The day a report filed at `at` stops being removable (book Q-207). */
export const reportUntil = (at: number): string => localOf(at + COMPLAINT_UNDO_DAYS * 86_400_000).date
