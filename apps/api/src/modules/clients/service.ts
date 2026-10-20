/**
 * "Müşderiler" (book B-32, B-34): the business's client list with its chips, the new-booking drawer's lookup (B-23)
 * and the client card. Everything comes from the bookings (ADR 0018); a specialist sees only clients with a booking
 * with them, and of each only those bookings; sums only with "See revenue" (the owner).
 */
import type {
  ClientCard,
  clientCardQuerySchema,
  clientListQuerySchema,
  clientLookupQuerySchema,
  ClientRow,
  clientMatchSchema,
} from '@yeral/contract/clients'
import { effectiveStatus } from '@yeral/domain/lifecycle'
import { COUNTRY_PREFIX, nationalDigits } from '@yeral/domain/phone'
import { scopeOf, type Actor } from '@yeral/domain/permissions'
import { reachesNoShowLimit } from '@yeral/domain/clients'
import { localOf } from '@yeral/domain/time'
import { and, desc, eq, ilike, inArray, isNotNull, isNull, sql, type SQL } from 'drizzle-orm'
import type { z } from 'zod'
import { all, type Queryable } from '../../db/client'
import { bookingItems, bookings, clientNotes, clients, staff } from '../../db/schema'
import type { Deps } from '../../deps'
import { ApiError } from '../../http/errors'
import { itemsOfBookings, stateOf } from '../bookings/repo'
import { teamItemOf, teamPriceOf } from '../bookings/team-view'
import { likeOf } from '../catalog/search'
import { rulesOf } from '../settings/service'
import { bookingsByIds, byRecent, clientFacts, doneAt, ownOnly, phoneOnlyOf, withStaff, type ClientFacts } from './facts'
import { noShowsSinceReset } from './online'

interface Business {
  id: string
}
type ListQuery = z.infer<typeof clientListQuerySchema>
type LookupQuery = z.infer<typeof clientLookupQuerySchema>
type CardQuery = z.infer<typeof clientCardQuerySchema>
type ClientMatch = z.infer<typeof clientMatchSchema>

/** The drawer shows this many matches. */
const LOOKUP_MAX = 3
/** Digits typed before the drawer looks a number up. */
const LOOKUP_MIN_DIGITS = 3
const USUAL_MAX = 3

/** "See revenue": the owner sees sums; administrators and specialists don't on the clients pages. */
const seesSums = (actor: Actor) => scopeOf(actor, 'revenue') === 'all'

/** A name, or digits anywhere in the national number. */
function searchOf(q: string | undefined): SQL | undefined {
  if (!q) return undefined
  if (/^[\d\s()+-]+$/.test(q)) {
    const digits = nationalDigits(q)
    return digits ? sql`substr(${clients.phone}, ${COUNTRY_PREFIX.length + 1}) like ${likeOf(digits)}` : undefined
  }
  return ilike(clients.name, likeOf(q))
}

export async function clientList(
  db: Queryable,
  business: Business,
  actor: Actor,
  q: ListQuery,
  now: number,
): Promise<{ items: ClientRow[]; total: number; cursor: string | null }> {
  const [facts, rules] = await all(db, [() => clientFacts(db, business.id, actor, now, searchOf(q.q)), () => rulesOf(db, business.id)])
  const picked = facts.filter((f) => !q.segment || f.segments.includes(q.segment)).sort(byRecent)
  const offset = Number(q.cursor ?? 0) || 0
  const page = picked.slice(offset, offset + q.limit)
  const [phoneOnly, next] = await all(db, [
    () => phoneOnlyOf(db, page, rules),
    () =>
      bookingsByIds(
        db,
        page.flatMap((f) => (f.nextId ? [f.nextId] : [])),
      ),
  ])
  const sums = seesSums(actor)
  return {
    items: page.map((f) => {
      const n = next.find((b) => b.id === f.nextId)
      return {
        id: f.client.id,
        name: f.client.name,
        phone: f.client.phone,
        tags: f.client.tags,
        segments: f.segments,
        phoneOnly: phoneOnly.has(f.client.id),
        visits: f.visits,
        lastVisit: f.lastVisit,
        total: sums ? f.total : null,
        next: n
          ? {
              code: n.code,
              date: n.date,
              start: n.start,
              status: n.status === 'pending' ? ('pending' as const) : ('confirmed' as const),
              holdUntil: n.status === 'pending' ? (n.holdUntil?.getTime() ?? null) : null,
            }
          : null,
      }
    }),
    total: picked.length,
    cursor: offset + q.limit < picked.length ? String(offset + q.limit) : null,
  }
}

