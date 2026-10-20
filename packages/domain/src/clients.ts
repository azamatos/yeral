/**
 * A business's client list (business spec §6, ADR 0018): stats computed from bookings, segments for the filter chips,
 * and the online-booking block after repeated no-shows.
 */
import type { BookingStatus } from './model'
import type { BookingRules } from './rules'
import { diffDays } from './time'

/** The parts of a booking the client stats need; `status` is the effective status. */
export interface ClientVisit {
  date: string
  status: BookingStatus
  /** Price total in manats. */
  price: number
}

export interface ClientStats {
  /** Completed visits ("gelşi"). */
  visits: number
  /** Sum of completed visit prices ("jemi"; revenue permission only). */
  total: number
  /** Average completed visit price, rounded ("ortaça çek"); null without visits. */
  avgCheck: number | null
  firstVisit: string | null
  lastVisit: string | null
  noShows: number
}

export function clientStats(visits: readonly ClientVisit[]): ClientStats {
  const done = visits.filter((v) => v.status === 'completed').sort((a, b) => a.date.localeCompare(b.date))
  const total = done.reduce((sum, v) => sum + v.price, 0)
  return {
    visits: done.length,
    total,
    avgCheck: done.length ? Math.round(total / done.length) : null,
    firstVisit: done[0]?.date ?? null,
    lastVisit: done.at(-1)?.date ?? null,
    noShows: visits.filter((v) => v.status === 'noshow').length,
  }
}

/** The team's own tags on a client ("VIP", "Child"): how many, and how long each. */
export const CLIENT_TAGS_MAX = 10
export const CLIENT_TAG_MAX = 20
/** A team note on a client, as long as a booking's internal note. */
export const CLIENT_NOTE_MAX = 500

export const CLIENT_SEGMENTS = ['regular', 'new', 'lapsed', 'flagged'] as const
export type ClientSegment = (typeof CLIENT_SEGMENTS)[number]

/** "Yzygiderli": this many completed visits within `REGULAR_WINDOW_DAYS` (6 months). */
export const REGULAR_MIN_VISITS = 3
export const REGULAR_WINDOW_DAYS = 183
/** "Täze": a first visit at most this many days ago. */
export const NEW_DAYS = 30
/** "Köpden bäri gelmedik": no visit for at least this many days. */
export const LAPSED_DAYS = 60

/** What the segments need of a client's bookings; the api counts it in the database for a whole list at once. */
export interface ClientSummary {
  /** Completed visits within `REGULAR_WINDOW_DAYS`. */
  recentVisits: number
  firstVisit: string | null
  lastVisit: string | null
  /** Bookings with a complaint ("Arz edilen"). */
  complaints: number
}

/**
 * Segments for the filter chips: Yzygiderli (≥ 3 visits in 6 months), Täze (first visit ≤ 30 days ago),
 * Köpden bäri gelmedik (no visit for 60+ days), Arz edilen (has complaints). A client with no visit yet has none of
 * the first three.
 */
export function segmentsOf(s: ClientSummary, today: string): ClientSegment[] {
  const out: ClientSegment[] = []
  if (s.recentVisits >= REGULAR_MIN_VISITS) out.push('regular')
  if (s.firstVisit && diffDays(today, s.firstVisit) <= NEW_DAYS) out.push('new')
  if (s.lastVisit && diffDays(today, s.lastVisit) >= LAPSED_DAYS) out.push('lapsed')
  if (s.complaints > 0) out.push('flagged')
  return out
}

/** The segments from a client's bookings (`segmentsOf`). */
export function clientSegments(visits: readonly ClientVisit[], complaints: number, today: string): ClientSegment[] {
  const stats = clientStats(visits)
  const recentVisits = visits.filter((v) => v.status === 'completed' && diffDays(today, v.date) <= REGULAR_WINDOW_DAYS).length
  return segmentsOf({ recentVisits, firstVisit: stats.firstVisit, lastVisit: stats.lastVisit, complaints }, today)
}

/**
 * Whether the no-shows counted since the business last lifted the block reach its limit (book Q-127). A limit of 0
 * never does.
 */
export function reachesNoShowLimit(noShowsSinceReset: number, rules: Pick<BookingRules, 'blockAfterNoShows'>): boolean {
  return rules.blockAfterNoShows > 0 && noShowsSinceReset >= rules.blockAfterNoShows
}

/**
 * Online booking is closed for this client — the card's switch "Diňe jaň arkaly ýazylyp biler" shows on (book Q-127):
 * switched on by hand, or the no-shows since the business last turned it off reach the limit. Worked out, not stored:
 * removing a no-show or setting the limit to 0 lifts a block that came from the count.
 */
export function isOnlineBlocked(
  client: { onlineBlocked: boolean; noShowsSinceReset: number },
  rules: Pick<BookingRules, 'blockAfterNoShows'>,
): boolean {
  return client.onlineBlocked || reachesNoShowLimit(client.noShowsSinceReset, rules)
}
