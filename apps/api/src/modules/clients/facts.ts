/**
 * What a business knows of its clients from their bookings (book B-32, B-34): visits, the first and last, what they
 * cost, no-shows, reports and the next booking, counted, filtered by chip, ordered and paged in the database. A move
 * isn't a booking of its own. As the reader sees it, a specialist counts only the bookings with them and sees only
 * clients they have a booking or a move with (one onto them they may answer); as the business sees it, every booking
 * counts. A
 * visit is completed as people see it now: stored so, or confirmed and ended (`effectiveStatus`).
 */
import { LAPSED_DAYS, NEW_DAYS, REGULAR_MIN_VISITS, REGULAR_WINDOW_DAYS, segmentsOf, type ClientSegment } from '@yeral/domain/clients'
import { MARKET } from '@yeral/domain/market'
import { scopeOf, type Actor } from '@yeral/domain/permissions'
import { addDays, localOf } from '@yeral/domain/time'
import { and, asc, desc, eq, inArray, isNull, sql, type AnyColumn, type SQL } from 'drizzle-orm'
import type { Queryable } from '../../db/client'
import { bookingItems, bookings, clientNotes, clients } from '../../db/schema'
import { ApiError } from '../../http/errors'
import { awaitingAnswer, spanMinuteAt } from '../bookings/repo'
import { blockedByCount } from './online'

type ClientRecord = typeof clients.$inferSelect

/** A completed visit as people see it now. */
export const doneAt = (now: number) =>
  sql`(${bookings.status} = 'completed' or (${bookings.status} = 'confirmed' and upper(${bookings.span}) <= ${spanMinuteAt(now)}))`

/** A waiting request, or a confirmed visit that hasn't ended. */
export const aheadAt = (now: number) =>
  sql`(${awaitingAnswer(now)} or (${bookings.status} = 'confirmed' and upper(${bookings.span}) > ${spanMinuteAt(now)}))`

/** The booking has an item with this person. */
export const withStaff = (staffId: string, bookingId: AnyColumn = bookings.id) =>
  sql`exists (select 1 from ${bookingItems} where ${bookingItems.bookingId} = ${bookingId} and ${bookingItems.staffId} = ${staffId})`

/**
 * A specialist's client: one with a booking or a move with them (a move onto them they may answer), on the client row
 * in scope (`"clients"."id"`).
 */
const hersSql = (staffId: string) =>
  sql`exists (select 1 from "bookings" b join "booking_items" i on i."booking_id" = b."id"
    where b."client_id" = "clients"."id" and i."staff_id" = ${staffId})`

/**
 * The business's client the reader may see, held so it can't go meanwhile (a note on it, B-34): 404 for one they
 * can't.
 */
export async function seenClient(db: Queryable, businessId: string, actor: Actor, id: string): Promise<ClientRecord> {
  const own = ownOnly(actor)
  const [row] = await db
    .select()
    .from(clients)
    .where(and(eq(clients.id, id), eq(clients.businessId, businessId), own ? hersSql(own) : undefined))
    .for('share')
  if (!row) throw new ApiError('not_found')
  return row
}

/** Whose clients the reader sees: everyone's, or a specialist their own; a level without the row sees none. */
export function ownOnly(actor: Actor): string | null {
  const scope = scopeOf(actor, 'clients')
  if (scope === 'own') return actor.staffId
  if (scope === 'all') return null
  throw new ApiError('forbidden')
}

export interface ClientFacts {
  client: ClientRecord
  visits: number
  /** Completed visits with a price: the average check divides by them. */
  pricedVisits: number
  /** What the completed visits cost, hidden prices included (the team charges them). */
  total: number
  firstVisit: string | null
  lastVisit: string | null
  noShows: number
  segments: ClientSegment[]
  /** The soonest waiting request or visit ahead. */
  nextId: string | null
}

export interface FactsQuery {
  where?: SQL
  /** `reader` (the default): as the reader may see them; `business`: every client and booking (the request drawer). */
  scope?: 'reader' | 'business'
  segment?: ClientSegment
  limit?: number
  offset?: number
}

/**
 * The facts of the business's clients matching `where`, the most recently seen first (the latest booking's day, ahead
 * or past, else the day the business added them), and how many match in all.
 */
