import { MAX_ONLINE_PARTY } from '@yeral/domain/availability'
import { MAX_ALTERNATIVES } from '@yeral/domain/lifecycle'
import { messages } from '@yeral/i18n/messages'
import { describe, expect, it } from 'vitest'
import { sendCodeSchema, verifyCodeSchema } from './account'
import { appointmentAvailabilityQuerySchema, tableAvailabilityQuerySchema } from './availability'
import { bookingSummarySchema, createBookingSchema, rescheduleSchema, reviewInputSchema } from './bookings'
import { businessQuerySchema, searchQuerySchema } from './catalog'
import { ERROR_CODES, slotTakenDetailsSchema } from './errors'
import { eventListSchema, eventsQuerySchema } from './events'

const ID = '0b6c8f0e-8a0b-4f5e-9d8a-1c2b3d4e5f60'
const ID2 = '1c7d9f1f-9b1c-4a6f-8e9b-2d3c4e5f6a71'

describe('error codes', () => {
  it('every code has a message in tk, ru and en', () => {
    for (const locale of ['tk', 'ru', 'en'] as const) {
      const missing = ERROR_CODES.filter((code) => !(code in messages[locale].errors))
      expect(missing, locale).toEqual([])
    }
  })
})

describe('inputs', () => {
  it('normalises phones to E.164', () => {
    expect(verifyCodeSchema.parse({ phone: '+993 65 90 11 22', code: '1234' }).phone).toBe('+99365901122')
    expect(verifyCodeSchema.safeParse({ phone: '+993 65 90 11 22', code: '12345' }).success).toBe(false)
  })

  it('login codes go to mobile numbers only (landlines can’t get an SMS)', () => {
    expect(sendCodeSchema.parse({ phone: '+993 65 90 11 22' }).phone).toBe('+99365901122')
    expect(sendCodeSchema.safeParse({ phone: '+993 12 45 67 89' }).success).toBe(false)
  })

  it('a service is booked once: duplicate ids are refused', () => {
    const appointment = { type: 'appointment', business: 'glow-studio', staffId: null, date: '2026-10-15', start: 870 }
    expect(createBookingSchema.safeParse({ ...appointment, serviceIds: [ID, ID] }).success).toBe(false)
    expect(createBookingSchema.safeParse({ ...appointment, serviceIds: [ID, ID2] }).success).toBe(true)
  })

  it('a start is a time of day: 24:00 is an end, never a start', () => {
    const appointment = { type: 'appointment', business: 'glow-studio', serviceIds: [ID], staffId: null, date: '2026-10-15' }
    expect(createBookingSchema.safeParse({ ...appointment, start: 1439 }).success).toBe(true)
    expect(createBookingSchema.safeParse({ ...appointment, start: 1440 }).success).toBe(false)
    expect(rescheduleSchema.safeParse({ date: '2026-10-15', start: 1440 }).success).toBe(false)
  })

  it('a big party reaches the api, which answers party_too_large ("9 we ondan köp adam bolsa, jaň ediň")', () => {
    const table = { type: 'table', business: 'bag-kafe', areaId: ID, date: '2026-10-17', start: 1140 }
    expect(createBookingSchema.safeParse({ ...table, partySize: MAX_ONLINE_PARTY + 1 }).success).toBe(true)
    expect(createBookingSchema.safeParse({ ...table, partySize: 0 }).success).toBe(false)
    expect(tableAvailabilityQuerySchema.safeParse({ party: String(MAX_ONLINE_PARTY + 1) }).success).toBe(true)
  })

  it('a booking is one of three types', () => {
    const appointment = createBookingSchema.parse({
      type: 'appointment',
      business: 'glow-studio',
      serviceIds: [ID],
      staffId: null,
      date: '2026-10-15',
      start: 870,
    })
    expect(appointment.type).toBe('appointment')
    expect(
      createBookingSchema.parse({ type: 'table', business: 'bag-kafe', partySize: 4, areaId: ID, date: '2026-10-17', start: 1140 }),
    ).toMatchObject({
      requests: [],
    })
    expect(
      createBookingSchema.safeParse({ type: 'table', business: 'bag-kafe', partySize: 0, areaId: ID, date: '2026-10-17', start: 1140 })
        .success,
    ).toBe(false)
    expect(createBookingSchema.safeParse({ type: 'class', business: 'aydyn-yoga', sessionId: ID, seats: 3 }).success).toBe(false)
    expect(
      createBookingSchema.safeParse({
        type: 'appointment',
        business: 'glow-studio',
        serviceIds: [],
        staffId: null,
        date: '2026-10-15',
        start: 870,
      }).success,
    ).toBe(false)
  })

  it('reviews need stars; text is optional and short', () => {
    expect(reviewInputSchema.parse({ rating: 5 })).toEqual({ rating: 5, tags: [] })
    expect(reviewInputSchema.safeParse({ rating: 0 }).success).toBe(false)
    expect(reviewInputSchema.safeParse({ rating: 4, text: 'x'.repeat(501) }).success).toBe(false)
  })
})

