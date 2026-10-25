/**
 * Booking requests as the business answers them (book B-19, B-20, B-21): the waiting ones each team member may see, and
 * confirming or declining one. New requests and clients' moves of confirmed bookings alike; who may answer follows the
 * "who answers" setting and the per-person override (chapter 3).
 */
import type { CannotMoveDetails } from '@yeral/contract/errors'
import type { declineInputSchema, requestSchema } from '@yeral/contract/requests'
import { findAppointmentSlot } from '@yeral/domain/availability'
import { withinHours, type BusinessHours } from '@yeral/domain/hours'
import { expiryWarningAt, canAnswerRequest as requestOpen, offerPast } from '@yeral/domain/lifecycle'
import type { Locale } from '@yeral/domain/model'
import { canAnswerRequest, canOn, type Actor } from '@yeral/domain/permissions'
import { DEFAULT_RULES, type RequestAnswerers } from '@yeral/domain/rules'
import { and, asc, eq, inArray } from 'drizzle-orm'
import type { z } from 'zod'
import { all, type Queryable } from '../../db/client'
import { bookingItems, bookingRules, bookings, clients, staff, type TimeSlot } from '../../db/schema'
import type { Deps } from '../../deps'
import { ApiError, invalid, type Issue } from '../../http/errors'
import { appointmentContext, assertStaffFree, loadBusiness, loadBusy, loadHours, lockedHours, OutsideHours } from '../availability/context'
import { confirmBooking } from '../bookings/confirm'
import { teamItemOf, teamPriceOf } from '../bookings/team-view'
import { alertNotesOf, clientFacts } from '../clients/facts'
import { bookedServices, declineForBusiness, rebookQuery, refuseMove } from '../bookings/engine'
import { awaitingAnswer, guard, itemsOf, lockBooking, stateOf, type BookingRow } from '../bookings/repo'

type RequestView = z.infer<typeof requestSchema>
type DeclineInput = z.infer<typeof declineInputSchema>
interface Business {
  id: string
}

/** Who answers a request by the setting: a specialist without the app has the desk answer for them. */
function answeredBy(answerers: RequestAnswerers, forPhoneOnlyStaff: boolean): RequestView['answeredBy'] {
  if (forPhoneOnlyStaff || answerers === 'desk') return 'desk'
  return answerers === 'each' ? 'specialist' : 'anyone'
}

export async function answerersOf(db: Queryable, businessId: string): Promise<RequestAnswerers> {
  return (await answeringOf(db, [businessId])).get(businessId)!.answerers
}

/**
 * How requests are answered at these businesses: who answers, whether bookings confirm at once, and whether someone
 * bookable works without the app (the desk answers for them); the rules' defaults for one without a rules row yet.
 */
export async function answeringOf(
  db: Queryable,
  businessIds: readonly string[],
): Promise<Map<string, { answerers: RequestAnswerers; instant: boolean; phoneOnlyStaff: boolean }>> {
  const ids = [...new Set(businessIds)]
  const [rules, phoneOnly] = ids.length
    ? await all(db, [
        () =>
          db
            .select({ businessId: bookingRules.businessId, answerers: bookingRules.requestAnswerers, mode: bookingRules.confirmMode })
            .from(bookingRules)
            .where(inArray(bookingRules.businessId, ids)),
        () =>
          db
            .selectDistinct({ businessId: staff.businessId })
            .from(staff)
            .where(and(inArray(staff.businessId, ids), eq(staff.hasApp, false), eq(staff.status, 'active'), eq(staff.bookable, true))),
      ])
    : [[], []]
  return new Map(
    ids.map((id) => {
      const r = rules.find((x) => x.businessId === id)
      return [
        id,
        {
          answerers: r?.answerers ?? DEFAULT_RULES.requestAnswerers,
          instant: (r?.mode ?? DEFAULT_RULES.confirmMode) === 'instant',
          phoneOnlyStaff: phoneOnly.some((x) => x.businessId === id),
        },
      ]
    }),
  )
}

/** The requests' items with whether each specialist has the app, in the booking's order. */
export async function requestItems(db: Queryable, bookingIds: string[]) {
  if (!bookingIds.length) return []
  return db
    .select({ item: bookingItems, hasApp: staff.hasApp })
    .from(bookingItems)
    .leftJoin(staff, eq(staff.id, bookingItems.staffId))
    .where(inArray(bookingItems.bookingId, bookingIds))
    .orderBy(asc(bookingItems.sort), asc(bookingItems.start))
}
type RequestItem = Awaited<ReturnType<typeof requestItems>>[number]

/**
 * What decides who answers one request: its specialists, and whether one of them works without the app (the desk
 * answers then). The switcher's count and the requests list both read it.
 */