export async function clientFacts(
  db: Queryable,
  businessId: string,
  actor: Actor,
  now: number,
  q: FactsQuery = {},
): Promise<{ rows: ClientFacts[]; total: number }> {
  const done = doneAt(now)
  const today = localOf(now).date
  const own = q.scope === 'business' ? null : ownOnly(actor)
  const visits = sql<number>`count(*) filter (where ${done})::int`
  const recentVisits = sql<number>`count(*) filter (where ${done} and ${bookings.date} >= ${addDays(today, -REGULAR_WINDOW_DAYS)})::int`
  const firstVisit = sql<string | null>`(min(${bookings.date}) filter (where ${done}))::text`
  const lastVisit = sql<string | null>`(max(${bookings.date}) filter (where ${done}))::text`
  const reports = sql<number>`count(*) filter (where ${bookings.complaintType} is not null)::int`
  const added = sql`((${clients.createdAt} at time zone 'UTC') + ${MARKET.utcOffsetMin} * interval '1 minute')::date`
  const latest = sql`coalesce(max(${bookings.date}), ${added})`
  const visible = own ? hersSql(own) : undefined
  const chip = {
    regular: sql`${recentVisits} >= ${REGULAR_MIN_VISITS}`,
    new: sql`${firstVisit} >= ${addDays(today, -NEW_DAYS)}`,
    lapsed: sql`${lastVisit} <= ${addDays(today, -LAPSED_DAYS)}`,
    flagged: sql`${reports} > 0`,
  }
  let query = db
    .select({
      client: clients,
      visits,
      pricedVisits: sql<number>`count(*) filter (where ${done} and ${bookings.priceAmount} is not null)::int`,
      recentVisits,
      total: sql<number>`coalesce(sum(${bookings.priceAmount}) filter (where ${done}), 0)::int`,
      firstVisit,
      lastVisit,
      noShows: sql<number>`count(*) filter (where ${bookings.status} = 'noshow')::int`,
      reports,
      nextId: sql<
        string | null
      >`((array_agg(${bookings.id} order by ${bookings.date}, ${bookings.start}) filter (where ${aheadAt(now)}))[1])::text`,
      matching: sql<number>`(count(*) over ())::int`,
    })
    .from(clients)
    .leftJoin(bookings, and(eq(bookings.clientId, clients.id), isNull(bookings.rescheduleOf), own ? withStaff(own) : undefined))
    .where(and(eq(clients.businessId, businessId), q.where))
    .groupBy(clients.id)
    .$dynamic()
  const having = and(visible, q.segment ? chip[q.segment] : undefined)
  if (having) query = query.having(having)
  query = query.orderBy(desc(latest), desc(clients.createdAt), asc(clients.id))
  if (q.limit !== undefined) query = query.limit(q.limit).offset(q.offset ?? 0)
  const rows = await query
  return {
    rows: rows.map((r) => ({
      client: r.client,
      visits: r.visits,
      pricedVisits: r.pricedVisits,
      total: r.total,
      firstVisit: r.firstVisit,
      lastVisit: r.lastVisit,
      noShows: r.noShows,
      segments: segmentsOf(
        { recentVisits: r.recentVisits, firstVisit: r.firstVisit, lastVisit: r.lastVisit, complaints: r.reports },
        today,
      ),
      nextId: r.nextId,
    })),
    total: rows[0]?.matching ?? 0,
  }
}

/** The average check: the completed visits with a price; null before one. */
export const avgCheckOf = (f: Pick<ClientFacts, 'total' | 'pricedVisits'>) => (f.pricedVisits ? Math.round(f.total / f.pricedVisits) : null)

/**
 * Which of these are phone-only now: by hand, or the no-show count reaches the limit (B-35, `clients/online.ts`);
 * `byCount` the ones the count turned on (switching it off starts the count again).
 */
export async function phoneOnlyOf(
  db: Queryable,
  records: readonly Pick<ClientRecord, 'id' | 'onlineBlocked'>[],
  rules: { blockAfterNoShows: number },
): Promise<{ on: Set<string>; byCount: Set<string> }> {
  const byCount = await blockedByCount(
    db,
    records.map((r) => r.id),
    rules,
  )
  return { on: new Set(records.filter((r) => r.onlineBlocked || byCount.has(r.id)).map((r) => r.id)), byCount }
}

/** The notes "shown when they book" ("Ýazylanda görkez") of these clients, the newest first. */
export async function alertNotesOf(db: Queryable, clientIds: readonly string[]): Promise<Map<string, string[]>> {
  const out = new Map<string, string[]>()
  if (!clientIds.length) return out
  const rows = await db
    .select({ clientId: clientNotes.clientId, text: clientNotes.text })
    .from(clientNotes)
    .where(and(inArray(clientNotes.clientId, [...new Set(clientIds)]), eq(clientNotes.alert, true)))
    .orderBy(desc(clientNotes.createdAt))
  for (const r of rows) {
    const list = out.get(r.clientId)
    if (list) list.push(r.text)
    else out.set(r.clientId, [r.text])
  }
  return out
}

/** The rows a page shows, by id. */
export const bookingsByIds = async (db: Queryable, ids: readonly string[]) =>
  ids.length
    ? db
        .select()
        .from(bookings)
        .where(inArray(bookings.id, [...ids]))
    : []
