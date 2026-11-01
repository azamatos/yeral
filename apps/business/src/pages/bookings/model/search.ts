import { BOOKING_TABS } from '@yeral/contract/calendar'
import { addDays, dow } from '@yeral/domain/time'

export type BookingsTab = 'requests' | (typeof BOOKING_TABS)[number]
/** The date filter's choices (B-Bookings `dateOpts`): all time without one. */
export type BookingsWhen = 'today' | 'week'

/** The list's address (B-Bookings, B-30): the tab, the filters, the booking or request open in its drawer. */
export type BookingsSearch = {
  tab?: BookingsTab
  q?: string
  staff?: string
  service?: string
  when?: BookingsWhen
  booking?: string
  request?: string
}

const text = (value: unknown) => (typeof value === 'string' && value ? value : null)

/** What's not a tab or a filter leaves the list as it opens: the requests, nothing filtered. */
export function bookingsSearch(search: Record<string, unknown>): BookingsSearch {
  const tab = (['requests', ...BOOKING_TABS] as const).find((t) => t === search.tab)
  const q = text(search.q)
  const staff = text(search.staff)
  const service = text(search.service)
  const booking = text(search.booking)
  const request = text(search.request)
  return {
    ...(tab ? { tab } : {}),
    ...(q ? { q } : {}),
    ...(staff ? { staff } : {}),
    ...(service ? { service } : {}),
    ...(search.when === 'today' || search.when === 'week' ? { when: search.when } : {}),
    ...(booking ? { booking } : {}),
    ...(request ? { request } : {}),
  }
}

/** The days a date choice covers; the week runs Monday to Sunday, as the calendar's. */
export function rangeOf(when: BookingsWhen | undefined, today: string): { from?: string; to?: string } {
  if (when === 'today') return { from: today, to: today }
  if (when !== 'week') return {}
  const from = addDays(today, -dow(today))
  return { from, to: addDays(from, 6) }
}
