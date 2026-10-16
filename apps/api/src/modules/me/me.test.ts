import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { DEMO_NOW, testApp } from '../../../test/app'
import { browser, eventsAfter } from '../../../test/client'
import { testDatabase } from '../../../test/db'
import type { Db } from '../../db/client'
import { rateLimits } from '../../db/schema'
import { seed } from '../../db/seed'

describe('account', () => {
  let db: Db
  let t: ReturnType<typeof testApp>
  beforeAll(async () => {
    ;({ db } = await testDatabase())
    await seed(db, { demo: true, now: DEMO_NOW })
  })
  beforeEach(async () => {
    await db.delete(rateLimits)
    t = testApp(db)
  })

  it('favourites: the demo four, add and remove', async () => {
    const b = browser(t.app)
    await b.login('+99365901122')
    const favs = await b.req('/v1/me/favorites')
    expect(favs.json.items.map((x: { slug: string }) => x.slug).sort()).toEqual(['ak-dis', 'aydyn-yoga', 'bag-kafe', 'glow-studio'])
    expect((await b.req('/v1/me/favorites/pamyk', { method: 'PUT' })).status).toBe(204)
    expect((await b.req('/v1/me/favorites/pamyk', { method: 'PUT' })).status).toBe(204)
    expect((await b.req('/v1/me/favorites')).json.items[0].slug).toBe('pamyk')
    expect((await b.req('/v1/me/favorites/pamyk', { method: 'DELETE' })).status).toBe(204)
    expect((await b.req('/v1/me/favorites/nope', { method: 'PUT' })).status).toBe(404)
  })

  it('profile: language and SMS switches', async () => {
    const b = browser(t.app)
    await b.login('+99365222001', 'Nurana')
    const res = await b.req('/v1/me', { method: 'PATCH', body: { lang: 'ru', notifications: { reminderDay: false } } })
    expect(res.json).toMatchObject({
      lang: 'ru',
      notifications: { confirmation: true, reminderDay: false, reminder2h: true, reviewAsk: true },
    })
  })

  it('changing the phone needs a code on the new number, which must be free', async () => {
    const b = browser(t.app)
    await b.login('+99365222002', 'Kemal')
    expect((await b.req('/v1/me/phone/code', { body: { phone: '+99365901122' } })).json.error.code).toBe('phone_taken')
    expect((await b.req('/v1/me/phone/code', { body: { phone: '+99365222003' } })).status).toBe(200)
    expect(t.sms.sent.at(-1)).toEqual({ to: '+99365222003', text: 'Ýeral kody: 1234' })
    const res = await b.req('/v1/me/phone/verify', { body: { phone: '+99365222003', code: '1234' } })
    expect(res.json.phone).toBe('+99365222003')
  })

  it('deleting the account cancels upcoming bookings and signs out', async () => {
    const b = browser(t.app)
    await b.login('+99365222004', 'Aman')
    const svc = (await b.req('/v1/businesses/barber-loft')).json.serviceGroups[0].services[0].id
    const { json } = await b.req('/v1/bookings', {
      body: { type: 'appointment', business: 'barber-loft', serviceIds: [svc], staffId: null, date: '2026-10-16', start: 660 },
    })
    expect(json.status).toBe('confirmed')
    expect((await b.req('/v1/me', { method: 'DELETE' })).status).toBe(204)
    expect((await b.req('/v1/me')).status).toBe(401)
    // the time is free again
    const other = browser(t.app)
    await other.login('+99365222005', 'Serdar')
    const again = await other.req('/v1/bookings', {
      body: { type: 'appointment', business: 'barber-loft', serviceIds: [svc], staffId: null, date: '2026-10-16', start: 660 },
    })
    expect(again.status).toBe(201)
  })

  it('events: a client polls changes to their bookings from a cursor', async () => {
    const b = browser(t.app)
    await b.login('+99365222006', 'Jemal')
    expect((await b.req('/v1/events?after=0')).json.items).toEqual([])
    const { cursor } = (await b.req('/v1/events')).json
    const svc = (await b.req('/v1/businesses/barber-loft')).json.serviceGroups[0].services[0].id
    const { json } = await b.req('/v1/bookings', {
      body: { type: 'appointment', business: 'barber-loft', serviceIds: [svc], staffId: null, date: '2026-10-16', start: 900 },
    })
    const res = await eventsAfter(b, cursor)
    expect(res.json.items.map((e: { type: string; bookingCode: string; business: string }) => [e.type, e.bookingCode, e.business])).toEqual(
      [
        ['booking.created', json.code, 'barber-loft'],
        ['booking.confirmed', json.code, 'barber-loft'],
      ],
    )
    expect((await b.req(`/v1/events?after=${res.json.cursor}`)).json.items).toEqual([])
    expect((await browser(t.app).req('/v1/events')).status).toBe(401)
  })

  it('the OpenAPI document lists every client endpoint', async () => {
    const doc = (await (await t.app.request('/openapi.json')).json()) as { paths: Record<string, unknown> }
    expect(Object.keys(doc.paths).sort()).toEqual(
      [
        '/v1/auth/code',
        '/v1/auth/logout',
        '/v1/auth/verify',
        '/v1/bookings',
        '/v1/businesses/{slug}',
        '/v1/businesses/{slug}/availability',
        '/v1/businesses/{slug}/reviews',
        '/v1/businesses/{slug}/sessions',
        '/v1/businesses/{slug}/specialists/availability',
        '/v1/businesses/{slug}/tables',
        '/v1/categories',
        '/v1/events',
        '/v1/health',
        '/v1/me',
        '/v1/me/bookings',
        '/v1/me/bookings/{code}',
        '/v1/me/bookings/{code}/accept-alternative',
        '/v1/me/bookings/{code}/cancel',
        '/v1/me/bookings/{code}/note',
        '/v1/me/bookings/{code}/reschedule',
        '/v1/me/bookings/{code}/restore',
        '/v1/me/bookings/{code}/review',
        '/v1/me/favorites',
        '/v1/me/favorites/{slug}',
        '/v1/me/phone/code',
        '/v1/me/phone/verify',
        '/v1/places/ip',
        '/v1/places/suggest',
        '/v1/search',
        '/v1/search/suggest',
      ].sort(),
    )
  })
})
