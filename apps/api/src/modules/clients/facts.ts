/**
 * What a business knows of its clients from their bookings (book B-32, B-34): visits, the first and last, what they
 * cost, no-shows, reports and the next booking, counted in the database for a whole list at once. A move isn't a
 * booking of its own; a specialist counts only the bookings with them and sees only clients they have one with. A visit
 * is completed as people see it now: stored so, or confirmed and ended (`effectiveStatus`).
 */
import { REGULAR_WINDOW_DAYS, segmentsOf, type ClientSegment } from '@yeral/domain/clients'
import { scopeOf, type Actor } from '@yeral/domain/permissions'
import { addDays, diffDays, localOf } from '@yeral/domain/time'
import { and, eq, inArray, isNull, sql, type SQL } from 'drizzle-orm'
import type { Queryable } from '../../db/client'
import { bookingItems, bookings, clients } from '../../db/schema'
import { awaitingAnswer } from '../bookings/repo'
import { blockedByCount } from './online'

type ClientRecord = typeof clients.$inferSelect

/** Business-local minutes since 2000-01-01: the scale of `bookings.span`. */
const spanMinuteOf = (now: number) => {
  const { date, min } = localOf(now)
  return diffDays(date, '2000-01-01') * 1440 + min
}

/** A completed visit as people see it now. */
export const doneAt = (now: number) =>
  sql`(${bookings.status} = 'completed' or (${bookings.status} = 'confirmed' and upper(${bookings.span}) <= ${spanMinuteOf(now)}))`

/** A waiting request, or a confirmed visit that hasn't ended. */
export const aheadAt = (now: number) =>
  sql`(${awaitingAnswer(now)} or (${bookings.status} = 'confirmed' and upper(${bookings.span}) > ${spanMinuteOf(now)}))`

/** The booking has an item with this person. */
export const withStaff = (staffId: string) =>
  sql`exists (select 1 from ${bookingItems} where ${bookingItems.bookingId} = ${bookings.id} and ${bookingItems.staffId} = ${staffId})`

/** Whose bookings the reader counts: everyone's, or a specialist their own (`clients: own`). */
export const ownOnly = (actor: Actor) => (scopeOf(actor, 'clients') === 'own' ? actor.staffId : null)

export interface ClientFacts {
  client: ClientRecord
  visits: number
  /** What the completed visits cost, hidden prices included (the team charges them). */
  total: number
  firstVisit: string | null
  lastVisit: string | null
  noShows: number
  segments: ClientSegment[]
  /** The soonest waiting request or visit ahead. */
  nextId: string | null
  /** The latest booking's day, ahead or past: the list puts the most recently seen first. */
  latest: string | null
}

/** The facts of the business's clients matching `where` that the reader may see. */
export async function clientFacts(db: Queryable, businessId: string, actor: Actor, now: number, where?: SQL): Promise<ClientFacts[]> {
  const done = doneAt(now)
  const today = localOf(now).date
  const own = ownOnly(actor)
  const query = db
    .select({
      client: clients,
      visits: sql<number>`count(*) filter (where ${done})::int`,
      recentVisits: sql<number>`count(*) filter (where ${done} and ${bookings.date} >= ${addDays(today, -REGULAR_WINDOW_DAYS)})::int`,
      total: sql<number>`coalesce(sum(${bookings.priceAmount}) filter (where ${done}), 0)::int`,
      firstVisit: sql<string | null>`(min(${bookings.date}) filter (where ${done}))::text`,
      lastVisit: sql<string | null>`(max(${bookings.date}) filter (where ${done}))::text`,
      noShows: sql<number>`count(*) filter (where ${bookings.status} = 'noshow')::int`,
      reports: sql<number>`count(*) filter (where ${bookings.complaintType} is not null)::int`,
      nextId: sql<
        string | null
      >`((array_agg(${bookings.id} order by ${bookings.date}, ${bookings.start}) filter (where ${aheadAt(now)}))[1])::text`,
      latest: sql<string | null>`max(${bookings.date})::text`,
    })
    .from(clients)
    .leftJoin(bookings, and(eq(bookings.clientId, clients.id), isNull(bookings.rescheduleOf), own ? withStaff(own) : undefined))
    .where(and(eq(clients.businessId, businessId), where))
    .groupBy(clients.id)
  const rows = own ? await query.having(sql`count(${bookings.id}) > 0`) : await query
  return rows.map((r) => ({
    client: r.client,
    visits: r.visits,
    total: r.total,
    firstVisit: r.firstVisit,
    lastVisit: r.lastVisit,
    noShows: r.noShows,
    segments: segmentsOf({ recentVisits: r.recentVisits, firstVisit: r.firstVisit, lastVisit: r.lastVisit, complaints: r.reports }, today),
    nextId: r.nextId,
    latest: r.latest,
  }))
}

/** The most recently seen first: the latest booking's day, else when the business added them. */
export function byRecent(a: ClientFacts, b: ClientFacts): number {
  const day = (f: ClientFacts) => f.latest ?? localOf(f.client.createdAt.getTime()).date
  return (
    day(b).localeCompare(day(a)) || b.client.createdAt.getTime() - a.client.createdAt.getTime() || a.client.id.localeCompare(b.client.id)
  )
}

/** Which of these are phone-only now: by hand, or the no-show count reaches the limit (B-35, `clients/online.ts`). */
export async function phoneOnlyOf(
  db: Queryable,
  facts: readonly ClientFacts[],
  rules: { blockAfterNoShows: number },
): Promise<Set<string>> {
  const byCount = await blockedByCount(
    db,
    facts.map((f) => f.client.id),
    rules,
  )
  return new Set(facts.filter((f) => f.client.onlineBlocked || byCount.has(f.client.id)).map((f) => f.client.id))
}

/** The rows a page shows, by id. */
export const bookingsByIds = async (db: Queryable, ids: readonly string[]) =>
  ids.length
    ? db
        .select()
        .from(bookings)
        .where(inArray(bookings.id, [...ids]))
    : []
