import type { WeekdayHours } from '@yeral/contract/settings'
import type { StaffScheduleView } from '@yeral/contract/team'

type Range = { open: number; close: number }
type Break = { start: number; end: number }

/** A weekday in the staff drawer's Hours (B-Team `days`): works or not (own shift), the hours, one break. */
export type ShiftDay = { works: boolean; hours: Range; break: Break | null }
/** «Business hours» (follows them) or «Own shift» (own hours per weekday, within them). */
export type ShiftForm = { own: boolean; days: ShiftDay[] }

const FALLBACK: Range = { open: 540, close: 1080 }

/** The week as saved: the business's hours where the person follows them, their own where they have a shift. */
export function shiftFormOf(schedule: StaffScheduleView, business: readonly (WeekdayHours | null)[]): ShiftForm {
  const own = schedule.shift !== null
  return {
    own,
    days: business.map((b, i) => {
      const mine = schedule.shift?.[i]
      return {
        works: own ? !!mine : !!b,
        hours: mine ?? (b ? { open: b.open, close: b.close } : FALLBACK),
        break: schedule.breaks[i] ?? null,
      }
    }),
  }
}

/** Switching: business hours take the business's times and keep each break; an own shift starts from them. */
export function switchShift(form: ShiftForm, own: boolean, business: readonly (WeekdayHours | null)[]): ShiftForm {
  if (form.own === own) return form
  return {
    own,
    days: form.days.map((d, i) => {
      const b = business[i]
      return { works: !!b, hours: b ? { open: b.open, close: b.close } : d.hours, break: d.break }
    }),
  }
}

/** Does the person work that weekday: by their own shift, or because the business is open. */
export const works = (form: ShiftForm, i: number, business: readonly (WeekdayHours | null)[]) =>
  form.own ? form.days[i]!.works : !!business[i]

/** The day's working stretch: their own hours, or the business's. */
export const dayHours = (form: ShiftForm, i: number, business: readonly (WeekdayHours | null)[]): Range | null => {
  if (!works(form, i, business)) return null
  if (form.own) return form.days[i]!.hours
  const b = business[i]
  return b ? { open: b.open, close: b.close } : null
}

/** Why a day can't be saved (B-Team `brkErr`): a break that doesn't end after it starts, or one outside the hours. */
export type DayProblem = 'breakOrder' | 'breakOutside' | null

export function dayProblem(form: ShiftForm, i: number, business: readonly (WeekdayHours | null)[]): DayProblem {
  const hours = dayHours(form, i, business)
  const br = form.days[i]!.break
  if (!hours || !br) return null
  if (br.end <= br.start) return 'breakOrder'
  return br.start < hours.open || br.end > hours.close ? 'breakOutside' : null
}

export const shiftValid = (form: ShiftForm, business: readonly (WeekdayHours | null)[]) =>
  form.days.every((_, i) => dayProblem(form, i, business) === null)

/** What `PUT …/schedule` gets for the week: the shift (null: the business's hours) and a break per working day. */
export function scheduleWeek(form: ShiftForm, business: readonly (WeekdayHours | null)[]) {
  return {
    shift: form.own ? form.days.map((d) => (d.works ? d.hours : null)) : null,
    breaks: form.days.map((d, i) => (works(form, i, business) ? d.break : null)),
  }
}

export const sameShift = (a: ShiftForm, b: ShiftForm, business: readonly (WeekdayHours | null)[]) =>
  JSON.stringify(scheduleWeek(a, business)) === JSON.stringify(scheduleWeek(b, business))
