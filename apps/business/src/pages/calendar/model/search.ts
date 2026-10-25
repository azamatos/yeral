import { isYmd } from '@yeral/domain/time'

/**
 * The calendar's address (B-Calendar): the day (`YYYY-MM-DD`, today without it), cancelled shown, the booking picked,
 * the request open in its drawer (a new booking's or a client's move's code).
 */
export type CalendarSearch = { date?: string; cancelled?: true; booking?: string; request?: string }

const code = (value: unknown) => (typeof value === 'string' && value ? value : null)

/** A real day only: «2026-02-30» or anything else leaves the calendar on today. */
export function calendarSearch(search: Record<string, unknown>): CalendarSearch {
  const booking = code(search.booking)
  const request = code(search.request)
  return {
    ...(typeof search.date === 'string' && isYmd(search.date) ? { date: search.date } : {}),
    ...(search.cancelled === true ? { cancelled: true as const } : {}),
    ...(booking ? { booking } : {}),
    ...(request ? { request } : {}),
  }
}
