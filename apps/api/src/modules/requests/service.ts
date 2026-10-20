/**
 * Booking requests as the business answers them (book B-19, B-20, B-21): the waiting ones each team member may see, and
 * confirming or declining one. New requests and clients' moves of confirmed bookings alike; who may answer follows the
 * "who answers" setting and the per-person override (chapter 3).
 */
import type { declineInputSchema, requestSchema } from '@yeral/contract/requests'
import { findAppointmentSlot } from '@yeral/domain/availability'
import { canAnswerRequest as requestOpen, offerPast } from '@yeral/domain/lifecycle'
import type { Locale } from '@yeral/domain/model'
import { canAnswerRequest, scopeOf, type Actor } from '@yeral/domain/permissions'
import type { RequestAnswerers } from '@yeral/domain/rules'
import { epochOf } from '@yeral/domain/time'
import { and, asc, eq, inArray, sql } from 'drizzle-orm'
import type { z } from 'zod'
import type { Queryable } from '../../db/client'
import { bookingItems, bookingRules, bookings, jobs, staff, type TimeSlot } from '../../db/schema'
import type { Deps } from '../../deps'
import { ApiError } from '../../http/errors'
import { emit } from '../../notify'
import { appointmentContext, loadBusinesses, loadBusy } from '../availability/context'
import { text } from '../catalog/map'
import { confirmBooking } from '../bookings/confirm'
import { bookedServices, rebookQuery } from '../bookings/create'
import { awaitingAnswer, lockBooking, recordMoveRefused, setStatus, stateOf, type BookingRow } from '../bookings/repo'

type RequestView = z.infer<typeof requestSchema>
type DeclineInput = z.infer<typeof declineInputSchema>
interface Business {
  id: string
}

const guard = (problem: ReturnType<typeof requestOpen>) => {
  if (problem) throw new ApiError(problem)
}

/** Who answers a request by the setting: a specialist without the app has the desk answer for them. */
function answeredBy(answerers: RequestAnswerers, forPhoneOnlyStaff: boolean): RequestView['answeredBy'] {
  if (forPhoneOnlyStaff || answerers === 'desk') return 'desk'
  return answerers === 'each' ? 'specialist' : 'anyone'
}

async function answerersOf(db: Queryable, businessId: string): Promise<RequestAnswerers> {
  const [rules] = await db
    .select({ answerers: bookingRules.requestAnswerers })
    .from(bookingRules)
    .where(eq(bookingRules.businessId, businessId))
  return rules?.answerers ?? 'both'
}

/** The request's specialists, and whether one of them works without the app. */
async function whoFor(db: Queryable, bookingIds: string[]) {
  return db
    .select({ item: bookingItems, hasApp: staff.hasApp })
    .from(bookingItems)
    .leftJoin(staff, eq(staff.id, bookingItems.staffId))
    .where(inArray(bookingItems.bookingId, bookingIds))
    .orderBy(asc(bookingItems.sort), asc(bookingItems.start))
}

