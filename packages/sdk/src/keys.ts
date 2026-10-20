/**
 * Query keys: one place, so mutations and live events invalidate exactly what changed (ADR 0011).
 * Prefix lists (`['bookings']`) invalidate every key under them.
 */
import type { myBookingsQuerySchema } from '@yeral/contract/bookings'
import type { Locale } from '@yeral/contract/common'
import type { z } from 'zod'

export type BookingTab = z.output<typeof myBookingsQuerySchema>['tab']

export const keys = {
  me: () => ['me'] as const,
  favorites: (lang: Locale) => ['favorites', lang] as const,
  categories: (lang: Locale) => ['categories', lang] as const,
  cities: (lang: Locale, position: { lat: number; lng: number } | null) => ['cities', lang, position] as const,
  search: (params: Record<string, unknown>) => ['search', params] as const,
  suggest: (q: string, lang: Locale) => ['suggest', q, lang] as const,
  places: (q: string, lang: Locale, city: string | null) => ['places', q, lang, city] as const,
  business: (slug: string, lang: Locale, position: { lat: number; lng: number } | null) => ['business', slug, lang, position] as const,
  businessAll: (slug: string) => ['business', slug] as const,
  /** Every business page (each says whether the viewer may book there online). */
  businesses: () => ['business'] as const,
  reviews: (slug: string, lang: Locale) => ['reviews', slug, lang] as const,
  reviewsAll: (slug: string) => ['reviews', slug] as const,
  availability: (slug: string, kind: 'appointment' | 'specialists' | 'tables' | 'sessions', params: Record<string, unknown>) =>
    ['availability', slug, kind, params] as const,
  availabilityAll: (slug: string) => ['availability', slug] as const,
  bookings: () => ['bookings'] as const,
  /** Under `bookings`: a booking change or event refreshes the link page too. */
  link: (token: string, lang: Locale) => ['bookings', 'link', token, lang] as const,
  bookingLists: () => ['bookings', 'list'] as const,
  bookingList: (tab: BookingTab, lang: Locale) => ['bookings', 'list', tab, lang] as const,
  booking: (code: string, lang: Locale) => ['bookings', 'detail', code, lang] as const,
  // the team (ADR 0025)
  workspaces: () => ['workspaces'] as const,
  invites: () => ['invites'] as const,
  invite: (token: string) => ['invites', 'token', token] as const,
  team: (slug: string) => ['team', slug] as const,
  // business settings (book B-37–B-43): every one of a workspace under its prefix
  settings: (slug: string) => ['settings', slug] as const,
  rules: (slug: string) => ['settings', slug, 'rules'] as const,
}
