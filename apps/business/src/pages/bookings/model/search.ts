import { BOOKING_SORTS, BOOKING_TABS, type BookingSort } from '@yeral/contract/calendar'
import { BOOKING_STATUSES, type BookingStatus } from '@yeral/domain/model'
import { addDays, dow } from '@yeral/domain/time'

export type BookingsTab = 'requests' | (typeof BOOKING_TABS)[number]
/** The date filter's choices (B-Bookings `dateOpts`, DS-Lists A5): all time without one. */
export type BookingsWhen = 'today' | 'tomorrow' | 'week'

/**
 * The list's address (B-Bookings, B-30): the tab, the filters, the order, the booking or request open in its drawer.
 * `staff`, `service` and `status` hold one value or several comma-separated (`staff=a,b`), so an old one-value link opens.
 */
export type BookingsSearch = {
  tab?: BookingsTab
  q?: string
  staff?: string
  service?: string
  status?: string
  when?: BookingsWhen
  /** `sortBy`: the clients list's `sort` takes other values, and the router keeps one type per name. */
  sortBy?: BookingSort
  booking?: string
  request?: string
}

const text = (value: unknown) => (typeof value === 'string' && value ? value : null)

/** A list filter's values from the address: `a,b` (an array too, as a hand-made address may hold). */
export function listOf(value: unknown): string[] {
  const parts = (Array.isArray(value) ? value : [value]).flatMap((v) => (typeof v === 'string' ? v.split(',') : []))
  return [...new Set(parts.map((v) => v.trim()).filter(Boolean))]
}

/** A list filter's values for the address; none leaves it out. */
export const joined = (values: readonly string[]) => (values.length ? values.join(',') : undefined)

/** The statuses each tab can hold, as people see them now (a cancelled booking has its own tab). */
export const TAB_STATUSES: Record<(typeof BOOKING_TABS)[number], readonly BookingStatus[]> = {
  today: ['pending', 'confirmed', 'completed', 'noshow'],
  upcoming: ['pending', 'confirmed'],
  past: ['completed', 'noshow'],
  cancelled: [],
}

/** What's not a tab or a filter leaves the list as it opens: the requests, nothing filtered. */
export function bookingsSearch(search: Record<string, unknown>): BookingsSearch {
  const tab = (['requests', ...BOOKING_TABS] as const).find((t) => t === search.tab)
  const q = text(search.q)
  const staff = joined(listOf(search.staff))
  const service = joined(listOf(search.service))
  const status = joined(listOf(search.status).filter((s) => (BOOKING_STATUSES as readonly string[]).includes(s)))
  const sortBy = BOOKING_SORTS.find((s) => s === search.sortBy)
  const booking = text(search.booking)
  const request = text(search.request)
  return {
    ...(tab ? { tab } : {}),
    ...(q ? { q } : {}),
    ...(staff ? { staff } : {}),
    ...(service ? { service } : {}),
    ...(status ? { status } : {}),
    ...(sortBy ? { sortBy } : {}),
    ...(search.when === 'today' || search.when === 'tomorrow' || search.when === 'week' ? { when: search.when } : {}),
    ...(booking ? { booking } : {}),
    ...(request ? { request } : {}),
  }
}

/** The days a date choice covers; the week runs Monday to Sunday, as the calendar's. */
export function rangeOf(when: BookingsWhen | undefined, today: string): { from?: string; to?: string } {
  if (when === 'today') return { from: today, to: today }
  if (when === 'tomorrow') return { from: addDays(today, 1), to: addDays(today, 1) }
  if (when !== 'week') return {}
  const from = addDays(today, -dow(today))
  return { from, to: addDays(from, 6) }
}