export function answerFacts(items: readonly RequestItem[]): { staffIds: string[]; forPhoneOnlyStaff: boolean } {
  return {
    staffIds: items.flatMap((i) => (i.item.staffId ? [i.item.staffId] : [])),
    forPhoneOnlyStaff: items.some((i) => !!i.item.staffId && i.hasApp === false),
  }
}

/** The waiting requests the actor may see (a specialist, the ones they're on), the most urgent first. */
export async function requestsFor(db: Queryable, business: Business, actor: Actor, lang: Locale, now: number): Promise<RequestView[]> {
  const rows = await db
    .select()
    .from(bookings)
    .where(and(eq(bookings.businessId, business.id), awaitingAnswer(now)))
    .orderBy(asc(bookings.holdUntil), asc(bookings.code))
  if (!rows.length) return []
  const originalIds = rows.flatMap((r) => (r.rescheduleOf ? [r.rescheduleOf] : []))
  const clientIds = [...new Set(rows.flatMap((r) => (r.clientId ? [r.clientId] : [])))]
  const [items, answerers, originals, history, alerts, hours] = await all(db, [
    () =>
      requestItems(
        db,
        rows.map((r) => r.id),
      ),
    () => answerersOf(db, business.id),
    async () => (originalIds.length ? db.select().from(bookings).where(inArray(bookings.id, originalIds)) : []),
    // the risk signal for whoever answers: the business's visits (completed as seen now) and no-shows
    async () =>
      clientIds.length
        ? (await clientFacts(db, business.id, actor, now, { where: inArray(clients.id, clientIds), scope: 'business' })).rows
        : [],
    () => alertNotesOf(db, clientIds),
    () => loadHours(db, business.id),
  ])
  const byBooking = new Map<string, RequestItem[]>()
  for (const i of items) byBooking.set(i.item.bookingId, [...(byBooking.get(i.item.bookingId) ?? []), i])
  // the ones the viewer may see (a specialist's: those with them)
  const visible = rows.flatMap((r) => {
    const mine = byBooking.get(r.id) ?? []
    const facts = answerFacts(mine)
    return canOn(actor, 'calendar', facts.staffIds) ? [{ r, mine, facts }] : []
  })
  // a move confirms only where it fits now (B-21's line: "free at the new time" or not)
  const fits = await all(
    db,
    visible.map(
      ({ r, mine }) =>
        async () =>
          r.rescheduleOf
            ? !(await moveProblem(
                db,
                hours,
                r,
                mine.map((i) => i.item),
              ))
            : null,
    ),
  )
  return visible.map(({ r, mine, facts }, i) => {
    const from = originals.find((o) => o.id === r.rescheduleOf)
    const seen = history.find((h) => h.client.id === r.clientId)
    return {
      code: r.code,
      kind: r.rescheduleOf ? ('move' as const) : ('new' as const),
      type: r.type,
      date: r.date,
      start: r.start,
      end: r.end,
      holdUntil: r.holdUntil!.getTime(),
      warnAt: expiryWarningAt(r.createdAt.getTime(), r.holdUntil!.getTime(), hours),
      sentAt: r.createdAt.getTime(),
      items: mine.map(({ item }) => teamItemOf(item, lang)),
      price: teamPriceOf(r),
      note: r.clientNote,
      from: from ? { date: from.date, start: from.start, end: from.end } : null,
      fits: fits[i] ?? null,
      client: {
        id: r.clientId,
        name: r.clientName ?? '',
        phone: r.clientPhone,
        visits: seen?.visits ?? 0,
        noShows: seen?.noShows ?? 0,
        alerts: (r.clientId && alerts.get(r.clientId)) || [],
      },
      canAnswer: canAnswerRequest(actor, answerers, facts),
      answeredBy: answeredBy(answerers, facts.forPhoneOnlyStaff),
    }
  })
}

/**
 * The waiting request with this code at this business that the actor may answer now; 404 for one they can't see, else
 * the refusal the answer would get.
 */
export async function answerable(db: Queryable, business: Business, actor: Actor, code: string, now: number): Promise<BookingRow> {
  const [b] = await db
    .select()
    .from(bookings)
    .where(and(eq(bookings.businessId, business.id), eq(bookings.code, code)))
  if (!b) throw new ApiError('not_found')
  const facts = answerFacts(await requestItems(db, [b.id]))
  if (!canOn(actor, 'calendar', facts.staffIds)) throw new ApiError('not_found')
  guard(requestOpen(stateOf(b), now))
  if (!canAnswerRequest(actor, await answerersOf(db, business.id), facts)) throw new ApiError('forbidden')
  return b
}

