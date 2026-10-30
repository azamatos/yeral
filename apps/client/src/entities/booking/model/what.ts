import type { BookingSummary } from '@yeral/contract/bookings'
import type { Fmt } from '@yeral/i18n'
import { calendarAt } from '@/shared/lib'

/**
 * The visit in one line, as the review form and the «How was it?» card head it: what it was for and its date
 * («Check-up · Dr Döwlet · Fri, 23 Oct»; a start past midnight falls on the next date).
 */
export function visitLine(b: Pick<BookingSummary, 'what' | 'date' | 'start'>, fmt: Pick<Fmt, 'shortWeekdayDate'>): string {
  return [...whatParts(b.what), fmt.shortWeekdayDate(calendarAt(b.date, b.start).date)].filter(Boolean).join(' · ')
}

/**
 * What a booking was for, as its lines name it: an appointment's services (joined) and its specialists (each once), a
 * class's session and trainer, a table's area («Check-up», «Dr Döwlet»). The caller joins them with « · ».
 */
export function whatParts(what: BookingSummary['what']): string[] {
  if (what.type === 'appointment')
    return [what.items.map((i) => i.service).join(', '), ...new Set(what.items.map((i) => i.staff).filter((s): s is string => !!s))]
  if (what.type === 'class') return [what.session, ...(what.trainer ? [what.trainer] : [])]
  return [what.area]
}
