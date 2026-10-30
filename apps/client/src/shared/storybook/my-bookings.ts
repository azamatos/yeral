import type { Me } from '@yeral/contract/account'
import type { BookingDetail, MyBooking } from '@yeral/contract/bookings'
import { addDays, epochOf, today } from '@yeral/domain/time'
import { businessApi, type BusinessApiOptions } from './business'
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
  // the haircut runs the booking's own time, unless the row names its services
  what: {
    type: 'appointment',
    items: [
      { serviceId: 's1', service: 'Women’s haircut', staffId: 'st-ayna', staff: 'Aýna', start: over.start ?? 870, end: over.end ?? 930 },
    ],
  },
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
  review: null,
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
      what: {
        type: 'appointment',
        items: [{ serviceId: 'loft-cut', service: 'Men’s haircut', staffId: 'loft-merdan', staff: 'Merdan', start: 660, end: 705 }],
      },
      start: 660,
      end: 705,
      status: 'cancelled',
      cancelledBy: 'system',
      offers: { source: 'expired', times: [offer(720, 'free'), offer(780, 'free')] },
      actions: ACTIONS,
    }),
    row('YR-48213', {
      status: 'pending',
      holdUntil: Date.now() + 18 * 60_000,
      date: today(),
      start: 1020,
      end: 1080,
      actions: { ...ACTIONS, cancel: true, reschedule: true, editNote: true },
    }),
    row('YR-48190', { reschedule: { date: addDays(today(), 3), start: 600, end: 660, holdUntil: Date.now() + 25 * 60_000 } }),
    row('YR-48205', {
      business: LOFT,
      what: {
        type: 'appointment',
        items: [{ serviceId: 'loft-beard', service: 'Beard trim', staffId: 'loft-dowlet', staff: 'Döwlet', start: 600, end: 630 }],
      },
      start: 600,
      end: 630,
      price: { type: 'fixed', amount: 40 },
    }),
  ],
  past: [
    row('YR-48101', { date: addDays(today(), -7), status: 'completed', actions: { ...ACTIONS, bookAgain: true, review: true } }),
    row('YR-48150', {
      date: addDays(today(), 4),
      status: 'cancelled',
      cancelledBy: 'client',
      actions: { ...ACTIONS, restore: true, bookAgain: true },
    }),
    row('YR-48120', {
      business: LOFT,
      what: {
        type: 'appointment',
        items: [{ serviceId: 'loft-cut', service: 'Men’s haircut', staffId: 'loft-dowlet', staff: 'Döwlet', start: 600, end: 645 }],
      },
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

const HOUR = 3_600_000

/**
 * A row's booking as `GET /me/bookings/{code}` has it: its history by what happened to it (sent two days before; a
 * decline and an expiry right after), the place's address and position, its free cancel up to 2 hours before, the
 * offered times by where they come from, and the business asking for a cancel's reason.
 */
export function detailOf(b: MyBooking, over: Partial<BookingDetail> = {}): BookingDetail {
  const visit = epochOf(b.date, b.start)
  const sent = visit - 48 * HOUR
  const ev = (event: BookingDetail['timeline'][number]['event'], hours: number) => ({ event, at: sent + hours * HOUR })
  const timeline =
    b.status === 'pending'
      ? [ev('sent', 0)]
      : b.cancelledBy === 'system'
        ? [ev('sent', 0), ev('expired', 0.5)]
        : b.decline
          ? [ev('sent', 0), ev('declined', 0.3)]
          : b.status === 'cancelled'
            ? [ev('sent', 0), ev('confirmed', 0.2), ev(b.cancelledBy === 'client' ? 'cancelled_by_client' : 'cancelled_by_business', 20)]
            : b.status === 'completed'
              ? [ev('sent', 0), ev('confirmed', 0.2), ev('completed', 49)]
              : b.status === 'noshow'
                ? [ev('sent', 0), ev('confirmed', 0.2), ev('noshow', 48.5)]
                : [ev('sent', 0), ev('confirmed', 0.2), ...(b.reschedule ? [ev('reschedule_requested', 30)] : [])]
  const glow = b.business.slug === GLOW.slug
  return {
    code: b.code,
    business: b.business,
    what: b.what,
    date: b.date,
    start: b.start,
    end: b.end,
    status: b.status,
    cancelledBy: b.cancelledBy,
    price: b.price,
    source: b.source,
    timeline,
    address: glow ? 'Bitarap Türkmenistan avenue 247' : 'Magtymguly avenue 112',
    city: { id: 'ashgabat', name: 'Ashgabat' },
    floor: glow ? '2nd floor' : null,
    entranceNote: glow ? 'The door beside the shopping centre, lift to the 2nd floor' : null,
    movedAt: null,
    geo: glow ? { lat: 37.9601, lng: 58.3261, approximate: false } : { lat: 37.9431, lng: 58.3792, approximate: false },
    clientNote: null,
    holdUntil: b.holdUntil,
    cancelDeadline: visit - 2 * HOUR,
    askCancelReason: true,
    cancelReason: null,
    businessCancel: b.businessCancel,
    decline: b.decline ? { ...b.decline, alternatives: b.offers?.source === 'decline' ? b.offers.times : [] } : null,
    cancelOffers: b.offers?.source === 'cancel' ? b.offers.times : [],
    expiredAlternatives: b.offers?.source === 'expired' ? b.offers.times : [],
    offerTakenBy: b.offerTakenBy,
    bookOnline: b.bookOnline,
    moveRefused: null,
    reschedule: b.reschedule,
    actions: b.actions,
    review: b.review,
    ...over,
  }
}

/**
 * My bookings' api: the two lists, each booking (`details` over what {@link detailOf} makes of a row), and what the
 * list and the drawer do: Undo, taking an offered time, cancelling, withdrawing a move and the note (`refuse` makes
 * Undo and taking a time fail with that code); the sign-in (`authApi`) for everything else.
 */
export const myBookingsApi =
  ({
    lists = MY_BOOKINGS,
    signedIn = AYJEMAL,
    refuse: fail,
    details = {},
    instant = false,
  }: {
    lists?: typeof MY_BOOKINGS
    signedIn?: Me
    refuse?: string
    details?: Record<string, Partial<BookingDetail>>
    /** A move changes the time at once, as at a business that confirms at once. */
    instant?: boolean
  } = {}) =>
  (): typeof fetch => {
    const signIn = authApi({ signedIn })()
    const all = [...lists.upcoming, ...lists.past]
    /** What an action changed on a booking, by code: the row and the drawer say it alike, as the api does. */
    const changed = new Map<string, Partial<MyBooking>>()
    const rowOf = (b: MyBooking): MyBooking => ({ ...b, ...changed.get(b.code) })
    const find = (code: string) => {
      const b = all.find((r) => r.code === code)
      return b ? detailOf(rowOf(b), details[code]) : null
    }
    const mine = fakeFetch(({ route, query, body }) => {
      if (route === 'GET /me/bookings') {
        const items = (query.get('tab') === 'past' ? lists.past : lists.upcoming).map(rowOf)
        return json({ items, total: items.length, cursor: null })
      }
      const one = /^GET \/me\/bookings\/([^/]+)$/.exec(route)
      if (one?.[1]) {
        const booking = find(one[1])
        return booking ? json(booking) : refuse(404, 'not_found')
      }
      const act = /^(?:POST|PATCH) \/me\/bookings\/([^/]+)\/(restore|accept-alternative|cancel|withdraw-move|note|reschedule|review)$/.exec(
        route,
      )
      if (act?.[1]) {
        const booking = find(act[1])
        if (!booking) return refuse(404, 'not_found')
        const done = { status: 'confirmed' as const, cancelledBy: null, decline: null, cancelOffers: [], expiredAlternatives: [] }
        switch (act[2]) {
          case 'cancel':
            return json({
              ...booking,
              status: 'cancelled',
              cancelledBy: 'client',
              reschedule: null,
              cancelReason: (body as { reason?: string }).reason ?? null,
              actions: { ...ACTIONS, restore: true, bookAgain: true },
            })
          case 'withdraw-move':
            return json({ ...booking, reschedule: null })
          case 'review': {
            // written or changed: the stars, tags and words, then open to change for 7 days
            const { rating, tags = [], text = null } = body as { rating: number; tags?: string[]; text?: string | null }
            const review = {
              review: { rating, tags, text, createdAt: Date.now() },
              actions: { ...booking.actions, review: false, editReview: true },
            }
            changed.set(booking.code, review)
            return json({ ...booking, ...review })
          }
          case 'reschedule': {
            // asked of a business that confirms by hand: the new time waits, the old one stays; at once, it moves
            if (fail) return refuse(409, fail)
            const { date, start } = body as { date: string; start: number }
            if (instant) return json({ ...booking, date, start, end: start + booking.end - booking.start, reschedule: null })
            return json({
              ...booking,
              reschedule: { date, start, end: start + booking.end - booking.start, holdUntil: Date.now() + 30 * 60_000 },
            })
          }
          case 'note':
            return json({ ...booking, clientNote: (body as { note: string }).note || null })
          case 'restore':
            return fail ? refuse(409, fail) : json({ ...booking, ...done, actions: { ...ACTIONS, cancel: true, reschedule: true } })
          default:
            return fail ? refuse(409, fail) : json({ ...booking, ...done, code: 'YR-48231', timeline: booking.timeline.slice(0, 1) })
        }
      }
      return undefined
    })
    return (input, init) => {
      const path = new URL(new Request(input, init).url).pathname
      return path.startsWith('/v1/me/bookings') ? mine(input, init) : signIn(input, init)
    }
  }

/**
 * Move mode's api (C-30): Glow Studio's page and free times (`businessApi`) with My bookings' bookings and their
 * actions (`myBookingsApi`, the move among them).
 */
export const moveApi =
  (options: Parameters<typeof myBookingsApi>[0] & { business?: BusinessApiOptions } = {}) =>
  (): typeof fetch => {
    const mine = myBookingsApi(options)()
    const page = businessApi(options.business)()
    return (input, init) => {
      const path = new URL(new Request(input, init).url).pathname
      return path.startsWith('/v1/me/bookings') ? mine(input, init) : page(input, init)
    }
  }
