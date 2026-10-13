/**
 * Domain model shared by the marketplace and (later) the business workspace.
 * Ported from the mobile prototype (app/src/data/types.ts) and generalised for many salons.
 * These are also the DTO shapes the real backend is expected to return — see docs/API.md.
 */

export type Status = 'pending' | 'confirmed' | 'cancelled' | 'declined' | 'noshow'
/** Status as shown to people: confirmed bookings in the past are "done" by default. */
export type ViewStatus = Status | 'done' | 'expired'

/** Opening hours for one weekday in minutes from midnight; null = day off. */
export type DayHours = { open: number; close: number } | null
/** Index 0 = Monday … 6 = Sunday */
export type WeekHours = DayHours[]

export interface DateException {
  id: string
  name: string
  from: string // YYYY-MM-DD
  to: string
  yearly: boolean
}

/** Treatment kinds: drive the home tiles, search filter and SEO landing pages. */
export type CategoryId = 'barber' | 'hair' | 'nails' | 'brows' | 'massage' | 'cosmetology' | 'makeup'

export interface District {
  id: string
  name: string
}

export interface Rules {
  online: boolean
  /** true = every request waits for the salon; false = instant confirmation */
  manual: boolean
  minLead: number // minutes
  windowDays: number
  buffer: number
  cancelHours: number
  askReason: boolean
  blockAfter2: boolean
}

export interface Salon {
  id: string
  slug: string
  name: string
  /** venue type shown under the name, e.g. «Барбершоп» */
  kind: string
  categories: CategoryId[]
  city: string
  districtId: string
  address: string
  entrance: string
  geo: { lat: number; lng: number }
  photos: string[]
  rating: number
  reviewsBase: number
  phone: string
  instagram?: string
  about: string
  amenities: string[]
  hours: WeekHours
  exceptions: DateException[]
  rules: Rules
  /** joined Yeral (YYYY-MM-DD) — powers «Новые на Yeral» */
  since: string
  /**
   * Demo behaviour until the business workspace is connected:
   * 'manual' — requests wait for a salon decision (demo panel / business app);
   * 'auto' — the salon «answers» by itself after a few seconds.
   */
  demo: 'manual' | 'auto'
}

export interface Service {
  id: string
  salonId: string
  /** group inside the salon menu, e.g. «Стрижки» */
  group: string
  category: CategoryId
  name: string
  dur: number
  price: number
  /** price is a lower bound («от 90 м») */
  priceFrom?: boolean
  online: boolean
  desc?: string
  deleted?: boolean
}

export interface Staff {
  id: string
  salonId: string
  name: string
  full: string
  roleId: string
  spec: string
  rating: number
  visits: number
  services: string[]
  /** null = same as salon */
  schedule: WeekHours | null
  exceptions: DateException[]
  active: boolean
  since: string
  /** Shown to clients (staff with services only) */
  bookable: boolean
}

export interface BookedService {
  id: string
  name: string
  dur: number
  price: number
}

/**
 * Where the booking came from. The product deck makes bookings through the salon's own link free forever,
 * while first visits from the catalogue carry the commission — so the web records it.
 */
export type Channel = 'marketplace' | 'direct' | 'phone'

export interface Booking {
  id: string
  salonId: string
  staffId: string
  /** the salon's client record */
  clientId: string
  /** the marketplace user, when the booking belongs to someone with a Yeral account */
  userId?: string
  date: string
  start: number
  services: BookedService[]
  dur: number
  price: number
  status: Status
  channel: Channel
  comment?: string
  cancelledBy?: 'client' | 'salon'
  reason?: string
  late?: boolean
  proposal?: { date: string; start: number; staffId: string }
  createdAt: number
  confirmedAt?: number
  needsClientConfirm?: boolean
  clientConfirmed?: boolean
  unlinked?: boolean
  reviewId?: string
  /** client asked to move a confirmed booking: request pending again */
  rescheduled?: boolean
}

export interface SalonClient {
  id: string
  salonId: string
  name: string
  phone: string
  source: string
  since: string
}

export interface Review {
  id: string
  salonId: string
  staffId: string
  clientName: string
  userId?: string
  bookingId?: string
  rating: number
  text: string
  tags: string[]
  date: string
  svc: string
  answer?: { text: string; ts: number }
  createdAt: number
}

export interface Notif {
  id: string
  to: 'client' | 'business'
  salonId?: string
  title: string
  body: string
  bookingId?: string
  ts: number
  read: boolean
}

export interface User {
  id: string
  name: string
  phone: string
  birthday?: string
  gender?: string
  notif: { push: boolean; smsStatus: boolean; smsReminder: boolean }
}