/**
 * Why a waiting move can't be confirmed now (B-21): a day the business closed since (a waiting move isn't asked about
 * when the hours change), or one its specialist no longer works then (a day off, a new shift, blocked time, gone from
 * the team: B-47, B-50); null when it fits. The confirm refuses by it, and the list says it (`fits`).
 */
async function moveProblem(
  db: Queryable,
  hours: BusinessHours,
  row: Pick<BookingRow, 'date' | 'start' | 'end'>,
  items: Parameters<typeof assertStaffFree>[3],
): Promise<CannotMoveDetails | null> {
  if (!withinHours(hours, row.date, { start: row.start, end: row.end })) return { problem: 'outside_hours', staffId: '' }
  try {
    await assertStaffFree(db, hours, row.date, items)
  } catch (e) {
    if (!(e instanceof OutsideHours)) throw e
    return { problem: e.why === 'blocked' ? 'blocked' : 'staff_off', staffId: e.staffId ?? '' }
  }
  return null
}

/** "Tassykla": the request is confirmed and the client told; a move moves its booking (B-21). */
export async function confirmRequest(deps: Deps, business: Business, actor: Actor, code: string): Promise<void> {
  const b = await answerable(deps.db, business, actor, code, deps.now())
  await deps.db.transaction(async (tx) => {
    // the hours first, then a move's booking, then the request: the order every path takes them in
    const hours = await lockedHours(tx, business.id)
    if (b.rescheduleOf) await lockBooking(tx, b.rescheduleOf)
    const row = await lockBooking(tx, b.id)
    guard(requestOpen(stateOf(row), deps.now()))
    const problem = row.rescheduleOf ? await moveProblem(tx, hours, row, await itemsOf(tx, row.id)) : null
    if (problem) throw new ApiError('cannot_move', problem)
    await confirmBooking(tx, deps, row)
  })
}

/**
 * The offered times (B-20), for appointments: each ahead by the lead time (Q-264), at most once, and free now for its
 * specialist with the request's services, the request's own hold counted as free; each keeps its specialist (Q-159).
 */
async function checkOffers(deps: Deps, b: BookingRow, offers: NonNullable<DeclineInput['offers']>, now: number): Promise<TimeSlot[]> {
  if (!offers.length) return []
  // tables and classes can't be re-booked online yet (after the MVP): nothing to offer
  if (b.type !== 'appointment') throw invalid({ path: ['offers'], code: 'not_appointment' })
  const lb = await loadBusiness(deps.db, b.businessId)
  const dates = offers.map((o) => o.date).sort()
  const [booked, busy] = await all(deps.db, [
    () => bookedServices(deps.db, b.id),
    () => loadBusy(deps.db, [b.businessId], dates[0]!, dates.at(-1)!),
  ])
  const ctx = appointmentContext(lb, busy, now)
  const issues: Issue[] = []
  const out: TimeSlot[] = []
  for (const [i, o] of offers.entries()) {
    const slot = findAppointmentSlot(ctx, rebookQuery(booked, { date: o.date, staffId: o.staffId }, [b.id]), o.start)
    const problem =
      offers.findIndex((x) => x.date === o.date && x.start === o.start && x.staffId === o.staffId) !== i
        ? 'duplicate'
        : offerPast(o, lb.rules.leadMinutes, now)
          ? 'past'
          : slot
            ? null
            : 'not_free'
    if (problem) issues.push({ path: ['offers', i], code: problem })
    else out.push({ date: o.date, start: o.start, end: slot!.end, staffId: o.staffId })
  }
  if (issues.length) throw invalid(...issues)
  return out
}

/**
 * "Ret et": a new request is cancelled by the business with the reason and any offered times, which the client takes
 * in one tap (B-20); a move is refused with the reason only and its booking keeps its time (B-21). The client hears it
 * by SMS, with the reason, either way (book Q-289).
 */
export async function declineRequest(deps: Deps, business: Business, actor: Actor, code: string, input: DeclineInput): Promise<void> {
  const now = deps.now()
  const b = await answerable(deps.db, business, actor, code, now)
  if (b.rescheduleOf && input.offers?.length) throw invalid({ path: ['offers'], code: 'move' })
  const offers = b.rescheduleOf ? [] : await checkOffers(deps, b, input.offers ?? [], now)
  const reason = { reason: input.reason, text: input.reason === 'other' ? (input.text ?? null) : null }
  await deps.db.transaction(async (tx) => {
    const at = new Date(deps.now())
    const original = b.rescheduleOf ? await lockBooking(tx, b.rescheduleOf) : undefined
    const row = await lockBooking(tx, b.id)
    guard(requestOpen(stateOf(row), deps.now()))
    if (!original) {
      await declineForBusiness(tx, row, at, { ...reason, offers })
      return
    }
    await refuseMove(tx, original, row, at, reason)
  })
}
