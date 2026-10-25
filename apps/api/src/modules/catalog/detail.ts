/** The business page (client spec §4.3): header, services, specialists, hours, rules, reviews summary, similar places. */
import type { BusinessDetail } from '@yeral/contract/catalog'
import { MAX_ONLINE_PARTY, nextFreeSlot } from '@yeral/domain/availability'
import { distanceM, type LatLng } from '@yeral/domain/geo'
import { findException, openMinutesBetween } from '@yeral/domain/hours'
import { newAddressSince, TYPICAL_ANSWER_DAYS, typicalAnswerMinutes } from '@yeral/domain/lifecycle'
import type { Locale } from '@yeral/domain/model'
import { LATE_MINUTES } from '@yeral/domain/rules'
import { addDays, today } from '@yeral/domain/time'
import { and, asc, eq, gte, isNull, lte, ne } from 'drizzle-orm'
import { all, type Queryable } from '../../db/client'
import { bookings, businesses, businessOldSlugs, categories, serviceGroups, staff, tableAreas } from '../../db/schema'
import type { Deps } from '../../deps'
import { ApiError } from '../../http/errors'
import { appointmentContext, loadBusiness, loadBusy, type BusinessRow } from '../availability/context'
import { buildCards } from './cards'
import { cityRefOf, loadCities } from './cities'
import { geoOf, isPublic, openOf, photoOf, priceFromOf, publicPrice, publicRow, takesOpenTypes, text } from './map'
import { bookOnlineFor } from '../clients/online'
import { signsIn } from '../team/members'

const SPECIAL_DAYS_AHEAD = 14

/**
 * The business's typical answer time (book Q-113), from the last 30 days: the requests it answered, and those it let
 * run out at the wait the client had, both in the minutes it was open (as a hold counts them, Q-120). None for an
 * instant business: nothing waits.
 */
async function typicalAnswerOf(db: Queryable, b: BusinessRow, instant: boolean, now: number): Promise<number | null> {
  if (instant) return null
  const since = new Date(now - TYPICAL_ANSWER_DAYS * 86_400_000)
  const until = new Date(now)
  const [answered, lapsed] = await all(db, [
    () =>
      db
        .select({ from: bookings.createdAt, to: bookings.answeredAt })
        .from(bookings)
        .where(and(eq(bookings.businessId, b.id), gte(bookings.answeredAt, since), lte(bookings.answeredAt, until))),
    () =>
      db
        .select({ from: bookings.createdAt, to: bookings.cancelledAt })
        .from(bookings)
        .where(
          and(
            eq(bookings.businessId, b.id),
            eq(bookings.cancelledBy, 'system'),
            isNull(bookings.confirmedAt),
            isNull(bookings.rescheduleOf),
            gte(bookings.cancelledAt, since),
            lte(bookings.cancelledAt, until),
          ),
        ),
  ])
  const waits = (rows: { from: Date; to: Date | null }[]) => rows.map((r) => openMinutesBetween(b, r.from.getTime(), r.to!.getTime()))
  return typicalAnswerMinutes(waits(answered), waits(lapsed))
}

/**
 * A verified business by its page address, now or an earlier one, or 404 (unverified businesses aren't public, ADR
 * 0018): a page opened at an old address books and keeps favourites as at the new one.
 */
export async function publicBusiness(deps: Deps, slug: string) {
  const row = await businessAt(deps, slug)
  if (!row || !publicRow(row)) throw new ApiError('not_found')
  return row
}

/**
 * A business by its page address now, or by an earlier one (chapter 9, 25.10.2026): an old address opens the page as
 * it is now, which names its address, and the client site moves there. None for an address nobody has had.
 */
async function businessAt(deps: Deps, slug: string) {
  const [now] = await deps.db.select().from(businesses).where(eq(businesses.slug, slug))
  if (now) return now
  const [found] = await deps.db
    .select({ business: businesses })
    .from(businessOldSlugs)
    .innerJoin(businesses, eq(businesses.id, businessOldSlugs.businessId))
    .where(eq(businessOldSlugs.slug, slug))
  return found?.business
}

