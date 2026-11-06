import { addDays, pad2 } from '@yeral/domain/time'

export const QUICK_DAYS = ['any', 'today', 'tomorrow', 'week'] as const
export type QuickDay = (typeof QUICK_DAYS)[number]
export const TIMES_OF_DAY = ['morning', 'afternoon', 'evening'] as const
export type TimeOfDay = (typeof TIMES_OF_DAY)[number]

/** When the client wants a free time (C7-Home «When»): a quick choice or a day from the calendar, and maybe a part of it. */
export type When = { day: QuickDay | { date: string }; tod?: TimeOfDay }
export const ANY_TIME: When = { day: 'any' }

type Address = { day?: Exclude<QuickDay, 'any'>; date?: string; tod?: TimeOfDay }

/**
 * The search's address for a When: the `day` the results page reads (today is its default, so any time sends none),
 * else the `date`; the part of the day rides along. A calendar day that is today or tomorrow reads as that quick choice.
 */
export function whenAddress(when: When, today: string): Address {
  const { day, tod } = when
  const quick = typeof day === 'object' ? quickOf(day.date, today) : day
  if (quick === 'date') return { date: (day as { date: string }).date, tod }
  return { day: quick === 'any' ? undefined : quick, tod }
}

/** The When an address holds (the results page shows it in its bar). */
export function whenOf(a: Address): When {
  return { day: a.date ? { date: a.date } : (a.day ?? 'any'), ...(a.tod ? { tod: a.tod } : {}) }
}

/** The calendar's day for a When: the quick choice's day, or the picked date; none for any time and this week. */
export function dateOf(when: When, today: string): string | null {
  const { day } = when
  if (typeof day === 'object') return day.date
  return day === 'today' ? today : day === 'tomorrow' ? addDays(today, 1) : null
}

const quickOf = (date: string, today: string) => (date === today ? 'today' : date === addDays(today, 1) ? 'tomorrow' : 'date')

/** A calendar day picked: today and tomorrow light their chips too (the board: «Picking 15 Oct lights Tomorrow»). */
export function pickDate(when: When, date: string, today: string): When {
  const quick = quickOf(date, today)
  return { ...when, day: quick === 'date' ? { date } : quick }
}

/** The month (`YYYY-MM`) `n` months on. */
export function addMonths(month: string, n: number): string {
  const [y, m] = month.split('-').map(Number) as [number, number]
  const index = m - 1 + n
  return `${y + Math.floor(index / 12)}-${pad2((((index % 12) + 12) % 12) + 1)}`
}