describe('query strings', () => {
  it('search coerces text and applies defaults', () => {
    const q = searchQuerySchema.parse({ q: ' saç ', lat: '37.95', lng: '58.38', openNow: '1', bbox: '37.9,58.3,38.0,58.4' })
    expect(q).toMatchObject({
      // the market's main language (English for the first launch)
      lang: 'en',
      q: 'saç',
      lat: 37.95,
      r: 5,
      sort: 'distance',
      openNow: true,
      limit: 12,
      party: 2,
      bbox: [37.9, 58.3, 38, 58.4],
    })
    expect(searchQuerySchema.safeParse({ r: '7' }).success).toBe(false)
  })

  it('search: a position needs both lat and lng, and a map area needs min ≤ max', () => {
    expect(searchQuerySchema.safeParse({ lat: '37.95' }).success).toBe(false)
    expect(searchQuerySchema.safeParse({ lng: '58.38' }).success).toBe(false)
    expect(businessQuerySchema.safeParse({ lat: '37.95' }).success).toBe(false)
    expect(businessQuerySchema.safeParse({ lat: '37.95', lng: '58.38' }).success).toBe(true)
    expect(searchQuerySchema.safeParse({ bbox: '38.0,58.3,37.9,58.4' }).success).toBe(false)
    expect(searchQuerySchema.safeParse({ bbox: '37.9,58.4,38.0,58.3' }).success).toBe(false)
    expect(searchQuerySchema.safeParse({ bbox: '37.9,58.3,95,58.4' }).success).toBe(false)
    expect(searchQuerySchema.safeParse({ bbox: '37.9,58.3,37.9,58.4' }).success).toBe(true)
  })

  it('search: table times for up to the online party limit', () => {
    expect(searchQuerySchema.safeParse({ party: String(MAX_ONLINE_PARTY) }).success).toBe(true)
    expect(searchQuerySchema.safeParse({ party: String(MAX_ONLINE_PARTY + 1) }).success).toBe(false)
  })

  it('availability takes a comma list of services and a specialist or "any"', () => {
    expect(appointmentAvailabilityQuerySchema.parse({ services: `${ID},${ID2}` })).toMatchObject({
      services: [ID, ID2],
      staff: 'any',
      days: 14,
    })
    expect(appointmentAvailabilityQuerySchema.safeParse({ services: '' }).success).toBe(false)
  })

  it('a service listed twice in a link counts once', () => {
    expect(appointmentAvailabilityQuerySchema.parse({ services: `${ID},${ID2},${ID}` }).services).toEqual([ID, ID2])
  })

  it('the events cursor is `<txid>.<id>`; `after` still takes the old numeric form', () => {
    expect(eventsQuerySchema.parse({ after: '7421.318' }).after).toBe('7421.318')
    expect(eventsQuerySchema.safeParse({ after: '318' }).success).toBe(true)
    expect(eventsQuerySchema.safeParse({ after: 'abc' }).success).toBe(false)
    expect(eventsQuerySchema.safeParse({ after: '1.2.3' }).success).toBe(false)
    expect(eventsQuerySchema.safeParse({ after: '' }).success).toBe(false)
    expect(eventListSchema.safeParse({ items: [], cursor: '7421.318' }).success).toBe(true)
    expect(eventListSchema.safeParse({ items: [], cursor: 'garbage' }).success).toBe(false)
  })
})

describe('responses', () => {
  it('slot_taken carries at most the alternatives the domain gives', () => {
    const slot = { date: '2026-10-15', start: 600, end: 660 }
    expect(slotTakenDetailsSchema.safeParse({ alternatives: Array(MAX_ALTERNATIVES).fill(slot) }).success).toBe(true)
    expect(slotTakenDetailsSchema.safeParse({ alternatives: Array(MAX_ALTERNATIVES + 1).fill(slot) }).success).toBe(false)
  })

  it('a booking’s type lives in `what` only, so the two can’t disagree', () => {
    expect(Object.keys(bookingSummarySchema.shape)).not.toContain('type')
  })
})