/**
 * A business the viewer may see (book F-032): a public one, or one still in review, rejected or hidden for a signed-in
 * member of its own team, with the preview's status and, for its owner, the Ýeral team's reason (Q-274, Q-012). Anyone
 * else gets `in_review` ("Bu sahypa entek açylmady"), or for a hidden one `not_found`, as for an unknown slug. The
 * business page, its free times and its reviews all ask this, so they answer the same.
 */
export async function visibleBusiness(deps: Deps, slug: string, viewerId: string | null) {
  const row = await businessAt(deps, slug)
  // a closed one is nobody's to see, its team's included (Q-213)
  if (!row || row.closedAt) throw new ApiError('not_found')
  if (publicRow(row)) return { row, preview: null }
  const [member] = viewerId
    ? await deps.db
        .select({ level: staff.level })
        .from(staff)
        .where(and(eq(staff.businessId, row.id), eq(staff.userId, viewerId), signsIn))
        .limit(1)
    : []
  // a business still being set up isn't anyone's to know about yet (book Q-200), nor is the demo workspace (F-242)
  if (!member) throw new ApiError(row.setupStep || row.hiddenAt || row.sandbox ? 'not_found' : 'in_review')
  // the demo workspace's own team sees its page as it would be
  if (row.sandbox) return { row, preview: null }
  const owner = member.level === 'owner'
  if (row.hiddenAt) return { row, preview: { status: 'hidden' as const, reason: owner ? row.hiddenReason : null } }
  return { row, preview: { status: row.verification as 'pending' | 'rejected', reason: owner ? row.verificationReason : null } }
}

/**
 * `viewer`: who is signed in, so the page knows whether they may book here online (book A7, Q-154) and whether they
 * may see it while it's in review (their own business, F-032).
 */
