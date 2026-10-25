import type { Me } from '@yeral/contract/account'
import type { MyBooking } from '@yeral/contract/bookings'
import { addDays, today } from '@yeral/domain/time'
import { AYJEMAL, authApi, fakeFetch, json, refuse } from './fake-api'

const ACTIONS = {
  cancel: false,
  reschedule: false,
  editNote: false,
  callOnly: false,
  review: false,
  editReview: false,
  bookAgain: false,
  restore: false,
}
const GLOW = {
  slug: 'glow-studio',
  name: 'Glow Studio',
  example: false,
  category: 'Beauty salon',
  photo: { url: '/photos/adam-winger-FkAZqQJTbXM-unsplash.jpg', alt: '' },
  phone: '+99312456789',
}
const LOFT = {
  slug: 'barber-loft',
  name: 'Barber Loft',
  example: false,
  category: 'Barbershop',
  photo: { url: '/photos/allef-vinicius-IvQeAVeJULw-unsplash.jpg', alt: '' },
  phone: '+99312334455',
}

const row = (code: string, over: Partial<MyBooking>): MyBooking => ({
  code,
  business: GLOW,
  what: { type: 'appointment', items: [{ service: 'Women’s haircut', staff: 'Aýna', start: 870, end: 930 }] },
  date: addDays(today(), 1),
  start: 870,
  end: 930,
  status: 'confirmed',
  cancelledBy: null,
  price: { type: 'fixed', amount: 80 },
  source: 'web',
  holdUntil: null,
  reschedule: null,
  decline: null,
  businessCancel: null,
  offers: null,
  offerTakenBy: null,
  bookOnline: true,
  actions: { ...ACTIONS, cancel: true, reschedule: true },
  ...over,
})

const offer = (start: number, state: 'free' | 'taken' | 'past') => ({
  date: addDays(today(), 2),
  start,
  end: start + 60,
  staff: { id: 'st-ayna', name: 'Aýna' },
  state,
})

/**
 * My bookings as the api lists them (`GET /me/bookings`, #215's rows): Upcoming has a request waiting for its answer,
 * a declined one with times offered (one already taken), an expired one with free times, a confirmed booking with a
 * move waiting, and a confirmed one at Barber Loft; Past has a completed visit, one the client cancelled (Undo) and a phone booking the business
 * cancelled whose offered time has passed.
 */
export const MY_BOOKINGS: { upcoming: MyBooking[]; past: MyBooking[] } = {
  upcoming: [
    row('YR-48230', {
      status: 'cancelled',
      cancelledBy: 'business',
      decline: { reason: 'slot_busy', text: null },
      offers: { source: 'decline', times: [offer(600, 'free'), offer(690, 'taken'), offer(1080, 'free')] },
      actions: ACTIONS,
    }),
    row('YR-48241', {
      business: LOFT,
      what: { type: 'appointment', items: [{ service: 'Men’s haircut', staff: null, start: 660, end: 705 }] },
      start: 660,
      end: 705,
      status: 'cancelled',
      cancelledBy: 'system',
      offers: { source: 'expired', times: [offer(720, 'free'), offer(780, 'free')] },
      actions: ACTIONS,
    }),
    row('YR-48213', { status: 'pending', holdUntil: Date.now() + 18 * 60_000, date: today(), start: 1020, end: 1080 }),
    row('YR-48190', { reschedule: { date: addDays(today(), 3), start: 600, end: 660, holdUntil: Date.now() + 25 * 60_000 } }),
    row('YR-48205', {
      business: LOFT,
      what: { type: 'appointment', items: [{ service: 'Beard trim', staff: 'Döwlet', start: 600, end: 630 }] },
      start: 600,
      end: 630,
      price: { type: 'fixed', amount: 40 },
    }),
  ],
  past: [
    row('YR-48101', { date: addDays(today(), -7), status: 'completed', actions: { ...ACTIONS, bookAgain: true } }),
    row('YR-48150', {
      date: addDays(today(), 4),
      status: 'cancelled',
      cancelledBy: 'client',
      actions: { ...ACTIONS, restore: true, bookAgain: true },
    }),
    row('YR-48120', {
      business: LOFT,
      what: { type: 'appointment', items: [{ service: 'Men’s haircut', staff: 'Döwlet', start: 600, end: 645 }] },
      date: addDays(today(), -2),
      start: 600,
      end: 645,
      source: 'phone',
      status: 'cancelled',
      cancelledBy: 'business',
      businessCancel: { reason: 'staff_away', text: null },
      offers: { source: 'cancel', times: [{ ...offer(660, 'past'), date: addDays(today(), -1) }] },
      actions: { ...ACTIONS, bookAgain: true },
    }),
  ],
}

/**
 * My bookings' api: the two lists, Undo and taking an offered time (`refuse` makes either fail with that code), and the
 * sign-in (`authApi`) for everything else.
 */
export const myBookingsApi =
  ({ lists = MY_BOOKINGS, signedIn = AYJEMAL, refuse: fail }: { lists?: typeof MY_BOOKINGS; signedIn?: Me; refuse?: string } = {}) =>
  (): typeof fetch => {
    const signIn = authApi({ signedIn })()
    const all = [...lists.upcoming, ...lists.past]
    const mine = fakeFetch(({ route, query }) => {
      if (route === 'GET /me/bookings') return json({ items: query.get('tab') === 'past' ? lists.past : lists.upcoming, cursor: null })
      const act = /^POST \/me\/bookings\/([^/]+)\/(restore|accept-alternative)$/.exec(route)
      if (act?.[1]) {
        const booking = all.find((b) => b.code === act[1])
        if (!booking) return refuse(404, 'not_found')
        if (fail) return refuse(409, fail)
        return json({
          ...booking,
          code: act[2] === 'restore' ? booking.code : 'YR-48231',
          status: 'confirmed',
          cancelledBy: null,
          offers: null,
        })
      }
      return undefined
    })
    return (input, init) => {
      const path = new URL(new Request(input, init).url).pathname
      return path.startsWith('/v1/me/bookings') ? mine(input, init) : signIn(input, init)
    }
  }
