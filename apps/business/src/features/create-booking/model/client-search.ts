/**
 * One Client field (B7-Booking, B7): letters search names, digits search numbers — nothing to switch. The api does
 * the search (`clients.list` with `q`); these say which it is and where the match sits, for the bold part of a row.
 */

/** Digits, spaces, «+», brackets and dashes only: the typing is a number. */
export const isDigitsQuery = (q: string): boolean => /^[\d\s+()-]+$/.test(q.trim()) && /\d/.test(q)

/** The typed digits alone: «+993 65 12» → «9936512». */
export const queryDigits = (q: string): string => q.replace(/\D/g, '')

/** Where `query` sits in `text` (case-insensitive) for the bold match; null when it doesn't. */
export function matchIn(text: string, query: string): [number, number] | null {
  const q = query.trim().toLowerCase()
  if (!q) return null
  const at = text.toLowerCase().indexOf(q)
  return at < 0 ? null : [at, at + q.length]
}

/**
 * Where the typed digits sit in a formatted number («+993 65 12 34 56»): spaces and the «+» are skipped, and «+993 6»,
 * «65 12», «6512» all find their place (a leading country code may be left out of the number's start).
 */
export function digitsMatchIn(formatted: string, query: string, countryCode: string): [number, number] | null {
  const q = queryDigits(query)
  if (!q) return null
  const at: number[] = []
  let digits = ''
  for (let i = 0; i < formatted.length; i++) {
    if (/\d/.test(formatted[i]!)) {
      at.push(i)
      digits += formatted[i]
    }
  }
  for (const needle of [q, ...(q.startsWith(countryCode) && q.length > countryCode.length ? [q.slice(countryCode.length)] : [])]) {
    const from = digits.indexOf(needle)
    if (from >= 0) return [at[from]!, at[from + needle.length - 1]! + 1]
  }
  return null
}