export async function businessDetail(
  deps: Deps,
  slug: string,
  lang: Locale,
  position: LatLng | null,
  viewer: { id: string; phone: string } | null = null,
): Promise<BusinessDetail> {
  const { db } = deps
  const now = deps.now()
  const day = today(now)
  const { row, preview } = await visibleBusiness(deps, slug, viewer?.id ?? null)
  const lb = await loadBusiness(db, row.id)
  const b = lb.business
  // two more reads, started while the rest are made; caught here so a failure can't go unhandled before it's awaited
  // (a page in review takes no bookings, Q-153)
  const extra = Promise.all([
    typicalAnswerOf(db, b, lb.rules.confirmMode === 'instant', now),
    preview ? Promise.resolve(false) : bookOnlineFor(db, lb, viewer?.phone ?? null),
  ])
  extra.catch(() => undefined)
  const [[category], cities] = await Promise.all([db.select().from(categories).where(eq(categories.id, b.categoryId)), loadCities(db)])
  const groups = await db.select().from(serviceGroups).where(eq(serviceGroups.businessId, b.id)).orderBy(asc(serviceGroups.sort))
  const online = lb.services.filter((s) => s.online)
  const specialists = lb.staff.filter(
    (s) => s.bookable && s.status === 'active' && s.serviceIds.some((id) => online.some((o) => o.id === id)),
  )
  const type = b.bookingTypes[0] ?? 'appointment'

  // the card's next free time with anyone, and each specialist's own, for the first service (theirs) on the page
  let nextFree: BusinessDetail['nextFree'] = null
  const staffNext = new Map<string, BusinessDetail['nextFree']>()
  const first = online[0]
  if (type === 'appointment' && first && lb.rules.onlineEnabled) {
    const busy = await loadBusy(db, [b.id], day, addDays(day, lb.rules.windowDays))
    const ctx = appointmentContext(lb, busy, now)
    const freeFor = (serviceId: string, staffId: string | null): BusinessDetail['nextFree'] => {
      const found = nextFreeSlot(ctx, { serviceIds: [serviceId], staffId, by: 'client' }, day, lb.rules.windowDays)
      return found ? { date: found.date, start: found.slot.start } : null
    }
    nextFree = freeFor(first.id, null)
    for (const s of specialists) {
      const theirs = s.serviceIds.find((id) => online.some((o) => o.id === id))
      if (theirs) staffNext.set(s.id, freeFor(theirs, s.id))
    }
  }

  const specialDays: BusinessDetail['specialDays'] = []
  for (let i = 0; i < SPECIAL_DAYS_AHEAD; i++) {
    const date = addDays(day, i)
    const ex = findException(b.exceptions, date)
    if (ex) specialDays.push({ date, name: ex.name, hours: ex.hours ?? null })
  }

  const areas =
    type === 'table' ? await db.select().from(tableAreas).where(eq(tableAreas.businessId, b.id)).orderBy(asc(tableAreas.sort)) : []

  const others = await db
    .select({ id: businesses.id, lat: businesses.lat, lng: businesses.lng })
    .from(businesses)
    .where(and(eq(businesses.categoryId, b.categoryId), isPublic(), takesOpenTypes(deps.bookingTypes), ne(businesses.id, b.id)))
  const nearest = others.sort((x, y) => distanceM(b, x) - distanceM(b, y)).slice(0, 4)
  const similar = (
    await buildCards(
      deps,
      nearest.map((x) => x.id),
      { lang, date: day, days: 1, partySize: 2, position, cities },
    )
  ).map((x) => x.card)

  const [typicalMinutes, bookOnline] = await extra

  return {
    slug: b.slug,
    name: b.name,
    category: { id: b.categoryId, name: text(b.kind, lang) || text(category?.name, lang) },
    bookingTypes: b.bookingTypes,
    specialistWord: text(category?.specialistWord, lang),
    example: b.demo,
    rating: b.rating,
    reviewsCount: b.reviewsCount,
    ratingBreakdown: b.ratingBreakdown,
    address: b.hideExactAddress ? b.street : b.address,
    city: cityRefOf(cities, b.cityId, lang),
    floor: b.hideExactAddress ? null : b.floor,
    entranceNote: b.hideExactAddress ? null : b.entranceNote,
    hideExactAddress: b.hideExactAddress,
    movedAt: newAddressSince(b.movedAt?.getTime() ?? null, now),
    geo: geoOf(b),
    distanceM: position ? distanceM(position, b) : null,
    phone: b.phone,
    photos: b.photos.map((p) => photoOf(deps, p, lang, b.name)),
    about: text(b.about, lang),
    amenities: b.amenities,
    hours: b.hours.map((h) => (h ? { open: h.open, close: h.close, break: h.break ?? null } : null)),
    specialDays,
    open: openOf(b, now),
    rules: {
      cancelWindowMinutes: lb.rules.cancelWindowMinutes,
      lateToleranceMinutes: LATE_MINUTES,
      note: lb.rulesNote ? text(lb.rulesNote, lang) : null,
    },
    onlineEnabled: lb.rules.onlineEnabled,
    bookOnline,
    preview,
    confirmMode: lb.rules.confirmMode,
    holdMinutes: lb.rules.holdMinutes,
    leadMinutes: lb.rules.leadMinutes,
    windowDays: lb.rules.windowDays,
    typicalConfirmMinutes: typicalMinutes,
    priceFrom: type === 'table' ? null : priceFromOf(lb.services),
    nextFree,
    serviceGroups: groups
      .map((g) => ({
        id: g.id,
        name: text(g.name, lang),
        services: online
          .filter((s) => s.groupId === g.id)
          .map((s) => ({
            id: s.id,
            name: text(s.name, lang),
            description: s.description ? text(s.description, lang) : null,
            durationMin: s.durationMin,
            price: publicPrice(s),
            staffIds: specialists.filter((p) => p.serviceIds.includes(s.id)).map((p) => p.id),
          })),
      }))
      .filter((g) => g.services.length > 0),
    specialists: specialists.map((s) => ({
      id: s.id,
      name: s.name,
      role: s.specialization ? text(s.specialization, lang) : null,
      photo: s.photo ? photoOf(deps, s.photo, lang, s.name) : null,
      rating: s.rating,
      serviceIds: s.serviceIds.filter((id) => online.some((o) => o.id === id)),
      nextFree: staffNext.get(s.id) ?? null,
    })),
    tables:
      type === 'table'
        ? {
            areas: areas.map((a) => ({
              id: a.id,
              name: text(a.name, lang),
              note: a.note ? text(a.note, lang) : null,
              minParty: a.minParty,
              maxParty: a.maxParty,
            })),
            maxParty: MAX_ONLINE_PARTY,
            requests: b.tableRequests,
          }
        : null,
    similar,
  }
}
