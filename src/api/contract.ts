/**
 * The API contract between the web app and the backend.
 *
 * The UI only ever talks to an `Api` object. Today it is the in-browser mock (src/api/mock);
 * when the backend is ready, an HTTP implementation of the same interface replaces it
 * (src/api/http, selected by NEXT_PUBLIC_API). docs/API.md maps every method to a REST endpoint.
 */
import type { Booking, CategoryId, Channel, DateException, District, Review, Service, User, ViewStatus, WeekHours } from '@/domain/types'

export type { CategoryId, District, Service, User, ViewStatus }

/* ───────────── catalogue ───────────── */

export interface Rating {
  avg: number
  count: number
}

export interface ServiceBrief {
  id: string
  name: string
  dur: number
  price: number
  priceFrom?: boolean
}

export interface SalonCard {
  id: string
  slug: string
  name: string
  kind: string
  categories: CategoryId[]
  district: string
  districtId: string
  address: string
  geo: { lat: number; lng: number }
  photos: string[]
  rating: Rating
  minPrice: number
  /** the 3 most booked services (or the ones matching the search) */
  services: ServiceBrief[]
  online: boolean
  /** on Yeral for less than 30 days */
  isNew: boolean
  instant: boolean
}

export interface StaffPublic {
  id: string
  name: string
  spec: string
  rating: number
  visits: number
  services: string[]
}

export interface SalonDetail extends SalonCard {
  phone: string
  instagram?: string
  about: string
  entrance: string
  amenities: string[]
  hours: WeekHours
  exceptions: DateException[]
  cancelHours: number
  windowDays: number
  menu: Service[]
  staff: StaffPublic[]
  ratingDist: number[] // [5★, 4★, 3★, 2★, 1★] counts among Yeral reviews
}

export interface ReviewPublic {
  id: string
  clientName: string
  rating: number
  text: string
  tags: string[]
  date: string
  svc: string
  staffName?: string
  answer?: { text: string; ts: number }
  mine?: boolean
}

export type SortKey = 'recommended' | 'rating' | 'price' | 'distance'

export interface SearchParams {
  q?: string
  category?: CategoryId
  district?: string
  /** YYYY-MM-DD: only salons with free windows that day */
  date?: string
  /** only salons that are open right now */
  openNow?: boolean
  instant?: boolean
  sort?: SortKey
  /** map viewport filter */
  bounds?: { n: number; s: number; e: number; w: number }
}

export interface SearchResult {
  items: SalonCard[]
  total: number
}

/* ───────────── availability ───────────── */

export interface AvailabilityQuery {
  salonId: string
  serviceIds: string[]
  /** omitted = any professional */
  staffId?: string
  date: string
  /** the booking being moved, so its own slot counts as free */
  excludeBookingId?: string
}

export interface Slot {
  start: number
  /** staff free at that time */
  staff: string[]
}

export interface DayAvailability {
  date: string
  /** null when working; otherwise why nobody works that day */
  closed: string | null
  slots: Slot[]
}

export interface NextFree {
  date: string
  start: number
  staffId: string
}

/* ───────────── account & bookings ───────────── */

export interface Session {
  user: User
}

export interface BookingView extends Booking {
  salon: { id: string; slug: string; name: string; kind: string; address: string; district: string; photo: string; phone: string; cancelHours: number }
  staffName: string
  view: ViewStatus
  proposalStaffName?: string
}

export interface CreateBookingInput {
  salonId: string
  staffId: string
  serviceIds: string[]
  date: string
  start: number
  comment?: string
  channel: Channel
  /** move an existing booking instead of creating one */
  replaceId?: string
}

export type CreateBookingResult = { ok: true; id: string; status: 'pending' | 'confirmed' } | { ok: false; reason: 'taken'; alternatives: number[] } | { ok: false; reason: 'auth' }

export interface NotificationView {
  id: string
  title: string
  body: string
  bookingId?: string
  ts: number
  read: boolean
}

/* ───────────── the interface ───────────── */

export interface Api {
  catalog: {
    districts(): Promise<District[]>
    search(p: SearchParams): Promise<SearchResult>
    salon(slug: string): Promise<SalonDetail | null>
    /** all slugs, for sitemap / static params */
    slugs(): Promise<string[]>
    reviews(salonId: string): Promise<ReviewPublic[]>
    similar(salonId: string): Promise<SalonCard[]>
    /** service names for search autocomplete */
    suggest(q: string): Promise<{ services: { name: string; salons: number }[]; salons: SalonCard[] }>
  }
  availability: {
    day(q: AvailabilityQuery): Promise<DayAvailability>
    /** number of free windows per day, for calendar dots */
    days(q: Omit<AvailabilityQuery, 'date'> & { from: string; days: number }): Promise<{ date: string; count: number; closed: string | null }[]>
    nextFree(salonId: string, staffId?: string): Promise<NextFree | null>
    /** next free windows for many salons at once (search results) */
    nextFreeMany(salonIds: string[], date?: string): Promise<Record<string, number[]>>
  }
  auth: {
    session(): Promise<Session | null>
    requestCode(phone: string): Promise<{ sent: true; demoCode?: string }>
    verify(phone: string, code: string, name?: string): Promise<{ ok: true; session: Session; isNew: boolean } | { ok: false; error: 'code' }>
    logout(): Promise<void>
    updateMe(patch: Partial<Omit<User, 'id'>>): Promise<User>
  }
  bookings: {
    mine(): Promise<BookingView[]>
    get(id: string): Promise<BookingView | null>
    create(input: CreateBookingInput): Promise<CreateBookingResult>
    cancel(id: string, reason: string): Promise<void>
    acceptProposal(id: string): Promise<void>
    declineProposal(id: string): Promise<void>
    confirmAttendance(id: string): Promise<void>
    notMe(id: string): Promise<void>
  }
  reviews: {
    mine(): Promise<(ReviewPublic & { salonName: string; salonSlug: string; bookingId?: string })[]>
    create(bookingId: string, input: { rating: number; text: string; tags: string[] }): Promise<void>
    update(id: string, input: { rating: number; text: string }): Promise<void>
    remove(id: string): Promise<void>
  }
  favorites: {
    list(): Promise<string[]>
    toggle(salonId: string): Promise<boolean>
  }
  notifications: {
    list(): Promise<NotificationView[]>
    markRead(id?: string): Promise<void>
  }
}

export type { Review }
