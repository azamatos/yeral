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
  authMode: () => ['authMode'] as const,
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
  /** What deleting the account cancels: under the person's bookings, so their changes refresh it. */
  deletionCounts: () => ['bookings', 'deletion'] as const,
  /** "How was it?": under the person's bookings, so a booking event refreshes it; their own actions refresh `howWasItAll`. */
  howWasIt: (lang: Locale) => ['bookings', 'how-was-it', lang] as const,
  howWasItAll: () => ['bookings', 'how-was-it'] as const,
  /** Under `bookings`: a booking change or event refreshes the link page too. */
  link: (token: string, lang: Locale) => ['bookings', 'link', token, lang] as const,
  bookingLists: () => ['bookings', 'list'] as const,
  bookingList: (tab: BookingTab, lang: Locale) => ['bookings', 'list', tab, lang] as const,
  booking: (code: string, lang: Locale) => ['bookings', 'detail', code, lang] as const,
  // the team (ADR 0025)
  workspaces: () => ['workspaces'] as const,
  invites: () => ['invites'] as const,
  /** The person's unfinished setup (book Q-200); finishing it changes the switcher too. */
  setup: () => ['setup'] as const,
  invite: (token: string) => ['invites', 'token', token] as const,
  team: (slug: string) => ['team', slug] as const,
  blocks: (slug: string, from: string, to: string) => ['calendar', slug, 'blocks', from, to] as const,
  schedule: (slug: string, staffId: string) => ['team', slug, staffId, 'schedule'] as const,
  /** Addresses to pick (ADR 0027): not under the settings, whose every change would ask the geocoder again. */
  addressSearch: (slug: string, params: Record<string, unknown>) => ['address-search', slug, params] as const,
  /** A page address's check as it's typed (chapter 9, 25.10.2026), asked again after any address changes. */
  pageAddress: (params: Record<string, unknown>) => ['page-address', params] as const,
  pageAddressAll: () => ['page-address'] as const,
  // business settings (book B-37–B-43): every one of a workspace under its prefix
  settings: (slug: string) => ['settings', slug] as const,
  rules: (slug: string) => ['settings', slug, 'rules'] as const,
  menu: (slug: string) => ['settings', slug, 'services'] as const,
  profile: (slug: string) => ['settings', slug, 'profile'] as const,
  gallery: (slug: string) => ['settings', slug, 'photos'] as const,
  hours: (slug: string) => ['settings', slug, 'hours'] as const,
  statuses: (slug: string) => ['settings', slug, 'statuses'] as const,
  // the business's requests (book B-19–B-21)
  requests: (slug: string) => ['requests', slug] as const,
  // the business's own bookings (book B-23–B-27): every query of its calendar under its prefix
  calendar: (slug: string) => ['calendar', slug] as const,
  /** What leaving leaves behind: under the workspace's calendar, so its bookings' changes refresh it. */
  leaveCounts: (slug: string) => ['calendar', slug, 'leave'] as const,
  freeTimes: (slug: string, params: Record<string, unknown>) => ['calendar', slug, 'free-times', params] as const,
  calendarView: (slug: string, params: Record<string, unknown>) => ['calendar', slug, 'view', params] as const,
  teamBookings: (slug: string, params: Record<string, unknown>) => ['calendar', slug, 'bookings', params] as const,
  /** One booking as the calendar draws it (the list's drawer): under the calendar, so its changes refresh it too. */
  teamBooking: (slug: string, code: string, lang: Locale) => ['calendar', slug, 'booking', code, lang] as const,
  // the business's clients (book B-32, B-34): the list, the drawer's lookup and each card under its prefix
  clients: (slug: string) => ['clients', slug] as const,
  clientList: (slug: string, params: Record<string, unknown>) => ['clients', slug, 'list', params] as const,
  clientLookup: (slug: string, params: Record<string, unknown>) => ['clients', slug, 'lookup', params] as const,
  client: (slug: string, id: string, params: Record<string, unknown>) => ['clients', slug, 'card', id, params] as const,
}

/**
 * Whose a query's answer is, which decides what a sign-in, a log-out or another person does to it:
 * - `anyone`: the catalogue, the same for every visitor;
 * - `viewer`: anyone may ask, but the answer depends on who asks. A business page says whether they may book there
 *   online (book Q-154), and a business still in review shows its page, free times and reviews only to its team;
 *   moving one's own booking leaves it out of the busy times; an invite link answers in the viewer's language; the
 *   SMS link page shows more to the booking's own account;
 * - `person`: only the person signed in may ask: their account, bookings, favourites, workspaces and invites, and each
 *   workspace's data, which their level decides. A new key is the person's until it's listed here, so another person
 *   never sees it.
 */
export type Audience = 'anyone' | 'viewer' | 'person'

const ANYONE: readonly unknown[] = ['authMode', 'categories', 'cities', 'search', 'suggest', 'places']
const VIEWER: readonly unknown[] = ['business', 'reviews', 'availability']

export function audienceOf(queryKey: readonly unknown[]): Audience {
  const [head, part] = queryKey
  if (ANYONE.includes(head)) return 'anyone'
  if (VIEWER.includes(head)) return 'viewer'
  // two pages anyone opens from a link sit under the person's prefixes, so their events refresh them: the invite
  // behind a link (beside the person's own invites) and the SMS link page (beside the person's bookings)
  const link = keys.link('', 'en')
  if (head === keys.invites()[0] && part === keys.invite('')[1]) return 'viewer'
  if (head === link[0] && part === link[1]) return 'viewer'
  return 'person'
}

/** Every key of one workspace (each names its slug second): what goes when the person leaves it. */
const WORKSPACE: readonly unknown[] = [
  keys.team('')[0],
  keys.calendar('')[0],
  keys.settings('')[0],
  keys.requests('')[0],
  keys.clients('')[0],
  ...VIEWER,
]
export const inWorkspace =
  (slug: string) =>
  (queryKey: readonly unknown[]): boolean =>
    WORKSPACE.includes(queryKey[0]) && queryKey[1] === slug
