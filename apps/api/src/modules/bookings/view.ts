/** Booking rows → `BookingSummary` / `BookingDetail` (client spec §4.8: cards, detail drawer, actions). */
import type { BookingDetail, BookingSummary } from '@yeral/contract/bookings'
import { cancelDeadline, clientActions, effectiveStatus } from '@yeral/domain/lifecycle'
import type { Locale } from '@yeral/domain/model'
import { epochOf } from '@yeral/domain/time'
import { and, eq, inArray } from 'drizzle-orm'
import { bookingItems, bookings, businesses, classSessions, reviews, staff, tableAreas } from '../../db/schema'
import type { Deps } from '../../deps'
import { loadBusinesses } from '../availability/context'
import { cityRefOf, loadCities } from '../catalog/cities'
import { geoOf, photoOf, text } from '../catalog/map'
import { stateOf, type BookingRow } from './repo'

/** "Yzyna al" stays possible this long after the client's own cancel. */
export const RESTORE_MINUTES = 5

export async function summaries(deps: Deps, rows: BookingRow[], lang: Locale): Promise<BookingSummary[]> {
  if (!rows.length) return []
  const { db } = deps
  const now = deps.now()
  const ids = rows.map((r) => r.id)
  const [biz, items, areas, sessions] = await Promise.all([
    db
      .select()
      .from(businesses)
      .where(
        inArray(
          businesses.id,
          rows.map((r) => r.businessId),
        ),
      ),
    db.select().from(bookingItems).where(inArray(bookingItems.bookingId, ids)).orderBy(bookingItems.sort, bookingItems.start),
    db
      .select()
      .from(tableAreas)
      .where(inArray(tableAreas.id, rows.flatMap((r) => (r.areaId ? [r.areaId] : [])).concat(['00000000-0000-0000-0000-000000000000']))),
    db
      .select({ s: classSessions, trainer: staff.name })
      .from(classSessions)
      .leftJoin(staff, eq(staff.id, classSessions.trainerId))
      .where(
        inArray(classSessions.id, rows.flatMap((r) => (r.sessionId ? [r.sessionId] : [])).concat(['00000000-0000-0000-0000-000000000000'])),
      ),
  ])
  return rows.map((r) => {
    const b = biz.find((x) => x.id === r.businessId)
    const { status, cancelledBy } = effectiveStatus(stateOf(r), now)
    let what: BookingSummary['what']
    if (r.type === 'table') {
      const area = areas.find((a) => a.id === r.areaId)
      what = { type: 'table', partySize: r.partySize ?? 0, area: text(area?.name, lang), requests: r.tableRequests }
    } else if (r.type === 'class') {
      const s = sessions.find((x) => x.s.id === r.sessionId)
      what = { type: 'class', session: text(s?.s.name, lang), trainer: s?.trainer ?? null, seats: r.seats ?? 1 }
    } else {
      what = {
        type: 'appointment',
        items: items
          .filter((i) => i.bookingId === r.id)
          .map((i) => ({ service: text(i.serviceName, lang), staff: i.staffName, start: i.start, end: i.end })),
      }
    }
    return {
      code: r.code,
      business: {
        slug: b?.slug ?? '',
        name: b?.name ?? '',
        category: text(b?.kind, lang),
        photo: b?.photos[0] ? photoOf(deps, b.photos[0], lang) : null,
        phone: b?.phone ?? '',
      },
      what,
      date: r.date,
      start: r.start,
      end: r.end,
      status,
      cancelledBy,
      price: r.priceType ? { type: r.priceType, amount: r.priceAmount ?? 0 } : null,
      source: r.source,
    }
  })
}

export async function detailOf(deps: Deps, row: BookingRow, lang: Locale): Promise<BookingDetail> {
  const { db } = deps
  const now = deps.now()
  const [summary] = await summaries(deps, [row], lang)
  const lb = (await loadBusinesses(db, [row.businessId])).get(row.businessId)
  if (!summary || !lb) throw new Error('booking without business')
  const b = lb.business
  const state = stateOf(row)
  const { status } = effectiveStatus(state, now)
  const [review] = await db.select().from(reviews).where(eq(reviews.bookingId, row.id))
  const [move] = await db
    .select()
    .from(bookings)
    .where(and(eq(bookings.rescheduleOf, row.id), eq(bookings.status, 'pending')))
  const pendingMove = move && effectiveStatus(stateOf(move), now).status === 'pending' ? move : undefined

  const timeline: BookingDetail['timeline'] = [{ event: 'sent', at: row.createdAt.getTime() }]
  if (row.confirmedAt) timeline.push({ event: 'confirmed', at: row.confirmedAt.getTime() })
  if (pendingMove) timeline.push({ event: 'reschedule_requested', at: pendingMove.createdAt.getTime() })
  if (status === 'cancelled') {
    const at = row.cancelledAt?.getTime() ?? row.holdUntil?.getTime() ?? now
    const by = summary.cancelledBy
    timeline.push({
      event:
        by === 'system'
          ? 'expired'
          : by === 'business'
            ? row.declineReason
              ? 'declined'
              : 'cancelled_by_business'
            : 'cancelled_by_client',
      at,
    })
  }
  if (status === 'completed') timeline.push({ event: 'completed', at: row.completedAt?.getTime() ?? epochOf(row.date, row.end) })
  if (status === 'noshow')
    timeline.push({ event: 'noshow', at: row.complaintAt?.getTime() ?? row.completedAt?.getTime() ?? epochOf(row.date, row.end) })

  // a home-based business shows its exact address only once the booking is confirmed
  const exact = status === 'confirmed' || status === 'completed'
  const actions = clientActions(state, lb.rules, review ? { createdAt: review.createdAt.getTime() } : null, now)
  const restore =
    status === 'cancelled' &&
    row.cancelledBy === 'client' &&
    !!row.cancelledAt &&
    now - row.cancelledAt.getTime() < RESTORE_MINUTES * 60_000 &&
    now < epochOf(row.date, row.start)

  return {
    ...summary,
    timeline: timeline.sort((x, y) => x.at - y.at),
    address: b.hideExactAddress && !exact ? b.street : b.address,
    city: cityRefOf(await loadCities(deps.db), b.cityId, lang),
    entranceNote: b.hideExactAddress && !exact ? null : b.entranceNote,
    geo: geoOf(b, exact),
    clientNote: row.clientNote,
    holdUntil: status === 'pending' ? (row.holdUntil?.getTime() ?? null) : null,
    cancelDeadline: cancelDeadline(lb.rules, row),
    cancelReason: row.cancelReason,
    decline: row.declineReason ? { reason: row.declineReason, text: row.declineText, alternatives: row.declineAlternatives } : null,
    expiredAlternatives: status === 'cancelled' && row.cancelledBy === 'system' ? row.expiredAlternatives : [],
    reschedule: pendingMove
      ? { date: pendingMove.date, start: pendingMove.start, end: pendingMove.end, holdUntil: pendingMove.holdUntil?.getTime() ?? null }
      : null,
    actions: { ...actions, reschedule: actions.reschedule && !pendingMove, restore },
    review: review ? { rating: review.rating, tags: review.tags, text: review.text, createdAt: review.createdAt.getTime() } : null,
  }
}
