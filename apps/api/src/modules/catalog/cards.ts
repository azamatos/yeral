/**
 * Business cards (Home, Search, favourites, "Golaýdaky ýerler"): what each card shows for the chosen day by booking type
 * (client spec §4.2 "Row content per type").
 */
import type { BusinessCard } from '@yeral/contract/catalog'
import { appointmentSlots, maxSeats, tableSlots } from '@yeral/domain/availability'
import { distanceM, type LatLng } from '@yeral/domain/geo'
import { localized, type Locale } from '@yeral/domain/model'
import { addDays, epochOf } from '@yeral/domain/time'
import { categories as categoriesTable } from '../../db/schema'
import type { Deps } from '../../deps'
import {
  appointmentContext,
  loadBusinesses,
  loadBusy,
  loadTableContexts,
  type LoadedBusiness,
  type ServiceRow,
} from '../availability/context'
import { loadSessions } from '../availability/sessions'
import { cityRefOf, loadCities, type CityRow } from './cities'
import { geoOf, openOf, photoOf, priceFromOf, text } from './map'

export interface CardOptions {
  lang: Locale
  /** First day to look at. */
  date: string
  /** 1 = that day only; 7 = "Şu hepde". */
  days: number
  partySize: number
  position: LatLng | null
  /** "Näme?": a matching service is the one whose times the card shows. */
  q?: string
  /** The cities, when the caller has read them already. */
  cities?: readonly CityRow[]
}

const SHOWN = 4

/** The service a card shows times for: one matching the query, else the first in the menu. */
function cardService(lb: LoadedBusiness, q: string | undefined, lang: Locale): ServiceRow | undefined {
  const online = lb.services.filter((s) => s.online)
  if (q) {
    const needle = q.toLocaleLowerCase()
    const hit = online.find(
      (s) =>
        Object.values(s.name).some((n) => n?.toLocaleLowerCase().includes(needle)) ||
        localized(s.name, lang).toLocaleLowerCase().includes(needle),
    )
    if (hit) return hit
  }
  return online[0]
}

/** Cards in the order of `ids`, each with whether it has free time in the range. */
export async function buildCards(deps: Deps, ids: string[], opts: CardOptions): Promise<{ card: BusinessCard; hasFree: boolean }[]> {
  const { db } = deps
  const now = deps.now()
  const loaded = await loadBusinesses(db, ids)
  const last = addDays(opts.date, opts.days - 1)
  const busy = await loadBusy(db, ids, opts.date, last)
  const tableContexts = await loadTableContexts(
    db,
    [...loaded.values()].filter((l) => l.business.bookingTypes[0] === 'table'),
    opts.date,
    last,
    now,
  )
  const classIds = [...loaded.values()].filter((l) => l.business.bookingTypes[0] === 'class').map((l) => l.business.id)
  const sessions = await loadSessions(db, classIds, opts.date, addDays(opts.date, Math.max(opts.days, 14) - 1))
  const [categories, cities] = await Promise.all([db.select().from(categoriesTable), opts.cities ?? loadCities(db)])

  const out: { card: BusinessCard; hasFree: boolean }[] = []
  for (const id of ids) {
    const lb = loaded.get(id)
    if (!lb) continue
    const b = lb.business
    const type = b.bookingTypes[0] ?? 'appointment'
    let availability: BusinessCard['availability']
    let hasFree: boolean

    if (type === 'appointment') {
      const svc = cardService(lb, opts.q, opts.lang)
      const ctx = appointmentContext(lb, busy, now)
      let date = opts.date
      let starts: number[] = []
      for (let i = 0; i < opts.days && svc && lb.rules.onlineEnabled; i++) {
        date = addDays(opts.date, i)
        starts = appointmentSlots(ctx, { date, serviceIds: [svc.id], staffId: null, by: 'client' }).map((s) => s.start)
        if (starts.length) break
      }
      hasFree = starts.length > 0
      availability = {
        type: 'appointment',
        date: hasFree ? date : opts.date,
        starts: starts.slice(0, SHOWN),
        more: Math.max(0, starts.length - SHOWN),
      }
    } else if (type === 'table') {
      const ctx = tableContexts.get(id)
      let date = opts.date
      let starts: number[] = []
      for (let i = 0; ctx && i < opts.days && lb.rules.onlineEnabled; i++) {
        date = addDays(opts.date, i)
        starts = tableSlots(ctx, { date, partySize: opts.partySize }).map((s) => s.start)
        if (starts.length) break
      }
      hasFree = starts.length > 0
      availability = {
        type: 'table',
        date: hasFree ? date : opts.date,
        partySize: opts.partySize,
        starts: starts.slice(0, SHOWN),
        more: Math.max(0, starts.length - SHOWN),
      }
    } else {
      const next = sessions.find(
        (s) =>
          s.businessId === b.id && s.date <= last && epochOf(s.date, s.start) >= now + lb.rules.leadMinutes * 60_000 && maxSeats(s) > 0,
      )
      hasFree = !!next && lb.rules.onlineEnabled
      availability = {
        type: 'class',
        session: next
          ? { id: next.id, date: next.date, start: next.start, name: text(next.name, opts.lang), seatsLeft: next.capacity - next.booked }
          : null,
      }
    }

    const category = categories.find((c) => c.id === b.categoryId)
    out.push({
      hasFree,
      card: {
        slug: b.slug,
        name: b.name,
        category: { id: b.categoryId, name: text(b.kind, opts.lang) || text(category?.name, opts.lang) },
        photo: b.photos[0] ? photoOf(deps, b.photos[0], opts.lang) : null,
        rating: b.rating,
        reviewsCount: b.reviewsCount,
        street: b.street,
        city: cityRefOf(cities, b.cityId, opts.lang),
        geo: geoOf(b),
        distanceM: opts.position ? distanceM(opts.position, { lat: b.lat, lng: b.lng }) : null,
        bookingType: type,
        onlineEnabled: lb.rules.onlineEnabled,
        priceFrom: type === 'table' ? null : priceFromOf(lb.services),
        avgBill: b.avgBill,
        open: openOf(b, now),
        availability,
      },
    })
  }
  return out
}