/**
 * The new-booking drawer's matches (B-23): a number that starts with the digits typed, or a name with the letters
 * typed; with their alert notes, the phone-only mark and the services they usually take.
 */
export async function clientLookup(db: Queryable, business: Business, actor: Actor, q: LookupQuery, now: number): Promise<ClientMatch[]> {
  let where: SQL
  if (q.phone) {
    const digits = nationalDigits(q.phone)
    if (digits.length < LOOKUP_MIN_DIGITS) return []
    where = sql`${clients.phone} like ${`${COUNTRY_PREFIX}${digits}%`}`
  } else where = ilike(clients.name, likeOf(q.name!))
  const [facts, rules] = await all(db, [() => clientFacts(db, business.id, actor, now, where), () => rulesOf(db, business.id)])
  const found = facts.sort(byRecent).slice(0, LOOKUP_MAX)
  if (!found.length) return []
  const ids = found.map((f) => f.client.id)
  const [phoneOnly, alerts, usual] = await all(db, [
    () => phoneOnlyOf(db, found, rules),
    () =>
      db
        .select({ clientId: clientNotes.clientId, text: clientNotes.text })
        .from(clientNotes)
        .where(and(inArray(clientNotes.clientId, ids), eq(clientNotes.alert, true)))
        .orderBy(desc(clientNotes.createdAt)),
    () => usualServices(db, ids, actor, now),
  ])
  const sums = seesSums(actor)
  return found.map((f) => ({
    id: f.client.id,
    name: f.client.name,
    phone: f.client.phone,
    visits: f.visits,
    avgCheck: sums && f.visits ? Math.round(f.total / f.visits) : null,
    phoneOnly: phoneOnly.has(f.client.id),
    alerts: alerts.filter((a) => a.clientId === f.client.id).map((a) => a.text),
    usualServices: usual.get(f.client.id) ?? [],
  }))
}

/** The services of each client's completed visits (a specialist: of theirs), the most often first, then the latest. */
async function usualServices(db: Queryable, clientIds: string[], actor: Actor, now: number): Promise<Map<string, string[]>> {
  const own = ownOnly(actor)
  const rows = await db
    .select({
      clientId: bookings.clientId,
      serviceId: bookingItems.serviceId,
      times: sql<number>`count(*)::int`,
      last: sql<string>`max(${bookings.date})::text`,
    })
    .from(bookingItems)
    .innerJoin(bookings, eq(bookings.id, bookingItems.bookingId))
    .where(
      and(
        inArray(bookings.clientId, clientIds),
        isNull(bookings.rescheduleOf),
        isNotNull(bookingItems.serviceId),
        doneAt(now),
        own ? eq(bookingItems.staffId, own) : undefined,
      ),
    )
    .groupBy(bookings.clientId, bookingItems.serviceId)
  const out = new Map<string, string[]>()
  for (const id of clientIds)
    out.set(
      id,
      rows
        .filter((r) => r.clientId === id)
        .sort((a, b) => b.times - a.times || b.last.localeCompare(a.last))
        .slice(0, USUAL_MAX)
        .map((r) => r.serviceId!),
    )
  return out
}

/** One client's facts, if the reader may see them (a specialist: one with a booking with them); 404 otherwise. */
async function visibleClient(db: Queryable, business: Business, actor: Actor, id: string, now: number): Promise<ClientFacts> {
  const [facts] = await clientFacts(db, business.id, actor, now, eq(clients.id, id))
  if (!facts) throw new ApiError('not_found')
  return facts
}

