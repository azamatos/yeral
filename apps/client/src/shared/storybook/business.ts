import type { BookingDetail } from '@yeral/contract/bookings'
import type { BusinessCard, BusinessDetail, reviewSchema } from '@yeral/contract/catalog'
import { addDays, today } from '@yeral/domain/time'
import type { z } from 'zod'
import { authApi, fakeFetch, json, refuse, type AuthApiOptions } from './fake-api'

const service = (
  id: string,
  name: string,
  durationMin: number,
  price: BusinessDetail['serviceGroups'][number]['services'][number]['price'],
  staff: string,
  description: string | null = null,
) => ({
  id,
  name,
  description,
  durationMin,
  price,
  staffIds: [staff],
})

const specialist = (
  id: string,
  name: string,
  role: string,
  rating: number,
  serviceIds: string[],
  nextFree: BusinessDetail['specialists'][number]['nextFree'],
) => ({ id, name, role, photo: null, rating, serviceIds, nextFree })

/**
 * Glow Studio as the business page reads it (`GET /businesses/glow-studio`, demo-data `v06r3`, written the English
 * way): 12 services in 4 groups (s12 «Bridal hair styling» keeps its price for the place), 4 specialists who each do
 * one group with their next free times (Venue), open, the next free time today at 15:30, confirming by hand. Stories
 * change what they need
 * (`{ ...GLOW, onlineEnabled: false }`).
 */
export const GLOW: BusinessDetail = {
  slug: 'glow-studio',
  name: 'Glow Studio',
  example: false,
  category: { id: 'beauty', name: 'Beauty salon' },
  bookingTypes: ['appointment'],
  specialistWord: 'Specialist',
  rating: 4.9,
  reviewsCount: 96,
  ratingBreakdown: { 1: 0, 2: 1, 3: 1, 4: 6, 5: 88 },
  address: 'Bitarap Türkmenistan avenue 247',
  city: { id: 'ashgabat', name: 'Ashgabat' },
  floor: '2nd floor',
  entranceNote: 'The door beside the shopping centre, lift to the 2nd floor',
  hideExactAddress: false,
  movedAt: null,
  geo: { lat: 37.9601, lng: 58.3261, approximate: false },
  distanceM: 3000,
  phone: '+99312456789',
  photos: [
    { url: '/photos/adam-winger-FkAZqQJTbXM-unsplash.jpg', alt: 'A stylist styling a client’s hair' },
    { url: '/photos/benyamin-bohlouli-LGXN4OSQSa4-unsplash.jpg', alt: 'Inside Glow Studio' },
    { url: '/photos/giorgio-trovato-gb6gtiTZKB8-unsplash.jpg', alt: 'A manicure' },
    { url: '/photos/rosa-rafael-Pe9IXUuC6QU-unsplash.jpg', alt: 'A facial' },
    { url: '/photos/engin-akyurt-ZbzYDboN7fg-unsplash.jpg', alt: 'Spa stones for a massage' },
  ],
  about: 'Hair, nails and facial care in one place. We work only with tested products and see every client on time.',
  amenities: ['wifi', 'air_conditioning', 'parking', 'card_payment'],
  hours: [
    { open: 540, close: 1200, break: null },
    { open: 540, close: 1200, break: null },
    { open: 540, close: 1200, break: null },
    { open: 540, close: 1200, break: null },
    { open: 540, close: 1200, break: null },
    { open: 540, close: 1200, break: null },
    { open: 600, close: 1080, break: null },
  ],
  specialDays: [],
  open: { open: true, until: 1200 },
  rules: { cancelWindowMinutes: 120, lateToleranceMinutes: 15, note: null },
  onlineEnabled: true,
  bookOnline: true,
  preview: null,
  confirmMode: 'manual',
  holdMinutes: 30,
  leadMinutes: 0,
  windowDays: 30,
  typicalConfirmMinutes: 15,
  priceFrom: { type: 'from', amount: 40 },
  nextFree: { date: today(), start: 930 },
  serviceGroups: [
    {
      id: 'hair',
      name: 'Hair',
      services: [
        service('s1', 'Women’s haircut', 60, { type: 'fixed', amount: 80 }, 'st-ayna', 'Wash, cut and style'),
        service('s2', 'Hair styling', 45, { type: 'fixed', amount: 60 }, 'st-ayna'),
        service('s3', 'Hair colouring', 120, { type: 'from', amount: 250 }, 'st-ayna', 'The price depends on the hair’s length'),
        service('s4', 'Children’s haircut', 30, { type: 'fixed', amount: 40 }, 'st-ayna'),
        service('s12', 'Bridal hair styling', 120, { type: 'hidden', amount: 400 }, 'st-ayna', 'With a trial styling; the price is agreed'),
      ],
    },
    {
      id: 'nails',
      name: 'Nails',
      services: [
        service('s5', 'Manicure', 60, { type: 'fixed', amount: 70 }, 'st-maral'),
        service('s6', 'Gel manicure', 90, { type: 'fixed', amount: 110 }, 'st-maral'),
        service('s7', 'Pedicure', 75, { type: 'fixed', amount: 90 }, 'st-maral'),
      ],
    },
    {
      id: 'face',
      name: 'Facial care',
      services: [
        service('s8', 'Facial cleansing', 60, { type: 'fixed', amount: 150 }, 'st-jeren'),
        service('s9', 'Brows and lashes', 30, { type: 'fixed', amount: 50 }, 'st-jeren'),
      ],
    },
    {
      id: 'massage',
      name: 'Massage',
      services: [
        service('s10', 'Back massage', 30, { type: 'fixed', amount: 90 }, 'st-leyli'),
        service('s11', 'Full body massage', 60, { type: 'fixed', amount: 160 }, 'st-leyli'),
      ],
    },
  ],
  specialists: [
    specialist('st-ayna', 'Aýna', 'Stylist', 4.9, ['s1', 's2', 's3', 's4', 's12'], { date: today(), start: 930 }),
    specialist('st-maral', 'Maral', 'Nail artist', 5, ['s5', 's6', 's7'], { date: today(), start: 960 }),
    specialist('st-jeren', 'Jeren', 'Cosmetologist', 4.8, ['s8', 's9'], { date: addDays(today(), 1), start: 600 }),
    // nothing free soon, as the specialist step answers for her
    specialist('st-leyli', 'Leýli', 'Massage therapist', 4.9, ['s10', 's11'], null),
  ],
  tables: null,
  similar: [],
}

