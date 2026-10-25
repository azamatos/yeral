/** Booking rows → `BookingSummary` / `BookingDetail` (client spec §4.8: cards, detail drawer, actions). */
import type { BookingDetail, BookingSummary, MyBooking, OfferSource } from '@yeral/contract/bookings'
import {
  addressAsShown,
  cancelDeadline,
  canClientRestore,
  clientActions,
  effectiveStatus,
  hearsOfMove,
  showsExactAddress,
} from '@yeral/domain/lifecycle'
import { isBusinessSideCancel, isOnlineSource, reasonWords, type Locale } from '@yeral/domain/model'
import { epochOf } from '@yeral/domain/time'
import { and, eq, inArray } from 'drizzle-orm'
import { bookingItems, bookings, businesses, classSessions, reviews, staff, tableAreas } from '../../db/schema'
import type { Deps } from '../../deps'
import { loadBusinesses, type LoadedBusiness } from '../availability/context'
import { cityRef } from '../catalog/cities'
import { geoOf, photoOf, text } from '../catalog/map'
import { bookOnlineFor } from '../clients/online'
import { bookingRecipient } from './links'
import { offeredTimes, offersOf } from './offers'
import { noShowMarkedAtOf, refusalCounts, restoreStateOf, stateOf, type BookingRow } from './repo'

/** "Yzyna al" stays possible this long after the client's own cancel. */

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
        example: b?.demo ?? false,
        category: text(b?.kind, lang),
        photo: b?.photos[0] ? photoOf(deps, b.photos[0], lang, b.name) : null,
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

/**
 * What a booking offers its client now, the card in My bookings and the drawer alike (book C-24–C-31): its actions, a
 * waiting move, the offered times and whether it may still be booked online. Asks only what its status can have: a
 * review once completed, a waiting move while confirmed, the booking an offer became once there are offers.
 */
async function clientSideOf(deps: Deps, row: BookingRow, lb: LoadedBusiness, now: number) {
  const { db } = deps
  const state = stateOf(row)
  const { status } = effectiveStatus(state, now)
  const [review] = status === 'completed' ? await db.select().from(reviews).where(eq(reviews.bookingId, row.id)) : []
  const [move] =
    status === 'confirmed'
      ? await db
          .select()
          .from(bookings)
          .where(and(eq(bookings.rescheduleOf, row.id), eq(bookings.status, 'pending')))
      : []
  const pendingMove = move && effectiveStatus(stateOf(move), now).status === 'pending' ? move : undefined
  const offers = offersOf(row, now)
  // one booking per declined or expired request: once an offer is taken the others go
  const [taker] = offers ? await db.select({ code: bookings.code }).from(bookings).where(eq(bookings.alternativeOf, row.id)) : []
  // none from a business that has closed (book Q-213)
  const chips = async (source: OfferSource) =>
    offers?.source === source && !taker && !lb.business.closedAt ? offeredTimes(db, lb, row, offers.list, now) : []
  // a paused business or a phone-only client: no free-time chips, no move, the call card instead (book Q-154)
  // checked for the phone its SMS go to, as the texts are (an account's phone now, after a change too); asked once
  let online: Promise<boolean> | undefined
  const bookOnline = () => (online ??= bookingRecipient(db, row).then((recipient) => bookOnlineFor(db, lb, recipient)))
  const actions = clientActions(state, lb.rules, review ? { createdAt: review.createdAt.getTime() } : null, now)
  // offered while the 5 minutes run and the visit hasn't started; a request whose answer time ran out is offered too,
  // and tapping it says so (ROUND6 A6)
  const why = canClientRestore(restoreStateOf(row), now)
  return {
    status,
    review,
    move,
    pendingMove,
    offers,
    taker,
    chips,
    bookOnline,
    // a second move replaces a waiting one (ROUND6 A3)
    actions: {
      ...actions,
      reschedule: actions.reschedule && (await bookOnline()),
      restore: why === null || why === 'request_expired',
    },
    holdUntil: status === 'pending' ? (row.holdUntil?.getTime() ?? null) : null,
    reschedule: pendingMove
      ? { date: pendingMove.date, start: pendingMove.start, end: pendingMove.end, holdUntil: pendingMove.holdUntil?.getTime() ?? null }
      : null,
  }
}

/**
 * My bookings' rows (book C-24–C-31, C-40): each summary with what its card shows and offers, by the drawer's rules
 * (`clientSideOf`); the businesses loaded once for the page.
 */
