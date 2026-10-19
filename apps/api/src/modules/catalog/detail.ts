/** The business page (client spec §4.3): header, services, specialists, hours, rules, reviews summary, similar places. */
import type { BusinessDetail } from '@yeral/contract/catalog'
import { MAX_ONLINE_PARTY, nextFreeSlot } from '@yeral/domain/availability'
import { distanceM, type LatLng } from '@yeral/domain/geo'
import { findException } from '@yeral/domain/hours'
import type { Locale } from '@yeral/domain/model'
import { addDays, today } from '@yeral/domain/time'
import { and, asc, eq, ne } from 'drizzle-orm'
import { businesses, categories, serviceGroups, tableAreas } from '../../db/schema'
import type { Deps } from '../../deps'
import { ApiError } from '../../http/errors'
import { appointmentContext, loadBusinesses, loadBusy } from '../availability/context'
import { buildCards } from './cards'
import { geoOf, openOf, photoOf, priceFromOf, publicPrice, text } from './map'

const SPECIAL_DAYS_AHEAD = 14

/** A verified business by slug, or 404 (unverified businesses aren't public, ADR 0018). */
export async function publicBusiness(deps: Deps, slug: string) {
  const [row] = await deps.db
    .select()
    .from(businesses)
    .where(and(eq(businesses.slug, slug), eq(businesses.verification, 'verified')))
  if (!row) throw new ApiError('not_found')
  return row
}

export async function businessDetail(deps: Deps, slug: string, lang: Locale, position: LatLng | null): Promise<BusinessDetail> {
  const { db } = deps
  const now = deps.now()
  const day = today(now)
  const row = await publicBusiness(deps, slug)
  const lb = (await loadBusinesses(db, [row.id])).get(row.id)
  if (!lb) throw new ApiError('not_found')
  const b = lb.business
  const [category] = await db.select().from(categories).where(eq(categories.id, b.categoryId))
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
      { lang, date: day, days: 1, partySize: 2, position },
    )
  ).map((x) => x.card)

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
    confirmMode: lb.rules.confirmMode,
    holdMinutes: lb.rules.holdMinutes,
    leadMinutes: lb.rules.leadMinutes,
    windowDays: lb.rules.windowDays,
    typicalConfirmMinutes: b.typicalConfirmMinutes,
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