/**
 * The time step's answer (`GET /businesses/{slug}/availability`): 14 days from today; the day after tomorrow is full
 * and the fifth day closed for a holiday; an open day has nine free times from 10:00 to 18:00 (today from 15:30).
 * Without a date, the first open day.
 */
function freeTimes(date: string | null) {
  const days = Array.from({ length: 14 }, (_, i) => addDays(today(), i))
  const state = (d: string) => (d === days[2] ? 'full' : d === days[4] ? 'closed' : 'open')
  const day = date && days.includes(date) ? date : today()
  const all = [600, 630, 690, 840, 870, 930, 960, 1050, 1080]
  const slots = state(day) === 'open' ? all.filter((m) => day !== days[0] || m >= 930) : []
  return {
    date: day,
    slots: slots.map((start) => ({ start, end: start + 60 })),
    days: days.map((d) => ({ date: d, state: state(d), closedReason: state(d) === 'closed' ? 'Holiday' : null })),
    nextFree: { date: addDays(today(), 3), start: 600 },
  }
}

type Review = z.infer<typeof reviewSchema>

const DAY = 86_400_000

/**
 * Venue's reviews, newest first (written the English way): Merdan K.'s 1★ from yesterday that the business reported
 * and Ýeral is checking (round 3 names him, never «Anonymous»), Gülälek N.'s with the business's reply, two more.
 */
export const REVIEWS: Review[] = [
  {
    id: 'r1',
    author: 'Merdan K.',
    rating: 1,
    tags: [],
    text: 'The worst salon, go somewhere else!',
    createdAt: Date.now() - DAY,
    what: '',
    reply: null,
    underReview: true,
  },
  {
    id: 'r2',
    author: 'Gülälek N.',
    rating: 5,
    tags: [],
    text: 'Aýna cut my hair exactly as I wanted. They took me on time, and the salon is clean and calm.',
    createdAt: Date.now() - 2 * DAY,
    what: 'Women’s haircut · Aýna',
    reply: { text: 'Thank you, Gülälek! We look forward to seeing you again.', createdAt: Date.now() - DAY },
    underReview: false,
  },
  {
    id: 'r3',
    author: 'Ogulşat M.',
    rating: 5,
    tags: [],
    text: 'Maral works with great care. The gel polish lasted three weeks.',
    createdAt: Date.now() - 7 * DAY,
    what: 'Gel manicure · Maral',
    reply: null,
    underReview: false,
  },
  {
    id: 'r4',
    author: 'Bahar A.',
    rating: 4,
    tags: [],
    text: 'Good service, but I had to wait a little before it started.',
    createdAt: Date.now() - 21 * DAY,
    what: 'Facial cleansing · Jeren',
    reply: null,
    underReview: false,
  },
]

/** The reviews' first page as the api sends it (12), and the next from `cursor`. */
function reviewPage(reviews: readonly Review[], cursor: string | null) {
  const from = Number(cursor ?? 0)
  const items = reviews.slice(from, from + 12)
  return { items, cursor: from + 12 < reviews.length ? String(from + 12) : null }
}

export interface BusinessApiOptions extends AuthApiOptions {
  /** The page as the api answers it, or the error a missing (`not_found`) or unchecked (`in_review`) one gives. */
  business?: BusinessDetail | 'not_found' | 'in_review'
  /** The signed-in person's favourites, by slug. */
  favourites?: string[]
  /** The page's reviews, newest first (`REVIEWS` by default). */
  reviews?: Review[]
  /** A start someone else takes first: sending it answers `slot_taken` with the nearest free times, once. */
  taken?: number
}