export async function mineOf(deps: Deps, rows: BookingRow[], lang: Locale): Promise<MyBooking[]> {
  if (!rows.length) return []
  const now = deps.now()
  const [list, businesses] = await Promise.all([
    summaries(deps, rows, lang),
    loadBusinesses(deps.db, [...new Set(rows.map((r) => r.businessId))]),
  ])
  return Promise.all(
    rows.map(async (row, i) => {
      const lb = businesses.get(row.businessId)
      const summary = list[i]
      if (!summary || !lb) throw new Error('booking without business')
      const side = await clientSideOf(deps, row, lb, now)
      // after an expiry, the free times only while the client may book online (as the drawer shows them)
      const times =
        side.offers && (side.offers.source !== 'expired' || (await side.bookOnline())) ? await side.chips(side.offers.source) : []
      return {
        ...summary,
        holdUntil: side.holdUntil,
        reschedule: side.reschedule,
        decline: row.declineReason ? { reason: row.declineReason, text: row.declineText } : null,
        offers: side.offers && times.length ? { source: side.offers.source, times } : null,
        actions: side.actions,
      }
    }),
  )
}

export async function detailOf(deps: Deps, row: BookingRow, lang: Locale): Promise<BookingDetail> {
  const { db } = deps
  const now = deps.now()
  const [summary] = await summaries(deps, [row], lang)
  const lb = (await loadBusinesses(db, [row.businessId])).get(row.businessId)
  if (!summary || !lb) throw new Error('booking without business')
  const b = lb.business
  const {
    status,
    review,
    move,
    pendingMove,
    taker,
    chips,
    bookOnline: online,
    actions,
    holdUntil,
    reschedule,
  } = await clientSideOf(deps, row, lb, now)
  // a move not accepted: kept on the booking; one whose hold just ran out says so before the jobs record it, by the
  // same rule they record it by
  const justLapsed = move && !pendingMove && refusalCounts(row, move.holdUntil?.getTime() ?? now)
  const moveRefused =
    status !== 'confirmed'
      ? null
      : justLapsed
        ? { date: move.date, start: move.start, end: move.end, by: 'system' as const, reason: null, text: null }
        : row.moveRefused
  const bookOnline = await online()

  // a booking the business entered (by phone, for a walk-in) was never a request the client sent: it starts confirmed
  const timeline: BookingDetail['timeline'] = isOnlineSource(row.source)
    ? [{ event: 'sent', at: row.createdAt.getTime() }]
    : [{ event: 'confirmed', at: (row.confirmedAt ?? row.createdAt).getTime() }]
  if (row.confirmedAt && isOnlineSource(row.source)) timeline.push({ event: 'confirmed', at: row.confirmedAt.getTime() })
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
  if (status === 'noshow') timeline.push({ event: 'noshow', at: noShowMarkedAtOf(row)?.getTime() ?? epochOf(row.date, row.end) })

  // a home-based business shows its exact address only once the booking is confirmed
  const exact = showsExactAddress(status)

  return {
    ...summary,
    timeline: timeline.sort((x, y) => x.at - y.at),
    address: addressAsShown(b, b.hideExactAddress, status),
    city: await cityRef(deps.db, b.cityId, lang),
    floor: b.hideExactAddress && !exact ? null : b.floor,
    entranceNote: b.hideExactAddress && !exact ? null : b.entranceNote,
    // an SMS told the client the business moved, and the booking still hears it
    movedAt: row.addressTold?.at !== undefined && hearsOfMove(status, row, now) ? row.addressTold.at : null,
    geo: geoOf(b, exact),
    clientNote: row.clientNote,
    holdUntil,
    cancelDeadline: cancelDeadline(lb.rules, row),
    askCancelReason: lb.rules.askCancelReason,
    // the client's own words: a cancel the team entered (as the client asked on the phone, or the business's) has none
    cancelReason: row.cancelledBy === 'client' && !row.businessCancelReason ? row.cancelReason : null,
    // the business's cancel names its reason as a code, with its words; the client's own, entered by the team when they
    // called, names none
    businessCancel:
      row.businessCancelReason && isBusinessSideCancel(row.businessCancelReason)
        ? { reason: row.businessCancelReason, text: reasonWords(row.businessCancelReason, row.cancelReason) }
        : null,
    decline: row.declineReason ? { reason: row.declineReason, text: row.declineText, alternatives: await chips('decline') } : null,
    // a business's cancel with offered times (a closed day, new hours): taken as after a decline, whatever the client's
    // online status (A7)
    cancelOffers: await chips('cancel'),
    expiredAlternatives: bookOnline ? await chips('expired') : [],
    bookOnline,
    offerTakenBy: taker?.code ?? null,
    moveRefused,
    reschedule,
    actions,
    review: review ? { rating: review.rating, tags: review.tags, text: review.text, createdAt: review.createdAt.getTime() } : null,
  }
}
