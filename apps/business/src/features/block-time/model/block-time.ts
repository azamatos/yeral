import { BLOCK_KINDS, BLOCK_REPEAT_DAYS, blockDates, type BlockKind, type BlockRepeat as ApiRepeat } from '@yeral/domain/hours'
import { addDays, diffDays, epochOf, QUARTER_HOUR } from '@yeral/domain/time'

export type BlockRepeat = 'none' | ApiRepeat
export const BLOCK_REPEAT_OPTIONS: readonly BlockRepeat[] = ['none', 'daily', 'weekly']
export { BLOCK_KINDS, type BlockKind }

/** The form steps by a quarter hour, as the grid's slots do (B-Calendar «Block time»); the api takes 5. */
export const STEP = QUARTER_HOUR
/** «Other» said in a few words (B-Calendar `.inp` ≤ 30; the api allows 40). */
export const OTHER_MAX = 30
/** The repeat's last day as proposed: four weeks on, moved along when the first day moves past it. */
const UNTIL_AHEAD = 28

export type BlockForm = {
  staffId: string
  date: string
  start: number
  end: number
  kind: BlockKind | null
  /** «Other» in words. */
  text: string
  repeat: BlockRepeat
  until: string
}

/** What the api takes (`blockInputSchema`): the chips as `kind`, Other's words as `reason`, a repeat with its last day. */
export type BlockBody = {
  staffId: string
  date: string
  start: number
  end: number
  kind?: BlockKind
  reason?: string
  repeat?: ApiRepeat
  repeatUntil?: string
}

/** The form as the slot menu opens it: the slot's person, day and quarter hour, an hour long (the board's 14:30–15:30). */
export function blockFormOf(slot: { staffId: string; date: string; start: number }, toMinute: number): BlockForm {
  const end = Math.min(slot.start + 60, toMinute)
  return {
    staffId: slot.staffId,
    date: slot.date,
    start: slot.start,
    end: end > slot.start ? end : slot.start + STEP,
    kind: null,
    text: '',
    repeat: 'none',
    until: addDays(slot.date, UNTIL_AHEAD),
  }
}

/** The quarter hours From and To offer on the grid's hours: From up to the last quarter, To from the first quarter's end. */
export function timeOptions(fromHour: number, toHour: number): { starts: number[]; ends: number[] } {
  const starts: number[] = []
  for (let m = fromHour * 60; m + STEP <= toHour * 60; m += STEP) starts.push(m)
  return { starts, ends: starts.map((m) => m + STEP) }
}

/** A new start keeps the end after it (the board: `to: max(to, from + 15)`). */
export function withStart(form: BlockForm, start: number): BlockForm {
  return { ...form, start, end: Math.max(form.end, start + STEP) }
}

/** A new first day keeps the last day after it. */
export function withDate(form: BlockForm, date: string): BlockForm {
  return { ...form, date, until: form.until > date ? form.until : addDays(date, UNTIL_AHEAD) }
}

/** How many days the block lands on: the first and every day or week after it up to `until`. */
export function occurrences(form: Pick<BlockForm, 'date' | 'repeat' | 'until'>): number {
  return form.repeat === 'none' ? 1 : blockDates(form.date, form.until, form.repeat).length
}

export type BlockProblems = {
  /** The times: the end not after the start, or the time gone by. */
  time: 'order' | 'past' | null
  /** The repeat's last day not after the first, or over a year away. */
  until: boolean
  /** No reason yet, or Other without its words. */
  reason: boolean
}

/** What keeps the form from sending (the board's `err`, `untilBad`, `reasonOk`). */
export function blockProblems(form: BlockForm, now: number): BlockProblems {
  const time = form.end <= form.start ? 'order' : epochOf(form.date, form.end) <= now ? 'past' : null
  const until = form.repeat !== 'none' && (form.until <= form.date || diffDays(form.until, form.date) > BLOCK_REPEAT_DAYS)
  const reason = !form.kind || (form.kind === 'other' && !form.text.trim())
  return { time, until, reason }
}

export const canSend = (p: BlockProblems) => !p.time && !p.until && !p.reason

/** The next quarter hour from now: what «pick a time from …» says. */
export const nextSlot = (nowMinute: number) => Math.ceil(nowMinute / STEP) * STEP

/** The api's body: the chips as `kind`, Other's words as `reason`, the repeat with its last day. */
export function blockBody(form: BlockForm): BlockBody {
  const text = form.text.trim()
  return {
    staffId: form.staffId,
    date: form.date,
    start: form.start,
    end: form.end,
    ...(form.kind ? { kind: form.kind } : {}),
    ...(form.kind === 'other' && text ? { reason: text } : {}),
    ...(form.repeat !== 'none' ? { repeat: form.repeat, repeatUntil: form.until } : {}),
  }
}
