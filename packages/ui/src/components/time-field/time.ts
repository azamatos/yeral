/** A day in minutes; `DAY` itself is «24:00», a closing time. */
export const DAY = 1440

const pad2 = (n: number) => String(n).padStart(2, '0')

/** Minutes from midnight as «HH:MM» (1440 → «24:00», never seconds). */
export function formatTime(minutes: number): string {
  return `${pad2(Math.floor(minutes / 60))}:${pad2(minutes % 60)}`
}

/**
 * Typed text as minutes from midnight, or null when it isn't a time (DS-Controls → 04 Time field «Typed, then
 * tidied»): digits with or without a colon (a dot or a space does too); one or two digits are hours («9» → 09:00,
 * «21» → 21:00), three or four are hours and minutes («930» → 09:30, «1745» → 17:45); after a colon one digit is
 * tens of minutes («9:3» → 09:30). Hours run to 23, or 24 with `max` at 24:00 (only «24:00»); minutes to 59.
 */
export function parseTime(text: string, { min = 0, max = DAY - 1 }: { min?: number; max?: number } = {}): number | null {
  const s = text.trim()
  if (!s) return null
  let hours: number
  let minutes: number
  const split = /^(\d{1,2})[:. ](\d{1,2})$/.exec(s)
  if (split) {
    hours = Number(split[1])
    minutes = split[2]!.length === 1 ? Number(split[2]) * 10 : Number(split[2])
  } else if (/^\d{1,4}$/.test(s)) {
    if (s.length <= 2) {
      hours = Number(s)
      minutes = 0
    } else {
      hours = Number(s.slice(0, s.length - 2))
      minutes = Number(s.slice(-2))
    }
  } else return null
  if (minutes > 59 || hours > 24 || (hours === 24 && minutes > 0)) return null
  const value = hours * 60 + minutes
  return value < min || value > max ? null : value
}
