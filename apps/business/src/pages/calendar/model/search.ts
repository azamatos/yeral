import { isYmd } from '@yeral/domain/time'

/** The calendar's address (B-Calendar): the day (`YYYY-MM-DD`, today without it), cancelled shown, the booking open. */
export type CalendarSearch = { date?: string; cancelled?: true; booking?: string }

/** A real day only: «2026-02-30» or anything else leaves the calendar on today. */
export function calendarSearch(search: Record<string, unknown>): CalendarSearch {
  return {
    ...(typeof search.date === 'string' && isYmd(search.date) ? { date: search.date } : {}),
    ...(search.cancelled === true ? { cancelled: true as const } : {}),
    ...(typeof search.booking === 'string' && search.booking ? { booking: search.booking } : {}),
  }
}
