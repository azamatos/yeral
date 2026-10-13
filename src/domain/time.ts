/**
 * Date & time helpers. All salon logic runs in Ashgabat time (UTC+5, no DST),
 * whatever the browser's or the server's timezone is — a booking at 15:00 is 15:00 in the salon.
 * Dates are 'YYYY-MM-DD' strings, times are minutes from midnight.
 */

export const TZ = 'Asia/Ashgabat'
const TZ_OFFSET_MIN = 5 * 60

export const pad = (n: number) => String(n).padStart(2, '0')

/** Current wall-clock time in Ashgabat as a Date whose UTC fields hold the local values. */
function nowLocal(): Date {
  return new Date(Date.now() + TZ_OFFSET_MIN * 60000)
}

export function today(): string {
  return nowLocal().toISOString().slice(0, 10)
}

export function nowMin(): number {
  const d = nowLocal()
  return d.getUTCHours() * 60 + d.getUTCMinutes()
}

/** Calendar maths on plain dates (UTC-based, so no DST surprises). */
export function parseYmd(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}

export function ymd(d: Date): string {
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
}

export function addDays(s: string, n: number): string {
  const d = parseYmd(s)
  d.setUTCDate(d.getUTCDate() + n)
  return ymd(d)
}

export function diffDays(a: string, b: string): number {
  return Math.round((parseYmd(a).getTime() - parseYmd(b).getTime()) / 86400000)
}

/** 0 = Monday */
export function dow(s: string): number {
  return (parseYmd(s).getUTCDay() + 6) % 7
}

export function hm(min: number): string {
  return `${pad(Math.floor(min / 60))}:${pad(min % 60)}`
}

/** Epoch ms of a salon-local date + minutes. */
export function epochOf(date: string, min: number): number {
  return parseYmd(date).getTime() + (min - TZ_OFFSET_MIN) * 60000
}

/** minutes until a salon-local moment (negative = in the past) */
export function minutesUntil(date: string, start: number): number {
  return Math.round((epochOf(date, start) - Date.now()) / 60000)
}

export function uid(prefix = 'id'): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-3)}`
}

export function cls(...xs: (string | false | null | undefined)[]): string {
  return xs.filter(Boolean).join(' ')
}

/** «+993 65 12 34 56» from any input */
export function fmtPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '').replace(/^993/, '').slice(0, 8)
  const p = [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 6), digits.slice(6, 8)].filter(Boolean)
  return '+993 ' + p.join(' ')
}

export const normPhone = (p: string) => p.replace(/\D/g, '')
