/**
 * Query keys: one place, so mutations and live events invalidate exactly what changed (ADR 0011).
 * Prefix lists (`['bookings']`) invalidate every key under them.
 */
import type { Locale } from '@yeral/contract/common'

export const keys = {
  me: () => ['me'] as const,
  favorites: (lang: Locale) => ['favorites', lang] as const,
  categories: (lang: Locale) => ['categories', lang] as const,
  search: (params: Record<string, unknown>) => ['search', params] as const,
  suggest: (q: string, lang: Locale) => ['suggest', q, lang] as const,
  places: (q: string, lang: Locale) => ['places', q, lang] as const,
  ipPlace: () => ['places', 'ip'] as const,
  business: (slug: string, lang: Locale, position: { lat: number; lng: number } | null) => ['business', slug, lang, position] as const,
  businessAll: (slug: string) => ['business', slug] as const,
  reviews: (slug: string) => ['reviews', slug] as const,
  availability: (slug: string, kind: 'appointment' | 'specialists' | 'tables' | 'sessions', params: Record<string, unknown>) =>
    ['availability', slug, kind, params] as const,
  availabilityAll: (slug: string) => ['availability', slug] as const,
  bookings: () => ['bookings'] as const,
  bookingList: (tab: 'upcoming' | 'past', lang: Locale) => ['bookings', 'list', tab, lang] as const,
  booking: (code: string, lang: Locale) => ['bookings', 'detail', code, lang] as const,
}
