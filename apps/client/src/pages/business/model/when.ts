import type { BusinessDetail } from '@yeral/contract/catalog'
import { addDays, dow } from '@yeral/domain/time'
import type { Fmt } from '@yeral/i18n'

type Words = (key: 'openUntil' | 'opensToday' | 'opensTomorrow' | 'opensOn' | 'closed', values?: Record<string, string>) => string

/**
 * The page's open line (Venue «Häzir açyk · 20:00-a çenli», States 06): open until the closing time (past midnight read
 * as the next day's clock), else closed with when it opens next: today, tomorrow or the day, from the api's open state.
 */
export function openLine(open: BusinessDetail['open'], today: string, fmt: Fmt, t: Words): { text: string; isOpen: boolean } {
  if (open.open) return { text: t('openUntil', { time: fmt.time(open.until) }), isOpen: true }
  if (open.inDays === null || open.at === null) return { text: t('closed'), isOpen: false }
  const time = fmt.time(open.at)
  if (open.inDays === 0) return { text: t('opensToday', { time }), isOpen: false }
  if (open.inDays === 1) return { text: t('opensTomorrow', { time }), isOpen: false }
  return { text: t('opensOn', { day: fmt.relativeDay(addDays(today, open.inDays), today), time }), isOpen: false }
}

/** Today's hours from the week (Monday first), or null when the business is closed today. */
export function todayHours(hours: BusinessDetail['hours'], today: string, fmt: Fmt): string | null {
  const day = hours[dow(today)]
  return day ? fmt.timeRange(day.open, day.close) : null
}

/** «Today 15:30», «Tomorrow 10:00», «Fri, 16 Oct 10:00»: the next free time on the summary card. */
export function nextFreeText(next: BusinessDetail['nextFree'], today: string, fmt: Fmt): string | null {
  return next ? `${fmt.relativeShortDate(next.date, today)} ${fmt.time(next.start)}` : null
}