/** The waiting requests the actor may see (a specialist, the ones they're on), the most urgent first. */
export async function requestsFor(db: Queryable, business: Business, actor: Actor, lang: Locale, now: number): Promise<RequestView[]> {
  const rows = await db
    .select()
    .from(bookings)
    .where(and(eq(bookings.businessId, business.id), awaitingAnswer(now)))
    .orderBy(asc(bookings.holdUntil), asc(bookings.code))
  if (!rows.length) return []
  const ids = rows.map((r) => r.id)
  const originalIds = rows.flatMap((r) => (r.rescheduleOf ? [r.rescheduleOf] : []))
  const clientIds = [...new Set(rows.flatMap((r) => (r.clientId ? [r.clientId] : [])))]
  const [items, answerers, originals, history] = await Promise.all([
    whoFor(db, ids),
    answerersOf(db, business.id),
    originalIds.length ? db.select().from(bookings).where(inArray(bookings.id, originalIds)) : [],
    clientIds.length
      ? db
          .select({
            clientId: bookings.clientId,
            visits: sql<number>`count(*) filter (where ${bookings.status} = 'completed')::int`,
            noShows: sql<number>`count(*) filter (where ${bookings.status} = 'noshow')::int`,
          })
          .from(bookings)
          .where(and(eq(bookings.businessId, business.id), inArray(bookings.clientId, clientIds)))
          .groupBy(bookings.clientId)
      : [],
  ])
  const own = scopeOf(actor, 'calendar') === 'own'
  return rows.flatMap((r) => {
    const mine = items.filter((i) => i.item.bookingId === r.id)
    const staffIds = mine.flatMap((i) => (i.item.staffId ? [i.item.staffId] : []))
    if (own && !staffIds.includes(actor.staffId)) return []
    const forPhoneOnlyStaff = mine.some((i) => i.item.staffId && i.hasApp === false)
    const from = originals.find((o) => o.id === r.rescheduleOf)
    const seen = history.find((h) => h.clientId === r.clientId)
    return [
      {
        code: r.code,
        kind: r.rescheduleOf ? ('move' as const) : ('new' as const),
        type: r.type,
        date: r.date,
        start: r.start,
        end: r.end,
        holdUntil: r.holdUntil!.getTime(),
        sentAt: r.createdAt.getTime(),
        items: mine.map(({ item }) => ({
          serviceId: item.serviceId,
          service: text(item.serviceName, lang),
          staffId: item.staffId,
          staff: item.staffName,
          start: item.start,
          end: item.end,
        })),
        price: r.priceType ? { type: r.priceType, amount: r.priceType === 'hidden' ? 0 : (r.priceAmount ?? 0) } : null,
        note: r.clientNote,
        from: from ? { date: from.date, start: from.start, end: from.end } : null,
        client: { name: r.clientName ?? '', phone: r.clientPhone, visits: seen?.visits ?? 0, noShows: seen?.noShows ?? 0 },
        canAnswer: canAnswerRequest(actor, answerers, { staffIds, forPhoneOnlyStaff }),
        answeredBy: answeredBy(answerers, forPhoneOnlyStaff),
      },
    ]
  })
}

/** The waiting request with this code at this business that the actor may answer; 404 for one they can't see. */
async function answerable(db: Queryable, business: Business, actor: Actor, code: string, now: number): Promise<BookingRow> {
  const [b] = await db
    .select()
    .from(bookings)
    .where(and(eq(bookings.businessId, business.id), eq(bookings.code, code)))
  if (!b) throw new ApiError('not_found')
  const mine = await whoFor(db, [b.id])
  const staffIds = mine.flatMap((i) => (i.item.staffId ? [i.item.staffId] : []))
  if (scopeOf(actor, 'calendar') === 'own' && !staffIds.includes(actor.staffId)) throw new ApiError('not_found')
  guard(requestOpen(stateOf(b), now))
  const forPhoneOnlyStaff = mine.some((i) => i.item.staffId && i.hasApp === false)
  if (!canAnswerRequest(actor, await answerersOf(db, business.id), { staffIds, forPhoneOnlyStaff })) throw new ApiError('forbidden')
  return b
}

/** "Tassykla": the request is confirmed and the client told; a move moves its booking (B-21). */
export async function confirmRequest(deps: Deps, business: Business, actor: Actor, code: string): Promise<void> {
  const b = await answerable(deps.db, business, actor, code, deps.now())
  await deps.db.transaction(async (tx) => {
    // a move: its booking's lock first, the order every path takes them in
    if (b.rescheduleOf) await lockBooking(tx, b.rescheduleOf)
    const row = await lockBooking(tx, b.id)
    guard(requestOpen(stateOf(row), deps.now()))
    await confirmBooking(tx, deps, row)
  })
}

/**
 * The offered times (B-20): each ahead by the lead time (Q-264), at most once, and free now for its specialist with the
 * request's services, the request's own hold counted as free; each keeps its specialist (Q-159).
 */