/** The booking `POST /bookings` makes (`YR-48213`, then `YR-48214` …): pending at a business that confirms by hand, else confirmed. */
function sentBooking(business: BusinessDetail, body: Record<string, unknown>, code: string): BookingDetail {
  const ids = body.serviceIds as string[]
  const services = business.serviceGroups.flatMap((g) => g.services).filter((s) => ids.includes(s.id))
  const staffId = body.staffId as string | null
  const date = String(body.date)
  const start = Number(body.start)
  let at = start
  const items = services.map((s) => {
    const staff = business.specialists.find((p) => p.id === (staffId ?? s.staffIds[0]))?.name ?? null
    const item = { service: s.name, staff, start: at, end: at + s.durationMin }
    at += s.durationMin
    return item
  })
  const manual = business.confirmMode === 'manual'
  return {
    code,
    business: {
      slug: business.slug,
      name: business.name,
      example: business.example,
      category: business.category.name,
      photo: business.photos[0] ?? null,
      phone: business.phone,
    },
    what: { type: 'appointment', items },
    date,
    start,
    end: at,
    status: manual ? 'pending' : 'confirmed',
    cancelledBy: null,
    price: { type: 'fixed', amount: services.reduce((sum, s) => sum + s.price.amount, 0) },
    source: 'web',
    timeline: [{ event: 'sent', at: Date.now() }],
    address: business.address,
    city: business.city,
    floor: business.floor,
    entranceNote: business.entranceNote,
    movedAt: null,
    geo: business.geo,
    clientNote: (body.note as string | undefined) ?? null,
    holdUntil: manual ? Date.now() + 30 * 60_000 : null,
    cancelDeadline: Date.now() + 86_400_000,
    askCancelReason: false,
    cancelReason: null,
    businessCancel: null,
    decline: null,
    cancelOffers: [],
    expiredAlternatives: [],
    offerTakenBy: null,
    bookOnline: true,
  } as unknown as BookingDetail
}

/**
 * The business page's and the booking flow's api: the page, its specialists' and days' free times, the heart
 * (`/me/favorites`) and, for everything else, the sign-in (`authApi`).
 */
export const businessApi =
  ({ business = GLOW, favourites = [], reviews = REVIEWS, taken, ...auth }: BusinessApiOptions = {}) =>
  (): typeof fetch => {
    const signIn = authApi(auth)()
    const saved = new Set(favourites)
    const bookings = new Map<string, BookingDetail>()
    let takenFirst = taken
    const card = (slug: string): BusinessCard =>
      ({
        ...(typeof business === 'object' ? business : GLOW),
        slug,
        photo: null,
        street: '',
        availability: { type: 'appointment', date: today(), starts: [], more: 0 },
      }) as unknown as BusinessCard
    const mine = fakeFetch(({ route, query, body }) => {
      if (route === 'POST /bookings' && typeof business === 'object') {
        if (takenFirst !== undefined && Number(body.start) === takenFirst) {
          takenFirst = undefined
          const date = String(body.date)
          return refuse(409, 'slot_taken', { alternatives: [960, 990].map((start) => ({ date, start, end: start + 60 })) })
        }
        const booking = sentBooking(business, body, `YR-${48213 + bookings.size}`)
        bookings.set(booking.code, booking)
        return json(booking, 201)
      }
      const read = /^GET \/me\/bookings\/([^/]+)$/.exec(route)
      if (read?.[1]) {
        const booking = bookings.get(read[1])
        return booking ? json(booking) : refuse(404, 'not_found')
      }
      if (/^GET \/businesses\/[^/]+\/specialists\/availability$/.test(route))
        return json({
          any: { date: today(), start: 930 },
          items: [
            { staffId: 'st-ayna', next: { date: today(), start: 930 } },
            { staffId: 'st-maral', next: { date: today(), start: 960 } },
            { staffId: 'st-jeren', next: { date: addDays(today(), 1), start: 600 } },
            { staffId: 'st-leyli', next: null },
          ],
        })
      if (/^GET \/businesses\/[^/]+\/availability$/.test(route)) return json(freeTimes(query.get('date')))
      if (/^GET \/businesses\/[^/]+\/reviews$/.test(route)) return json(reviewPage(reviews, query.get('cursor')))
      const page = /^GET \/businesses\/([^/]+)$/.exec(route)
      if (page) return typeof business === 'string' ? refuse(404, business) : json(business)
      if (route === 'GET /me/favorites') return json({ items: [...saved].map(card), cursor: null })
      const heart = /^(PUT|DELETE) \/me\/favorites\/([^/]+)$/.exec(route)
      if (heart?.[1] && heart[2]) {
        if (heart[1] === 'PUT') saved.add(heart[2])
        else saved.delete(heart[2])
        return new Response(null, { status: 204 })
      }
      return undefined
    })
    return (input, init) => {
      const path = new URL(new Request(input, init).url).pathname
      return /^\/v1\/(businesses|bookings|me\/favorites|me\/bookings)/.test(path) ? mine(input, init) : signIn(input, init)
    }
  }
