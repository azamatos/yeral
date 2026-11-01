/** What the 5-minute warning needs of a request (`@yeral/contract/requests` → `Request`). */
export interface Warnable {
  code: string
  /** When «Request time running out» is due (epoch ms); null for a short answer time (the api's rule, book S-16). */
  warnAt: number | null
  /** When the request runs out (epoch ms). */
  holdUntil: number
  /** Those who may answer hear the warning (decision 7 of the slice 4 plan). */
  canAnswer: boolean
}

/**
 * The warnings due now and not yet given: the requests this person may answer whose `warnAt` has passed while the
 * hold still runs. One already inside its last five minutes when the page opens is due too: the person just arrived
 * and it's about to run out. A list may hold a request twice (a refetch): each code once.
 */
export function warningsDue<T extends Warnable>(items: readonly T[], now: number, heard: ReadonlySet<string>): T[] {
  const out: T[] = []
  const codes = new Set<string>()
  for (const r of items) {
    if (!r.canAnswer || r.warnAt === null || r.warnAt > now || r.holdUntil <= now) continue
    if (heard.has(r.code) || codes.has(r.code)) continue
    codes.add(r.code)
    out.push(r)
  }
  return out
}

/** How long until the next warning falls due (ms, at least 0), or null when none is ahead. */
export function nextWarningIn(items: readonly Warnable[], now: number, heard: ReadonlySet<string>): number | null {
  let next: number | null = null
  for (const r of items) {
    if (!r.canAnswer || r.warnAt === null || r.warnAt <= now || heard.has(r.code)) continue
    if (next === null || r.warnAt < next) next = r.warnAt
  }
  return next === null ? null : Math.max(0, next - now)
}
