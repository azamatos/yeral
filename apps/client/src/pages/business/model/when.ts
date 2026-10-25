import type { BusinessDetail } from '@yeral/contract/catalog'
import { businessDay, currentBusinessDate, workingIntervals, type BusinessHours } from '@yeral/domain/hours'
import { addDays, dow } from '@yeral/domain/time'
import type { Fmt } from '@yeral/i18n'

type Words = (key: 'openUntil' | 'opensToday' | 'opensTomorrow' | 'opensOn' | 'closed', values?: Record<string, string>) => string

/** The page's week and its special days (the next 14, each one date) as the domain's rules read them. */
function calendarOf(detail: Pick<BusinessDetail, 'hours' | 'specialDays'>): BusinessHours {
  return {
    hours: detail.hours,
    exceptions: detail.specialDays.map((d) => ({ name: d.name, from: d.date, to: d.date, yearly: false, hours: d.hours })),
  }
}

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

/**
 * The hours of the business day under way (`currentBusinessDate`: yesterday's while it runs past midnight, book
 * Q-105), a special day winning over the week (`businessDay`); closed, the special day's name when it has one.
 */
export function dayHours(
  detail: Pick<BusinessDetail, 'hours' | 'specialDays'>,
  now: number,
  fmt: Fmt,
): { hours: string } | { closed: true; reason: string | null } {
  const calendar = calendarOf(detail)
  const date = currentBusinessDate(calendar, now)
  const day = businessDay(calendar, date)
  if (day) return { hours: fmt.timeRange(day.open, day.close) }
  return { closed: true, reason: detail.specialDays.find((d) => d.date === date)?.name ?? null }
}

export interface WeekRow {
  date: string
  today: boolean
  /** «09:00–20:00», a break as two stretches («09:00–13:00, 14:00–20:00»); null when closed. */
  hours: string | null
  /** The special day's name («Holiday»), when one sets the day's hours. */
  special: string | null
}

/**
 * The hours table (Venue «Iş wagty», States 06): Monday to Sunday, each as the coming day of that name has it from the
 * business day under way (today's own), so a special day in the next week shows with its name; today marked.
 */
export function weekRows(detail: Pick<BusinessDetail, 'hours' | 'specialDays'>, now: number, fmt: Fmt): WeekRow[] {
  const calendar = calendarOf(detail)
  const current = currentBusinessDate(calendar, now)
  return Array.from({ length: 7 }, (_, i) => addDays(current, i))
    .sort((a, b) => dow(a) - dow(b))
    .map((date) => {
      const day = businessDay(calendar, date)
      return {
        date,
        today: date === current,
        hours:
          day &&
          workingIntervals(day)
            .map((s) => fmt.timeRange(s.start, s.end))
            .join(', '),
        special: detail.specialDays.find((d) => d.date === date)?.name ?? null,
      }
    })
}
