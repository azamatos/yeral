import { messages } from '@yeral/i18n'
import { describe, expect, it } from 'vitest'
import { verifyCodeSchema } from './account'
import { appointmentAvailabilityQuerySchema } from './availability'
import { createBookingSchema, reviewInputSchema } from './bookings'
import { searchQuerySchema } from './catalog'
import { ERROR_CODES } from './errors'

const ID = '0b6c8f0e-8a0b-4f5e-9d8a-1c2b3d4e5f60'

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
      createBookingSchema.safeParse({ type: 'table', business: 'bag-kafe', partySize: 9, areaId: ID, date: '2026-10-17', start: 1140 })
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
      lang: 'tk',
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

  it('availability takes a comma list of services and a specialist or "any"', () => {
    expect(appointmentAvailabilityQuerySchema.parse({ services: `${ID},${ID}` })).toMatchObject({
      services: [ID, ID],
      staff: 'any',
      days: 14,
    })
    expect(appointmentAvailabilityQuerySchema.safeParse({ services: '' }).success).toBe(false)
  })
})
