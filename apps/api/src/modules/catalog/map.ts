/** Rows → contract shapes shared by the catalogue, availability and bookings. */
import { openState } from '@yeral/domain/hours'
import { localized, type Locale, type Localized, type Price } from '@yeral/domain/model'
import { and, eq, isNull } from 'drizzle-orm'
import { businesses, type StoredPhoto } from '../../db/schema'
import type { Deps } from '../../deps'
import type { BusinessRow, ServiceRow } from '../availability/context'

export const text = (l: Localized | null | undefined, lang: Locale): string => (l ? localized(l, lang) : '')

/** "Aýal saç kesimi + Gel-lak · Aýna": what a review was for, from the visit's services in the reader's language. */
export function visitWhat(items: { serviceName: Localized; staffName: string | null }[], lang: Locale): string {
  if (!items.length) return ''
  const staffName = items[0]?.staffName
  return `${items.map((i) => text(i.serviceName, lang)).join(' + ')}${staffName ? ` · ${staffName}` : ''}`
}

/** A photo's address and text; one uploaded has none of its own, and reads as what it shows (`fallback`, a name). */
export const photoOf = (deps: Pick<Deps, 'media'>, p: StoredPhoto, lang: Locale, fallback: string) => ({
  url: deps.media(p.key),
  alt: text(p.alt, lang) || fallback,
})

/** What visitors may see: verified (ADR 0018) and not hidden by the Ýeral team (book Q-012). */
export const isPublic = () => and(eq(businesses.verification, 'verified'), isNull(businesses.hiddenAt))!
export const publicRow = (b: Pick<BusinessRow, 'verification' | 'hiddenAt'>) => b.verification === 'verified' && !b.hiddenAt

/** Home-based businesses show an approximate point (≈ 1 km) until the booking is confirmed. */
export function geoOf(b: BusinessRow, exact = false) {
  if (!b.hideExactAddress || exact) return { lat: b.lat, lng: b.lng, approximate: false }
  return { lat: Math.round(b.lat * 100) / 100, lng: Math.round(b.lng * 100) / 100, approximate: true }
}

/** The card's "40 TMT-den": the lowest priced service. Search's price range reads the same prices (`priceWithin`). */
export function priceFromOf(services: ServiceRow[]): Price | null {
  const priced = services.filter((s) => s.online && s.priceType !== 'hidden')
  if (!priced.length) return null
  if (priced.every((s) => s.priceType === 'free')) return { type: 'free', amount: 0 }
  const min = Math.min(...priced.filter((s) => s.priceType !== 'free').map((s) => s.priceAmount))
  return { type: 'from', amount: min }
}

export function openOf(b: BusinessRow, now: number) {
  const s = openState({ hours: b.hours, exceptions: b.exceptions }, now)
  return s.open ? s : { open: false as const, inDays: s.inDays, at: 'at' in s ? s.at : null }
}

export const servicePrice = (s: ServiceRow): Price => ({ type: s.priceType, amount: s.priceAmount })

/** What clients see: a hidden price never leaves the api with its amount. */
export const publicPrice = (s: ServiceRow): Price => (s.priceType === 'hidden' ? { type: 'hidden', amount: 0 } : servicePrice(s))
