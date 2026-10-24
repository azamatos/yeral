/**
 * The business's week as the hours editor holds it (the setup wizard's step 4, B-Onboarding; Settings → Hours,
 * B-Settings; design §28 hours, book B-04, B-39): seven days Monday first, each open or closed with its hours and one
 * break, and «Same hours Monday to Friday» (the wizard's): the weekdays follow the first open one.
 */
import type { WeekdayHours } from '@yeral/contract/settings'
import { DAY_MINUTES, dayHoursProblem, type DayHoursProblem, type WeekHours } from '@yeral/domain/hours'

/** One weekday in the editor: its hours stay while it's closed, so switching it back on brings them back. */
export type EditorDay = { open: boolean; hours: { open: number; close: number }; break: { start: number; end: number } | null }

export type EditorWeek = { days: EditorDay[]; same: boolean }

const WEEKDAYS = [0, 1, 2, 3, 4]
const day = (open: number, close: number): EditorDay => ({ open: true, hours: { open, close }, break: null })

/**
 * A new business's week, as B-Onboarding step 4 draws it (business-demo.json's hours): Monday to Saturday 09:00–20:00,
 * Sunday 10:00–18:00, the same hours Monday to Friday (book chapter 9, 23.10.2026).
 */
export const STARTING_WEEK: EditorWeek = {
  days: [...Array.from({ length: 6 }, () => day(540, 1200)), day(600, 1080)],
  same: true,
}

type Hours = { open: number; close: number; break?: { start: number; end: number } | null }
const sameHours = (a: Hours, b: Hours) =>
  a.open === b.open &&
  a.close === b.close &&
  (a.break?.start ?? null) === (b.break?.start ?? null) &&
  (a.break?.end ?? null) === (b.break?.end ?? null)
const hoursOf = (d: EditorDay): Hours => ({ ...d.hours, break: d.break })

/**
 * The weekday Monday to Friday follow while «Same hours» is on: the first open one (a salon closed on Mondays follows
 * Tuesday), Monday when none is open.
 */
export const leadDay = (days: readonly EditorDay[]) => WEEKDAYS.find((i) => days[i]!.open) ?? 0

/** Whether a weekday follows the lead day: Monday to Friday after it, while «Same hours» is on. */
export const follows = (week: EditorWeek, i: number) => week.same && WEEKDAYS.includes(i) && i > leadDay(week.days)

/**
 * The editor's week from the saved one: a business with no open day starts from `STARTING_WEEK`; a closed day keeps
 * the hours of the first open one for when it's switched on. «Same hours» is on when two or more of Monday to Friday
 * are open, all with the same hours and break (closed weekdays don't count, as the switch leaves them closed).
 */
export function editorWeek(saved: WeekHours): EditorWeek {
  const first = saved.find(Boolean)
  if (!first) return STARTING_WEEK
  const days = saved.map((h): EditorDay => {
    const hours = h ?? first
    return { open: !!h, hours: { open: hours.open, close: hours.close }, break: h?.break ?? null }
  })
  const open = WEEKDAYS.filter((i) => days[i]!.open)
  return { days, same: open.length > 1 && open.every((i) => sameHours(hoursOf(days[i]!), hoursOf(days[open[0]!]!))) }
}

/**
 * The editor's week for Settings (no «Same hours», B-Settings): the saved week as it is, every day closed included
 * (each keeping the drawn hours for when it's switched on), never the wizard's starting week.
 */
export function settingsWeek(saved: WeekHours): EditorWeek {
  const week = editorWeek(saved)
  return { days: saved.some(Boolean) ? week.days : week.days.map((d) => ({ ...d, open: false })), same: false }
}

/** The days as they apply: while «Same hours» is on, the weekdays after the lead take its hours and break; each keeps its switch. */
export function effectiveDays(week: EditorWeek): EditorDay[] {
  const lead = week.days[leadDay(week.days)]!
  return week.days.map((d, i) => (follows(week, i) ? { ...d, hours: lead.hours, break: lead.break } : d))
}

/** A week as the api saves it: Monday first, null for a closed day. */
export type SavedWeek = (WeekdayHours | null)[]

/** The week to save. */
export function weekOf(days: readonly EditorDay[]): SavedWeek {
  return days.map((d) => (d.open ? { open: d.hours.open, close: d.hours.close, break: d.break } : null))
}

/** Each day's problem (`dayHoursProblem`), null where it's fine or closed. */
export const dayProblems = (week: WeekHours): (DayHoursProblem | null)[] => week.map((_, i) => dayHoursProblem(week, i))

/** Whether the week can be saved: a day open and no day with a problem (B-04: the business needs an open day). */
export const weekValid = (week: WeekHours) => week.some(Boolean) && dayProblems(week).every((p) => p === null)

/** Whether two weeks are the same, breaks included (an absent break is none). */
export const sameWeek = (a: WeekHours, b: WeekHours) =>
  a.length === b.length &&
  a.every((d, i) => {
    const e = b[i]
    return !d || !e ? !d && !e : sameHours(d, e)
  })

/**
 * The step list's summary of a week (B-Onboarding `hoursSum`): runs of open days in a row with the same hours,
 * «Mo–Fr 09:00–20:00, Sa 09:00–20:00, Su 10:00–18:00»; breaks aren't in it. Empty when every day is closed.
 */
export function hoursRuns(week: WeekHours): { from: number; to: number; open: number; close: number }[] {
  const runs: { from: number; to: number; open: number; close: number }[] = []
  for (let i = 0; i < 7;) {
    const d = week[i]
    if (!d) {
      i++
      continue
    }
    let end = i
    while (end + 1 < 7 && week[end + 1]?.open === d.open && week[end + 1]?.close === d.close) end++
    runs.push({ from: i, to: end, open: d.open, close: d.close })
    i = end + 1
  }
  return runs
}

/** The weekdays a change touches (Monday first): their switch, hours or break differ. */
export const changedDays = (was: WeekHours, next: WeekHours): number[] =>
  next.flatMap((d, i) => (sameWeek([d], [was[i] ?? null]) ? [] : [i]))

/** A closing minute as its clock shows it: 1560 is 02:00 the next day; 1440 stays 24:00. */
export const closingClock = (close: number) => (close > DAY_MINUTES ? close - DAY_MINUTES : close)
