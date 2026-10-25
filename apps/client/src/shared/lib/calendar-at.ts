import { DAY_MINUTES } from '@yeral/domain/hours'
import { addDays } from '@yeral/domain/time'

/**
 * A start of a business day as a person reads it: on the next calendar day past midnight (1470 of Friday's business
 * day is Saturday 00:30, book Q-105), so «Today 00:30» never names a time already gone. The api counts starts by the
 * business day; labels count by the calendar.
 */
export function calendarAt(date: string, start: number): { date: string; start: number } {
  return start >= DAY_MINUTES ? { date: addDays(date, 1), start: start - DAY_MINUTES } : { date, start }
}
