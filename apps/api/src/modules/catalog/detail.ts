/** The business page (client spec §4.3): header, services, specialists, hours, rules, reviews summary, similar places. */
import type { BusinessDetail } from '@yeral/contract/catalog'
import { MAX_ONLINE_PARTY, nextFreeSlot } from '@yeral/domain/availability'
import { distanceM, type LatLng } from '@yeral/domain/geo'
import { findException, openMinutesBetween } from '@yeral/domain/hours'
import { TYPICAL_ANSWER_DAYS, typicalAnswerMinutes } from '@yeral/domain/lifecycle'
import type { Locale } from '@yeral/domain/model'
import { addDays, today } from '@yeral/domain/time'
import { and, asc, eq, gte, isNull, lte, ne } from 'drizzle-orm'
import type { Queryable } from '../../db/client'
import { bookings, businesses, categories, serviceGroups, tableAreas } from '../../db/schema'
import type { Deps } from '../../deps'
import { ApiError } from '../../http/errors'
import { appointmentContext, loadBusinesses, loadBusy, type BusinessRow } from '../availability/context'
import { buildCards } from './cards'
import { cityRefOf, loadCities } from './cities'
import { geoOf, openOf, photoOf, priceFromOf, publicPrice, text } from './map'
import { bookOnlineFor } from '../clients/online'

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
  const [answered, lapsed] = await Promise.all([
    db
      .select({ from: bookings.createdAt, to: bookings.answeredAt })
      .from(bookings)
      .where(and(eq(bookings.businessId, b.id), gte(bookings.answeredAt, since), lte(bookings.answeredAt, until))),
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

/** A verified business by slug, or 404 (unverified businesses aren't public, ADR 0018). */
export async function publicBusiness(deps: Deps, slug: string) {
  const [row] = await deps.db
    .select()
    .from(businesses)
    .where(and(eq(businesses.slug, slug), eq(businesses.verification, 'verified')))
  if (!row) throw new ApiError('not_found')
  return row
}

/** `viewerPhone`: the signed-in client's, so the page knows whether they may book here online (book A7, Q-154). */
export async function businessDetail(
  deps: Deps,
  slug: string,
  lang: Locale,
  position: LatLng | null,
  viewerPhone: string | null = null,
): Promise<BusinessDetail> {
  const { db } = deps
  const now = deps.now()
  const day = today(now)
  const row = await publicBusiness(deps, slug)
  const lb = (await loadBusinesses(db, [row.id])).get(row.id)
  if (!lb) throw new ApiError('not_found')
  const b = lb.business
  // two more reads, started while the rest are made; caught here so a failure can't go unhandled before it's awaited
  const extra = Promise.all([typicalAnswerOf(db, b, lb.rules.confirmMode === 'instant', now), bookOnlineFor(db, lb, viewerPhone)])
  extra.catch(() => undefined)
  const [[category], cities] = await Promise.all([db.select().from(categories).where(eq(categories.id, b.categoryId)), loadCities(db)])
  const groups = await db.select().from(serviceGroups).where(eq(serviceGroups.businessId, b.id)).orderBy(asc(serviceGroups.sort))
  const online = lb.services.filter((s) => s.online)
  const specialists = lb.staff.filter(
    (s) => s.bookable && s.status === 'active' && s.serviceIds.some((id) => online.some((o) => o.id === id)),
  )
  const type = b.bookingTypes[0] ?? 'appointment'

  let nextFree: BusinessDetail['nextFree'] = null
  const first = online[0]
  if (type === 'appointment' && first && lb.rules.onlineEnabled) {
    const busy = await loadBusy(db, [b.id], day, addDays(day, lb.rules.windowDays))
    const found = nextFreeSlot(
      appointmentContext(lb, busy, now),
      { serviceIds: [first.id], staffId: null, by: 'client' },
      day,
      lb.rules.windowDays,
    )
    nextFree = found ? { date: found.date, start: found.slot.start } : null
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
    .where(and(eq(businesses.categoryId, b.categoryId), eq(businesses.verification, 'verified'), ne(businesses.id, b.id)))
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
    rating: b.rating,
    reviewsCount: b.reviewsCount,
    ratingBreakdown: b.ratingBreakdown,
    address: b.hideExactAddress ? b.street : b.address,
    city: cityRefOf(cities, b.cityId, lang),
    entranceNote: b.hideExactAddress ? null : b.entranceNote,
    hideExactAddress: b.hideExactAddress,
    geo: geoOf(b),
    distanceM: position ? distanceM(position, b) : null,
    phone: b.phone,
    photos: b.photos.map((p) => photoOf(deps, p, lang)),
    about: text(b.about, lang),
    amenities: b.amenities,
    hours: b.hours.map((h) => (h ? { open: h.open, close: h.close, break: h.break ?? null } : null)),
    specialDays,
    open: openOf(b, now),
    rules: {
      cancelWindowMinutes: lb.rules.cancelWindowMinutes,
      lateToleranceMinutes: lb.rules.lateToleranceMinutes,
      note: lb.rulesNote ? text(lb.rulesNote, lang) : null,
    },
    onlineEnabled: lb.rules.onlineEnabled,
    bookOnline,
    confirmMode: lb.rules.confirmMode,
    holdMinutes: lb.rules.holdMinutes,
    leadMinutes: lb.rules.leadMinutes,
    windowDays: lb.rules.windowDays,
    typicalConfirmMinutes: typicalMinutes,
    priceFrom: type === 'table' ? null : priceFromOf(lb.services),
    avgBill: b.avgBill,
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
      photo: s.photo ? photoOf(deps, s.photo, lang) : null,
      rating: s.rating,
      serviceIds: s.serviceIds.filter((id) => online.some((o) => o.id === id)),
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