/** The client card (B-34): the header, the numbers, the team's notes, bookings ahead and before, reports, switches. */
export async function clientCard(deps: Deps, business: Business, actor: Actor, id: string, q: CardQuery): Promise<ClientCard> {
  const { db } = deps
  const now = deps.now()
  const own = ownOnly(actor)
  const [facts, rules, rows, notes, sinceReset] = await all(db, [
    () => visibleClient(db, business, actor, id, now),
    () => rulesOf(db, business.id),
    () =>
      db
        .select()
        .from(bookings)
        .where(
          and(
            eq(bookings.clientId, id),
            eq(bookings.businessId, business.id),
            isNull(bookings.rescheduleOf),
            own ? withStaff(own) : undefined,
          ),
        ),
    () =>
      db
        .select({ note: clientNotes, by: staff.name })
        .from(clientNotes)
        .leftJoin(staff, eq(staff.id, clientNotes.authorStaffId))
        .where(eq(clientNotes.clientId, id))
        .orderBy(desc(clientNotes.createdAt)),
    () => noShowsSinceReset(db, id),
  ])
  const seen = rows.map((row) => ({ row, ...effectiveStatus(stateOf(row), now) }))
  const ahead = seen
    .filter((s) => s.status === 'pending' || s.status === 'confirmed')
    .sort((a, b) => a.row.date.localeCompare(b.row.date) || a.row.start - b.row.start)
  const past = seen.filter((s) => !ahead.includes(s)).sort((a, b) => b.row.date.localeCompare(a.row.date) || b.row.start - a.row.start)
  const history = past.slice(0, q.history)
  const reported = seen
    .filter((s) => s.row.complaintType && s.row.complaintAt)
    .sort((a, b) => b.row.complaintAt!.getTime() - a.row.complaintAt!.getTime())
  const authorIds = [...new Set(reported.flatMap((s) => (s.row.complaintBy ? [s.row.complaintBy] : [])))]
  const [items, authors] = await all(db, [
    () =>
      itemsOfBookings(
        db,
        [...ahead, ...history].map((s) => s.row.id),
      ),
    async () => (authorIds.length ? db.select({ id: staff.id, name: staff.name }).from(staff).where(inArray(staff.id, authorIds)) : []),
  ])
  const view = ({ row, status }: (typeof seen)[number]) => ({
    code: row.code,
    date: row.date,
    start: row.start,
    end: row.end,
    status,
    holdUntil: status === 'pending' ? (row.holdUntil?.getTime() ?? null) : null,
    items: items.filter((i) => i.bookingId === row.id).map((i) => teamItemOf(i, q.lang)),
    price: teamPriceOf(row),
  })
  const c = facts.client
  const byCount = reachesNoShowLimit(sinceReset, rules)
  return {
    id: c.id,
    name: c.name,
    phone: c.phone,
    account: !!c.userId,
    birthday: c.birthday,
    source: c.source,
    tags: c.tags,
    segments: facts.segments,
    since: localOf(c.createdAt.getTime()).date,
    stats: {
      visits: facts.visits,
      avgCheck: seesSums(actor) && facts.visits ? Math.round(facts.total / facts.visits) : null,
      lastVisit: facts.lastVisit,
      noShows: facts.noShows,
    },
    notes: notes.map(({ note, by }) => ({ id: note.id, text: note.text, alert: note.alert, by, at: note.createdAt.getTime() })),
    upcoming: ahead.map(view),
    history: history.map(view),
    moreHistory: past.length > history.length,
    reports: reported.map(({ row }) => ({
      code: row.code,
      date: row.date,
      type: row.complaintType!,
      text: row.complaintText,
      by: authors.find((a) => a.id === row.complaintBy)?.name ?? null,
      at: row.complaintAt!.getTime(),
    })),
    settings: { phoneOnly: c.onlineBlocked || byCount, phoneOnlyByCount: byCount, noReminders: c.noRemindersSms },
  }
}
