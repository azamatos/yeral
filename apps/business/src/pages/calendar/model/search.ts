import { isYmd } from '@yeral/domain/time'

/**
 * The calendar's address (B-Calendar): the day (`YYYY-MM-DD`, today without it), cancelled shown, the booking picked,
 * the request open in its drawer (a new booking's or a client's move's code), the person a phone shows, the booking
 * in move mode (B-26), the new booking open with what it starts from (B-23: `staff` too, a slot's `start`, a client's
 * id, the services comma-separated).
 */
export type CalendarSearch = {
  date?: string
  cancelled?: true
  booking?: string
  request?: string
  staff?: string
  move?: string
  panel?: 'new'
  start?: number
  client?: string
  services?: string
}

const code = (value: unknown) => (typeof value === 'string' && value ? value : null)

/** A real day only: «2026-02-30» or anything else leaves the calendar on today. */
export function calendarSearch(search: Record<string, unknown>): CalendarSearch {
  const booking = code(search.booking)
  const request = code(search.request)
  const staff = code(search.staff)
  const move = code(search.move)
  const client = code(search.client)
  const services = code(search.services)
  const start = search.start
  return {
    ...(typeof search.date === 'string' && isYmd(search.date) ? { date: search.date } : {}),
    ...(search.cancelled === true ? { cancelled: true as const } : {}),
    ...(booking ? { booking } : {}),
    ...(request ? { request } : {}),
    ...(staff ? { staff } : {}),
    ...(move ? { move } : {}),
    ...(search.panel === 'new' ? { panel: 'new' as const } : {}),
    ...(typeof start === 'number' && Number.isInteger(start) && start >= 0 && start < 2880 ? { start } : {}),
    ...(client ? { client } : {}),
    ...(services ? { services } : {}),
  }
}
