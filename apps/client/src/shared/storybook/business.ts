import type { BusinessCard, BusinessDetail } from '@yeral/contract/catalog'
import { today } from '@yeral/domain/time'
import { authApi, fakeFetch, json, refuse, type AuthApiOptions } from './fake-api'

const service = (
  id: string,
  name: string,
  durationMin: number,
  price: BusinessDetail['serviceGroups'][number]['services'][number]['price'],
  description: string | null = null,
) => ({
  id,
  name,
  description,
  durationMin,
  price,
  staffIds: ['st-ayna'],
})

/**
 * Glow Studio as the business page reads it (`GET /businesses/glow-studio`, demo-data `v06r3`, written the English
 * way): 12 services in 4 groups (s12 «Bridal hair styling» keeps its price for the place), open, the next free time
 * today at 15:30, confirming by hand. Stories change what they need (`{ ...GLOW, onlineEnabled: false }`).
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
        service('s1', 'Women’s haircut', 60, { type: 'fixed', amount: 80 }, 'Wash, cut and style'),
        service('s2', 'Hair styling', 45, { type: 'fixed', amount: 60 }),
        service('s3', 'Hair colouring', 120, { type: 'from', amount: 250 }, 'The price depends on the hair’s length'),
        service('s4', 'Children’s haircut', 30, { type: 'fixed', amount: 40 }),
        service('s12', 'Bridal hair styling', 120, { type: 'hidden', amount: 400 }, 'With a trial styling; the price is agreed'),
      ],
    },
    {
      id: 'nails',
      name: 'Nails',
      services: [
        service('s5', 'Manicure', 60, { type: 'fixed', amount: 70 }),
        service('s6', 'Gel manicure', 90, { type: 'fixed', amount: 110 }),
        service('s7', 'Pedicure', 75, { type: 'fixed', amount: 90 }),
      ],
    },
    {
      id: 'face',
      name: 'Facial care',
      services: [
        service('s8', 'Facial cleansing', 60, { type: 'fixed', amount: 150 }),
        service('s9', 'Brows and lashes', 30, { type: 'fixed', amount: 50 }),
      ],
    },
    {
      id: 'massage',
      name: 'Massage',
      services: [
        service('s10', 'Back massage', 30, { type: 'fixed', amount: 90 }),
        service('s11', 'Full body massage', 60, { type: 'fixed', amount: 160 }),
      ],
    },
  ],
  specialists: [{ id: 'st-ayna', name: 'Aýna', role: 'Stylist', photo: null, rating: 4.9, serviceIds: ['s1', 's2', 's3', 's4', 's12'] }],
  tables: null,
  similar: [],
}

export interface BusinessApiOptions extends AuthApiOptions {
  /** The page as the api answers it, or the error a missing (`not_found`) or unchecked (`in_review`) one gives. */
  business?: BusinessDetail | 'not_found' | 'in_review'
  /** The signed-in person's favourites, by slug. */
  favourites?: string[]
}

/** The business page's api: the page, the heart (`/me/favorites`) and, for everything else, the sign-in (`authApi`). */
export const businessApi =
  ({ business = GLOW, favourites = [], ...auth }: BusinessApiOptions = {}) =>
  (): typeof fetch => {
    const signIn = authApi(auth)()
    const saved = new Set(favourites)
    const card = (slug: string): BusinessCard =>
      ({
        ...(typeof business === 'object' ? business : GLOW),
        slug,
        photo: null,
        street: '',
        availability: { type: 'appointment', date: today(), starts: [], more: 0 },
      }) as unknown as BusinessCard
    const mine = fakeFetch(({ route }) => {
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
      return path.startsWith('/v1/businesses') || path.startsWith('/v1/me/favorites') ? mine(input, init) : signIn(input, init)
    }
  }