async function checkOffers(deps: Deps, b: BookingRow, offers: NonNullable<DeclineInput['offers']>, now: number): Promise<TimeSlot[]> {
  if (!offers.length) return []
  const lb = (await loadBusinesses(deps.db, [b.businessId])).get(b.businessId)
  if (!lb) throw new ApiError('not_found')
  const booked = await bookedServices(deps.db, b.id)
  const issues: { path: (string | number)[]; code: string }[] = []
  const out: TimeSlot[] = []
  for (const [i, o] of offers.entries()) {
    if (offers.findIndex((x) => x.date === o.date && x.start === o.start && x.staffId === o.staffId) !== i) {
      issues.push({ path: ['offers', i], code: 'duplicate' })
      continue
    }
    if (offerPast(o, lb.rules.leadMinutes, now)) {
      issues.push({ path: ['offers', i], code: 'past' })
      continue
    }
    const ctx = appointmentContext(lb, await loadBusy(deps.db, [b.businessId], o.date, o.date), now)
    const slot = findAppointmentSlot(ctx, rebookQuery(booked, { date: o.date, staffId: o.staffId }, [b.id]), o.start)
    if (!slot) issues.push({ path: ['offers', i], code: 'not_free' })
    else out.push({ date: o.date, start: o.start, end: slot.end, staffId: o.staffId })
  }
  if (issues.length) throw new ApiError('validation_error', { issues })
  return out
}

/**
 * "Ret et": a new request is cancelled by the business with the reason and any offered times, which the client takes
 * in one tap (B-20); a move is refused with the reason only and its booking keeps its time (B-21). The client hears it
 * by SMS either way (book Q-289).
 */
export async function declineRequest(deps: Deps, business: Business, actor: Actor, code: string, input: DeclineInput): Promise<void> {
  const now = deps.now()
  const b = await answerable(deps.db, business, actor, code, now)
  if (b.rescheduleOf && input.offers?.length) throw new ApiError('validation_error', { issues: [{ path: ['offers'], code: 'move' }] })
  const offers = b.rescheduleOf ? [] : await checkOffers(deps, b, input.offers ?? [], now)
  const reason = { reason: input.reason, text: input.reason === 'other' ? (input.text ?? null) : null }
  await deps.db.transaction(async (tx) => {
    const at = new Date(deps.now())
    const original = b.rescheduleOf ? await lockBooking(tx, b.rescheduleOf) : undefined
    const row = await lockBooking(tx, b.id)
    guard(requestOpen(stateOf(row), deps.now()))
    // a move's answer isn't counted toward the answer time (book Q-113): it isn't a new request
    const declined = await setStatus(tx, row, { status: 'cancelled', cancelledBy: 'business', at, answered: !original })
    if (!original)
      await tx
        .update(bookings)
        .set({ declineReason: reason.reason, declineText: reason.text, declineAlternatives: offers })
        .where(eq(bookings.id, declined.id))
    await emit(tx, {
      type: 'booking.declined',
      businessId: declined.businessId,
      bookingId: declined.id,
      bookingCode: declined.code,
      userId: declined.userId,
    })
    const recorded = !!original && (await recordMoveRefused(tx, original, declined, { by: 'business', ...reason }, at.getTime()))
    const told = original ? (recorded && at.getTime() < epochOf(original.date, original.start) ? original : undefined) : declined
    // the text and its link are made when it's sent: no stored row holds a working link
    if (told?.clientPhone) {
      const kind = original ? 'moveRefused' : 'declined'
      await tx
        .insert(jobs)
        .values({
          kind: 'booking.sms',
          runAt: at,
          payload: { bookingId: told.id, kind, date: told.date, start: told.start },
          dedupeKey: `${kind}:${declined.id}`,
        })
        .onConflictDoNothing({ target: jobs.dedupeKey })
    }
  })
}
