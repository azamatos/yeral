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
import { all, type Queryable } from '../../db/client'
import { bookingItems, bookings, businesses, classSessions, reviews, staff, tableAreas } from '../../db/schema'
import type { Deps } from '../../deps'
import { loadBusinesses, type LoadedBusiness } from '../availability/context'
import { cityRef } from '../catalog/cities'
import { geoOf, photoOf, text } from '../catalog/map'
import { bookOnlineFor } from '../clients/online'
import { bookingRecipient, recipientOf } from './links'
import { offeredTimes, offersOf } from './offers'
import { teamItemOf } from './team-view'
import { noShowMarkedAtOf, refusalCounts, restoreStateOf, stateOf, type BookingRow } from './repo'

/** "Yzyna al" stays possible this long after the client's own cancel. */

export async function summaries(deps: Deps, rows: BookingRow[], lang: Locale, now = deps.now()): Promise<BookingSummary[]> {
  if (!rows.length) return []
  const { db } = deps
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
          // as the team sees them, the ids beside the names (a move asks by them)
          .map((i) => teamItemOf(i, lang)),
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

/** What `clientSideOf` reads from the database, for one booking or a page of them at once. */
interface Known {
  reviews: Map<string, typeof reviews.$inferSelect>
  /** A booking's waiting move, by the booking's id. */
  moves: Map<string, BookingRow>
  /** The booking an offered time became, by the declined or expired one's id (one each). */
  takers: Map<string, string>
  /** May this booking's client book there online now (asked once per business and phone). */
  online: (row: BookingRow, lb: LoadedBusiness) => Promise<boolean>
}

/** `accountPhone`: the signed-in client's phone, when every row is theirs (My bookings); else it's asked per row. */
async function knownFor(db: Queryable, rows: readonly BookingRow[], accountPhone?: string): Promise<Known> {
  const ids = rows.map((r) => r.id)
  const [reviewRows, moveRows, takerRows] = await all(db, [
    () => db.select().from(reviews).where(inArray(reviews.bookingId, ids)),
    () =>
      db
        .select()
        .from(bookings)
        .where(and(inArray(bookings.rescheduleOf, ids), eq(bookings.status, 'pending'))),
    () => db.select({ of: bookings.alternativeOf, code: bookings.code }).from(bookings).where(inArray(bookings.alternativeOf, ids)),
  ])
  const asked = new Map<string, Promise<boolean>>()
  return {
    reviews: new Map(reviewRows.map((r) => [r.bookingId, r])),
    moves: new Map(moveRows.flatMap((m) => (m.rescheduleOf ? [[m.rescheduleOf, m] as const] : []))),
    takers: new Map(takerRows.flatMap((t) => (t.of ? [[t.of, t.code] as const] : []))),
    // checked for the phone its SMS go to, as the texts are (an account's phone now, after a change too)
    online: async (row, lb) => {
      const phone = accountPhone === undefined ? await bookingRecipient(db, row) : recipientOf(row, accountPhone)
      const key = `${lb.business.id} ${phone}`
      const known = asked.get(key) ?? bookOnlineFor(db, lb, phone)
      asked.set(key, known)
      return known
    },
  }
}

/**
 * What a booking offers its client now, the card in My bookings and the drawer alike (book C-24–C-31): its actions, a
 * waiting move, the business's cancel or decline, whether it may still be booked online (book Q-154), and the times
 * offered after a decline, an expiry or the business's cancel, by one rule: none once one is taken (the others go) or
 * from a business that has closed (Q-213); after an expiry only while the client may book online (a decline's and a
 * cancel's stay: the business made them, A7).
 */
async function clientSideOf(db: Queryable, row: BookingRow, lb: LoadedBusiness, known: Known, now: number) {
  const state = stateOf(row)
  const { status } = effectiveStatus(state, now)
  const review = known.reviews.get(row.id)
  const move = known.moves.get(row.id)
  const pendingMove = move && effectiveStatus(stateOf(move), now).status === 'pending' ? move : undefined
  const taker = known.takers.get(row.id) ?? null
  const bookOnline = await known.online(row, lb)
  const offers = offersOf(row, now)
  const offered =
    offers?.list.length && !taker && !lb.business.closedAt && (offers.source !== 'expired' || bookOnline)
      ? { source: offers.source, times: await offeredTimes(db, lb, row, offers.list, now) }
      : null
  const actions = clientActions(state, lb.rules, review ? { createdAt: review.createdAt.getTime() } : null, now)
  // offered while the 5 minutes run and the visit hasn't started; a request whose answer time ran out is offered too,
  // and tapping it says so (ROUND6 A6)
  const why = canClientRestore(restoreStateOf(row), now)
  return {
    status,
    review,
    move,
    pendingMove,
    taker,
    bookOnline,
    offered,
    // a paused business or a phone-only client: no move, the call card instead; a second move replaces a waiting one
    // (ROUND6 A3)
    actions: { ...actions, reschedule: actions.reschedule && bookOnline, restore: why === null || why === 'request_expired' },
    holdUntil: status === 'pending' ? (row.holdUntil?.getTime() ?? null) : null,
    reschedule: pendingMove
      ? { date: pendingMove.date, start: pendingMove.start, end: pendingMove.end, holdUntil: pendingMove.holdUntil?.getTime() ?? null }
      : null,
    // the business's cancel names its reason as a code, with its words; the client's own, entered by the team when they
    // called, names none
    businessCancel:
      row.businessCancelReason && isBusinessSideCancel(row.businessCancelReason)
        ? { reason: row.businessCancelReason, text: reasonWords(row.businessCancelReason, row.cancelReason) }
        : null,
  }
}

const NO_ACTIONS: MyBooking['actions'] = {
  cancel: false,
  reschedule: false,
  editNote: false,
  callOnly: false,
  review: false,
  editReview: false,
  bookAgain: false,
  restore: false,
}

/**
 * My bookings' rows (book C-24–C-31, C-40): each summary with what its card shows and offers, by the drawer's rules
 * (`clientSideOf`); what the rows need read once for the page. All the rows are `accountPhone`'s.
 */
export async function mineOf(
  deps: Deps,
  rows: BookingRow[],
  lang: Locale,
  { now, accountPhone }: { now: number; accountPhone: string },
): Promise<MyBooking[]> {
  if (!rows.length) return []
  const { db } = deps
  const [list, businesses, known] = await all(db, [
    () => summaries(deps, rows, lang, now),
    () => loadBusinesses(db, [...new Set(rows.map((r) => r.businessId))]),
    () => knownFor(db, rows, accountPhone),
  ])
  return all(
    db,
    rows.map((row, i) => async (): Promise<MyBooking> => {
      const summary = list[i]!
      const lb = businesses.get(row.businessId)
      // a business without its rules row (not loaded): the card without its extras, not the page refused
      if (!lb)
        return {
          ...summary,
          holdUntil: null,
          reschedule: null,
          decline: null,
          businessCancel: null,
          offers: null,
          offerTakenBy: null,
          bookOnline: false,
          actions: NO_ACTIONS,
        }
      const side = await clientSideOf(db, row, lb, known, now)
      return {
        ...summary,
        holdUntil: side.holdUntil,
        reschedule: side.reschedule,
        decline: row.declineReason ? { reason: row.declineReason, text: row.declineText } : null,
        businessCancel: side.businessCancel,
        offers: side.offered?.times.length ? side.offered : null,
        offerTakenBy: side.taker,
        bookOnline: side.bookOnline,
        actions: side.actions,
      }
    }),
  )
}

export async function detailOf(deps: Deps, row: BookingRow, lang: Locale): Promise<BookingDetail> {
  const { db } = deps
  const now = deps.now()
  const [[summary], lb, known] = await all(db, [
    () => summaries(deps, [row], lang, now),
    async () => (await loadBusinesses(db, [row.businessId])).get(row.businessId),
    () => knownFor(db, [row]),
  ])
  if (!summary || !lb) throw new Error('booking without business')
  const b = lb.business
  const { status, review, move, pendingMove, taker, bookOnline, offered, actions, holdUntil, reschedule, businessCancel } =
    await clientSideOf(db, row, lb, known, now)
  const offeredFrom = (source: OfferSource) => (offered?.source === source ? offered.times : [])
  // a move not accepted: kept on the booking; one whose hold just ran out says so before the jobs record it, by the
  // same rule they record it by
  const justLapsed = move && !pendingMove && refusalCounts(row, move.holdUntil?.getTime() ?? now)
  const moveRefused =
    status !== 'confirmed'
      ? null
      : justLapsed
        ? { date: move.date, start: move.start, end: move.end, by: 'system' as const, reason: null, text: null }
        : row.moveRefused

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
    businessCancel,
    decline: row.declineReason ? { reason: row.declineReason, text: row.declineText, alternatives: offeredFrom('decline') } : null,
    // a business's cancel with offered times (a closed day, new hours): taken as after a decline, whatever the client's
    // online status (A7)
    cancelOffers: offeredFrom('cancel'),
    expiredAlternatives: offeredFrom('expired'),
    bookOnline,
    offerTakenBy: taker,
    moveRefused,
    reschedule,
    actions,
    review: review ? { rating: review.rating, tags: review.tags, text: review.text, createdAt: review.createdAt.getTime() } : null,
  }
}
