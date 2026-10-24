/**
 * Special days as Settings → Hours edits them (B-Settings «Special days», design §8 «Aýratyn günler», §28.5, book
 * B-40): a holiday or an unusual day, one day or several, yearly or not, closed or on other hours. The checks the api
 * makes, made first so the modal says what to fix: dates in the past or the wrong way round, other hours past midnight
 * that run into a neighbouring day's, and which day applies where two overlap.
 */
import type { WeekdayHours } from '@yeral/contract/settings'
import { nightOverlaps, specialDayErrors, yearlyNightOverlaps, type BusinessHours } from '@yeral/domain/hours'
import { addDays, diffDays, dow } from '@yeral/domain/time'

/** A special day as the api saves it (`specialDaySettingSchema`): `hours` null when closed. */
export type SpecialDay = { name: string; from: string; to: string; yearly: boolean; hours: { open: number; close: number } | null }

/** The modal's fields: a day's dates, kept apart for «One day» and «Several days». */
export type SpecialDayDraft = {
  name: string
  multi: boolean
  date: string
  start: string
  end: string
  yearly: boolean
  closed: boolean
  hours: { open: number; close: number }
}

/** The board's other hours for a new day: 10:00–15:00. */
const DRAWN_HOURS = { open: 600, close: 900 }

export const SPECIAL_DAY_NAME_MAX = 40

export function draftOf(day?: SpecialDay): SpecialDayDraft {
  if (!day) return { name: '', multi: false, date: '', start: '', end: '', yearly: false, closed: true, hours: DRAWN_HOURS }
  const multi = day.from !== day.to
  return {
    name: day.name,
    multi,
    date: multi ? '' : day.from,
    start: multi ? day.from : '',
    end: multi ? day.to : '',
    yearly: day.yearly,
    closed: !day.hours,
    hours: day.hours ?? DRAWN_HOURS,
  }
}

/** The day the draft describes, or null while its dates aren't filled in. */
export function dayOf(d: SpecialDayDraft): SpecialDay | null {
  const from = d.multi ? d.start : d.date
  const to = d.multi ? d.end : d.date
  if (!from || !to) return null
  return { name: d.name.trim(), from, to, yearly: d.yearly, hours: d.closed ? null : d.hours }
}

/** «You can't pick a day in the past.» (a one-off day that has ended), «The end can't be before the start.», or a year at most. */
export function dateProblem(day: SpecialDay, today: string): 'past' | 'order' | 'long' | null {
  if (diffDays(day.to, day.from) < 0) return 'order'
  if (!day.yearly && day.to < today) return 'past'
  return specialDayErrors(day).includes('to') ? 'long' : null
}

export type NightProblem = { kind: 'same' } | { kind: 'next'; weekday: number } | { kind: 'before' } | { kind: 'yearly' }

/**
 * Other hours checked as the api checks them (`checkChange`): opening and closing at the same time; past midnight, not
 * into the next day's opening, nor the night before into this day's; a yearly day against every weekday (it falls on
 * any of them some year). `week` is the saved week, `others` the other special days.
 */
export function nightProblem(day: SpecialDay, week: readonly (WeekdayHours | null)[], others: readonly SpecialDay[]): NightProblem | null {
  const h = day.hours
  if (!h) return null
  if (h.open === h.close) return { kind: 'same' }
  const next: BusinessHours = { hours: [...week], exceptions: [...others, day] }
  const over = nightOverlaps(next, addDays(day.from, -1), day.to)
  if (over.length) {
    const first = over[0]!
    return first < day.from ? { kind: 'before' } : { kind: 'next', weekday: dow(addDays(first, 1)) }
  }
  return day.yearly && yearlyNightOverlaps(next.hours, h) ? { kind: 'yearly' } : null
}

/** The month-and-day stretches a day covers in a year: one, or two when it wraps New Year. */
const monthDays = (d: SpecialDay): [string, string][] => {
  const [a, b] = [d.from.slice(5), d.to.slice(5)]
  return a <= b
    ? [[a, b]]
    : [
        [a, '12-31'],
        ['01-01', b],
      ]
}

const overlaps = (a: SpecialDay, b: SpecialDay) =>
  a.yearly || b.yearly ? monthDays(a).some(([x, y]) => monthDays(b).some(([p, q]) => x <= q && p <= y)) : a.from <= b.to && b.from <= a.to

/** How many days it covers in a year (a yearly one wrapping New Year too). */
const span = (d: SpecialDay) => {
  if (!d.yearly) return diffDays(d.to, d.from)
  const days = diffDays(`2001-${d.to.slice(5)}`, `2001-${d.from.slice(5)}`)
  return days < 0 ? days + 365 : days
}

/**
 * The first other special day this one overlaps, and the one that applies on the shared days (`findException`): a dated
 * one beats a yearly one, a shorter one a longer, «Closed» beats «Different hours»; a full tie keeps the existing one.
 */
export function overlapOf(day: SpecialDay, others: readonly SpecialDay[]): { name: string; winner: string } | null {
  const other = others.find((o) => overlaps(day, o))
  if (!other) return null
  const rank = (d: SpecialDay) => [d.yearly ? 1 : 0, span(d), d.hours ? 1 : 0]
  const [mine, theirs] = [rank(day), rank(other)]
  const i = mine.findIndex((v, k) => v !== theirs[k])
  const wins = i >= 0 && mine[i]! < theirs[i]!
  return { name: other.name, winner: wins ? day.name : other.name }
}
