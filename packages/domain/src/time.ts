/**
 * Business-local time. Every rule runs in the business's time zone, whatever the browser's or the server's zone is:
 * a booking at 15:00 is 15:00 at the place. Today every business is in Asia/Ashgabat (UTC+5, no daylight saving), so
 * the offset is a constant; a second zone would add a `zone` argument here and nowhere else.
 *
 * Conventions (systemPatterns.md): dates are 'YYYY-MM-DD' strings, times of day are minutes from midnight
 * (870 = 14:30), instants are epoch milliseconds. Functions that need "now" take it as the last argument
 * (default Date.now()), so the api can pass its clock and tests can pass a fixed instant.
 */

export const ZONE = 'Asia/Ashgabat'
const OFFSET_MIN = 5 * 60
const DAY_MS = 86_400_000

export const pad2 = (n: number) => String(n).padStart(2, '0')

/** Business-local date and minute of an instant. */
export function localOf(epoch: number): { date: string; min: number } {
  const d = new Date(epoch + OFFSET_MIN * 60_000)
  return { date: ymd(d), min: d.getUTCHours() * 60 + d.getUTCMinutes() }
}

export function today(now = Date.now()): string {
  return localOf(now).date
}

export function nowMin(now = Date.now()): number {
  return localOf(now).min
}

/** Calendar maths on plain dates, done in UTC so no daylight-saving surprises. */
export function parseYmd(s: string): Date {
  const [y = 0, m = 1, d = 1] = s.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}

export function ymd(d: Date): string {
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`
}

export function isYmd(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && ymd(parseYmd(s)) === s
}

export function addDays(s: string, n: number): string {
  const d = parseYmd(s)
  d.setUTCDate(d.getUTCDate() + n)
  return ymd(d)
}

/** Whole days from b to a (a − b). */
export function diffDays(a: string, b: string): number {
  return Math.round((parseYmd(a).getTime() - parseYmd(b).getTime()) / DAY_MS)
}

/** Day of the week, 0 = Monday … 6 = Sunday (Turkmen weeks start on Monday). */
export function dow(s: string): number {
  return (parseYmd(s).getUTCDay() + 6) % 7
}

/** 870 → '14:30' */
export function hm(min: number): string {
  return `${pad2(Math.floor(min / 60))}:${pad2(min % 60)}`
}

/** '14:30' → 870; null when it isn't a time of day. */
export function parseHm(s: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(s)
  if (!m) return null
  const h = Number(m[1])
  const min = Number(m[2])
  return h < 24 && min < 60 ? h * 60 + min : null
}

/** Epoch ms of a business-local date + minutes (minutes may run past 1440 into the next day). */
export function epochOf(date: string, min: number): number {
  return parseYmd(date).getTime() + (min - OFFSET_MIN) * 60_000
}

/** Minutes from now until a business-local moment (negative = in the past). */
export function minutesUntil(date: string, min: number, now = Date.now()): number {
  return Math.round((epochOf(date, min) - now) / 60_000)
}

/** Every date from `from` to `to`, both included. */
export function dateRange(from: string, to: string): string[] {
  const out: string[] = []
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d)
  return out
}
