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
  favoritesAll: () => ['favorites'] as const,
  categories: (lang: Locale) => ['categories', lang] as const,
  cities: (lang: Locale, position: { lat: number; lng: number } | null) => ['cities', lang, position] as const,
  search: (params: Record<string, unknown>) => ['search', params] as const,
  searchAll: () => ['search'] as const,
  suggest: (q: string, lang: Locale) => ['suggest', q, lang] as const,
  suggestAll: () => ['suggest'] as const,
  places: (q: string, lang: Locale, city: string | null) => ['places', q, lang, city] as const,
  business: (slug: string, lang: Locale, position: { lat: number; lng: number } | null) => ['business', slug, lang, position] as const,
  businessAll: (slug: string) => ['business', slug] as const,
  /** Every business page (each says whether the viewer may book there online). */
  businesses: () => ['business'] as const,
  reviews: (slug: string, lang: Locale) => ['reviews', slug, lang] as const,
  reviewsAll: (slug: string) => ['reviews', slug] as const,
  /** The team's reviews page (book B-53), under the business's reviews: a review event refreshes both. */
  teamReviews: (slug: string, params: Record<string, unknown>) => ['reviews', slug, 'team', params] as const,
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
  blocks: (slug: string, from: string, to: string) => ['calendar', slug, 'blocks', from, to] as const,
  schedule: (slug: string, staffId: string) => ['team', slug, staffId, 'schedule'] as const,
  // business settings (book B-37–B-43): every one of a workspace under its prefix
  settings: (slug: string) => ['settings', slug] as const,
  rules: (slug: string) => ['settings', slug, 'rules'] as const,
  menu: (slug: string) => ['settings', slug, 'services'] as const,
  profile: (slug: string) => ['settings', slug, 'profile'] as const,
  hours: (slug: string) => ['settings', slug, 'hours'] as const,
  statuses: (slug: string) => ['settings', slug, 'statuses'] as const,
  // the business's requests (book B-19–B-21)
  requests: (slug: string) => ['requests', slug] as const,
  // the business's own bookings (book B-23–B-27): every query of its calendar under its prefix
  calendar: (slug: string) => ['calendar', slug] as const,
  freeTimes: (slug: string, params: Record<string, unknown>) => ['calendar', slug, 'free-times', params] as const,
  calendarView: (slug: string, params: Record<string, unknown>) => ['calendar', slug, 'view', params] as const,
  teamBookings: (slug: string, params: Record<string, unknown>) => ['calendar', slug, 'bookings', params] as const,
  // the business's clients (book B-32, B-34): the list, the drawer's lookup and each card under its prefix
  clients: (slug: string) => ['clients', slug] as const,
  clientList: (slug: string, params: Record<string, unknown>) => ['clients', slug, 'list', params] as const,
  clientLookup: (slug: string, params: Record<string, unknown>) => ['clients', slug, 'lookup', params] as const,
  client: (slug: string, id: string, params: Record<string, unknown>) => ['clients', slug, 'card', id, params] as const,
}
