/**
 * "Müşderiler" (book B-32, B-34): the business's client list with its chips, the new-booking drawer's lookup (B-23)
 * and the client card. Everything comes from the bookings (ADR 0018); a specialist sees only clients with a booking
 * with them, and of each only those bookings; sums only with "See revenue" (the owner).
 */
import {
  LOOKUP_MIN_DIGITS,
  type ClientCard,
  type clientCardQuerySchema,
  type clientListQuerySchema,
  type clientLookupQuerySchema,
  type ClientRow,
  type clientMatchSchema,
} from '@yeral/contract/clients'
import { effectiveStatus } from '@yeral/domain/lifecycle'
import { COUNTRY_PREFIX, isPhone, nationalDigits, toE164 } from '@yeral/domain/phone'
import { scopeOf, type Actor } from '@yeral/domain/permissions'
import { localOf } from '@yeral/domain/time'
import { and, desc, eq, ilike, inArray, isNull, or, sql, type SQL } from 'drizzle-orm'
import type { z } from 'zod'
import { all, type Queryable } from '../../db/client'
import { bookingItems, bookings, clientNotes, clients, services, staff } from '../../db/schema'
import type { Deps } from '../../deps'
import { ApiError } from '../../http/errors'
import { itemsOfBookings, stateOf } from '../bookings/repo'
import { complaintAuthors, complaintOf, teamItemOf, teamPriceOf } from '../bookings/team-view'
import { likeOf, phoneLike, wordStartLikes } from '../catalog/search'
import { rulesOf } from '../settings/service'
import { alertNotesOf, avgCheckOf, bookingsByIds, clientFacts, doneAt, ownOnly, phoneOnlyOf, withStaff, type ClientFacts } from './facts'

interface Business {
  id: string
}
type ListQuery = z.infer<typeof clientListQuerySchema>
type LookupQuery = z.infer<typeof clientLookupQuerySchema>
type CardQuery = z.infer<typeof clientCardQuerySchema>
type ClientMatch = z.infer<typeof clientMatchSchema>

/** The drawer shows this many matches. */
const LOOKUP_MAX = 3
const USUAL_MAX = 3

/** "See revenue": the owner sees sums; administrators and specialists don't on the clients pages. */
const seesSums = (actor: Actor) => scopeOf(actor, 'revenue') === 'all'

/** A name with the letters typed, or a number with the digits typed (`phoneLike`). */
function searchOf(q: string | undefined): SQL | undefined {
  if (!q) return undefined
  if (/^[\d\s()+-]+$/.test(q)) return phoneLike(clients.phone, q)
  return ilike(clients.name, likeOf(q))
}

export async function clientList(
  db: Queryable,
  business: Business,
  actor: Actor,
  q: ListQuery,
  now: number,
): Promise<{ items: ClientRow[]; total: number; cursor: string | null }> {
  const offset = Number(q.cursor ?? 0) || 0
  const [{ rows, total }, rules] = await all(db, [
    () => clientFacts(db, business.id, actor, now, { where: searchOf(q.q), segment: q.segment, limit: q.limit, offset }),
    () => rulesOf(db, business.id),
  ])
  const [phoneOnly, next] = await all(db, [
    () =>
      phoneOnlyOf(
        db,
        rows.map((f) => f.client),
        rules,
      ),
    () =>
      bookingsByIds(
        db,
        rows.flatMap((f) => (f.nextId ? [f.nextId] : [])),
      ),
  ])
  const sums = seesSums(actor)
  return {
    items: rows.map((f) => {
      const n = next.find((b) => b.id === f.nextId)
      return {
        id: f.client.id,
        name: f.client.name,
        phone: f.client.phone,
        tags: f.client.tags,
        segments: f.segments,
        phoneOnly: phoneOnly.on.has(f.client.id),
        visits: f.visits,
        lastVisit: f.lastVisit,
        total: sums ? f.total : null,
        avgCheck: sums ? avgCheckOf(f) : null,
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
    total,
    cursor: offset + q.limit < total ? String(offset + q.limit) : null,
  }
}

/**
 * The new-booking drawer's matches (B-23): a number that starts with the digits typed, or a name with a word starting
 * with the letters typed; with their alert notes, the phone-only mark and the services they usually take. A specialist
 * finds their own clients so, and the business's client with the whole number typed, whoever served them: its alert
 * notes and phone-only mark matter to whoever books it.
 */
export async function clientLookup(db: Queryable, business: Business, actor: Actor, q: LookupQuery, now: number): Promise<ClientMatch[]> {
  const own = ownOnly(actor)
  let found: ClientFacts[]
  if (q.phone) {
    const digits = nationalDigits(q.phone)
    if (digits.length < LOOKUP_MIN_DIGITS) return []
    const prefix = sql`${clients.phone} like ${`${COUNTRY_PREFIX}${digits}%`}`
    found = (await clientFacts(db, business.id, actor, now, { where: prefix, limit: LOOKUP_MAX })).rows
    const whole = isPhone(q.phone) ? toE164(q.phone) : null
    if (own && whole && !found.some((f) => f.client.phone === whole)) {
      const exact = await clientFacts(db, business.id, actor, now, { where: eq(clients.phone, whole), scope: 'business' })
      found = [...exact.rows, ...found].slice(0, LOOKUP_MAX)
    }
  } else {
    const words = or(...wordStartLikes(q.name!).map((p) => ilike(clients.name, p)))
    found = (await clientFacts(db, business.id, actor, now, { where: words, limit: LOOKUP_MAX })).rows
  }
  if (!found.length) return []
  const ids = found.map((f) => f.client.id)
  const rules = await rulesOf(db, business.id)
  const [phoneOnly, alerts, usual] = await all(db, [
    () =>
      phoneOnlyOf(
        db,
        found.map((f) => f.client),
        rules,
      ),
    () => alertNotesOf(db, ids),
    () => usualServices(db, ids, own, now),
  ])
  const sums = seesSums(actor)
  return found.map((f) => ({
    id: f.client.id,
    name: f.client.name,
    phone: f.client.phone,
    visits: f.visits,
    avgCheck: sums ? avgCheckOf(f) : null,
    phoneOnly: phoneOnly.on.has(f.client.id),
    alerts: alerts.get(f.client.id) ?? [],
    usualServices: usual.get(f.client.id) ?? [],
  }))
}

/**
 * The services of each client's completed visits (a specialist: of theirs) that can still be booked, the most often
 * first, then the latest (an archived one isn't booked anew, book Q-210).
 */
async function usualServices(db: Queryable, clientIds: string[], own: string | null, now: number): Promise<Map<string, string[]>> {
  const rows = await db
    .select({
      clientId: bookings.clientId,
      serviceId: bookingItems.serviceId,
      times: sql<number>`count(*)::int`,
      last: sql<string>`max(${bookings.date})::text`,
    })
    .from(bookingItems)
    .innerJoin(bookings, eq(bookings.id, bookingItems.bookingId))
    .innerJoin(services, and(eq(services.id, bookingItems.serviceId), eq(services.archived, false)))
    .where(
      and(
        inArray(bookings.clientId, clientIds),
        isNull(bookings.rescheduleOf),
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
export async function visibleClient(db: Queryable, business: Business, actor: Actor, id: string, now: number): Promise<ClientFacts> {
  const [facts] = (await clientFacts(db, business.id, actor, now, { where: eq(clients.id, id) })).rows
  if (!facts) throw new ApiError('not_found')
  return facts
}

/** The client card (B-34): the header, the numbers, the team's notes, bookings ahead and before, reports, switches. */
export async function clientCard(deps: Deps, business: Business, actor: Actor, id: string, q: CardQuery): Promise<ClientCard> {
  const { db } = deps
  const now = deps.now()
  const own = ownOnly(actor)
  const [facts, rules, rows, notes] = await all(db, [
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
  const c = facts.client
  const [items, authors, phoneOnly] = await all(db, [
    () =>
      itemsOfBookings(
        db,
        [...ahead, ...history].map((s) => s.row.id),
      ),
    () =>
      complaintAuthors(
        db,
        reported.map((s) => s.row),
      ),
    () => phoneOnlyOf(db, [c], rules),
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
      avgCheck: seesSums(actor) ? avgCheckOf(facts) : null,
      lastVisit: facts.lastVisit,
      noShows: facts.noShows,
    },
    notes: notes.map(({ note, by }) => ({ id: note.id, text: note.text, alert: note.alert, by, at: note.createdAt.getTime() })),
    upcoming: ahead.map(view),
    history: history.map(view),
    moreHistory: past.length > history.length,
    // the same `by` as the calendar booking's complaint: a specialist removes their own by id (B-28)
    reports: reported.map(({ row }) => ({ code: row.code, date: row.date, ...complaintOf(row, authors)! })),
    settings: { phoneOnly: phoneOnly.on.has(c.id), phoneOnlyByCount: phoneOnly.byCount.has(c.id), noReminders: c.noRemindersSms },
  }
}
