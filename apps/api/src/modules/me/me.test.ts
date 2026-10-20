import { addDays, today } from '@yeral/domain/time'
import { eq, inArray } from 'drizzle-orm'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { DEMO_NOW, testApp } from '../../../test/app'
import { browser, eventsAfter } from '../../../test/client'
import { testDatabase } from '../../../test/db'
import type { Db } from '../../db/client'
import { bookings, businesses, clientNotes, clients, invites, rateLimits, staff, users } from '../../db/schema'
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
    // only the market's languages can be chosen: Russian comes with the Turkmenistan launch
    expect((await b.req('/v1/me', { method: 'PATCH', body: { lang: 'ru' } })).status).toBe(400)
    const res = await b.req('/v1/me', { method: 'PATCH', body: { lang: 'en', notifications: { reminderDay: false } } })
    expect(res.json).toMatchObject({
      lang: 'en',
      notifications: { confirmation: true, reminderDay: false, reminder2h: true, reviewAsk: false },
    })
    // the review-ask switch is gone (book Q-259): accepted, ignored, still false
    const old = await b.req('/v1/me', { method: 'PATCH', body: { notifications: { reviewAsk: true } } })
    expect(old.status).toBe(200)
    expect(old.json.notifications.reviewAsk).toBe(false)
  })

  it('changing the phone needs a code on the new number, which must be free', async () => {
    const b = browser(t.app)
    await b.login('+99365222002', 'Kemal')
    expect((await b.req('/v1/me/phone/code', { body: { phone: '+99365901122' } })).json.error.code).toBe('phone_taken')
    expect((await b.req('/v1/me/phone/code', { body: { phone: '+99365222003' } })).status).toBe(200)
    expect(t.sms.sent.at(-1)).toEqual({ to: '+99365222003', text: 'Ýeral code: 1234', secret: true })
    const res = await b.req('/v1/me/phone/verify', { body: { phone: '+99365222003', code: '1234' } })
    expect(res.json.phone).toBe('+99365222003')
  })

  it('a changed phone takes the person’s business records along, made one with a record kept for the new number (book Q-171)', async () => {
    const [oldPhone, newPhone] = ['+99365222010', '+99365222011']
    const b = browser(t.app)
    const { me } = await b.login(oldPhone, 'Kerim')
    const slugs = await db
      .select()
      .from(businesses)
      .where(inArray(businesses.slug, ['glow-studio', 'barber-loft', 'ak-dis']))
    const [glow, barber, dentist] = ['glow-studio', 'barber-loft', 'ak-dis'].map((slug) => slugs.find((r) => r.slug === slug)!.id)
    const at = (days: number) => new Date(t.clock.now - days * 86_400_000)
    const [mine, theirs] = await db
      .insert(clients)
      .values([
        { businessId: glow!, phone: oldPhone, name: 'Kerim', userId: me.id, tags: ['vip'], noShowsSince: at(5) },
        // the business already wrote the new number down: a phone booking, a note, phone-only
        { businessId: glow!, phone: newPhone, name: 'Kerim (new)', tags: ['regular'], onlineBlocked: true },
      ])
      .returning()
    await db.insert(clientNotes).values({ clientId: theirs!.id, text: 'Prefers mornings' })
    const booking = (code: string, days: number, x: { clientId: string; phone: string; userId?: string }) => ({
      code,
      businessId: glow!,
      type: 'appointment' as const,
      date: addDays(today(t.clock.now), days),
      start: 600,
      end: 660,
      status: days < 0 ? ('completed' as const) : ('confirmed' as const),
      source: 'phone' as const,
      clientId: x.clientId,
      clientPhone: x.phone,
      userId: x.userId ?? null,
    })
    await db
      .insert(bookings)
      .values([
        booking('YR-995001', 2, { clientId: theirs!.id, phone: newPhone }),
        booking('YR-995002', 3, { clientId: mine!.id, phone: oldPhone, userId: me.id }),
        booking('YR-995003', -3, { clientId: mine!.id, phone: oldPhone, userId: me.id }),
      ])
    // on Barber Loft's team, and invited to Ak diş
    await db.insert(staff).values({ businessId: barber!, userId: me.id, name: 'Kerim', phone: oldPhone })
    const [row] = await db.insert(staff).values({ businessId: dentist!, name: 'Kerim', phone: oldPhone, status: 'invited' }).returning()
    await db.insert(invites).values({
      businessId: dentist!,
      staffId: row!.id,
      phone: oldPhone,
      tokenHash: 'q171-test-invite',
      sentAt: at(1),
      expiresAt: at(-6),
    })

    await b.req('/v1/me/phone/code', { body: { phone: newPhone } })
    expect((await b.req('/v1/me/phone/verify', { body: { phone: newPhone, code: '1234' } })).json.phone).toBe(newPhone)

    const records = await db.select().from(clients).where(eq(clients.businessId, glow!))
    const kerim = records.filter((r) => r.phone === newPhone || r.phone === oldPhone)
    expect(kerim).toHaveLength(1)
    expect(kerim[0]).toMatchObject({ id: mine!.id, phone: newPhone, userId: me.id, name: 'Kerim', onlineBlocked: true, noShowsSince: null })
    expect(kerim[0]!.tags.sort()).toEqual(['regular', 'vip'])
    expect((await db.select().from(clientNotes).where(eq(clientNotes.clientId, mine!.id))).map((n) => n.text)).toEqual(['Prefers mornings'])
    const moved = await db
      .select()
      .from(bookings)
      .where(inArray(bookings.code, ['YR-995001', 'YR-995002', 'YR-995003']))
    const byCode = (code: string) => moved.find((m) => m.code === code)!
    // the business's booking for the new number is the person's now; the visits ahead reach the new number
    expect(byCode('YR-995001')).toMatchObject({ clientId: mine!.id, userId: me.id, clientPhone: newPhone })
    expect(byCode('YR-995002')).toMatchObject({ clientId: mine!.id, clientPhone: newPhone })
    expect(byCode('YR-995003')).toMatchObject({ clientId: mine!.id, clientPhone: oldPhone })
    const [teamRow] = await db.select().from(staff).where(eq(staff.userId, me.id))
    expect(teamRow!.phone).toBe(newPhone)
    const [invite] = await db.select().from(invites).where(eq(invites.tokenHash, 'q171-test-invite'))
    expect(invite!.status).toBe('cancelled')
    expect((await db.select().from(users).where(eq(users.id, me.id)))[0]!.phone).toBe(newPhone)
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

  it('an owner can’t delete their account: a workspace always has its owner (book Q-213)', async () => {
    const b = browser(t.app)
    await b.login('+99365102030') // Maýsa owns Glow Studio
    const res = await b.req('/v1/me', { method: 'DELETE' })
    expect(res.status).toBe(409)
    expect(res.json.error.code).toBe('owns_workspace')
    expect((await b.req('/v1/me')).status).toBe(200)
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
    const res = await eventsAfter(b, cursor, (items) => items.length >= 2)
    expect(res.json.items.map((e: { type: string; bookingCode: string; business: string }) => [e.type, e.bookingCode, e.business])).toEqual(
      [
        ['booking.created', json.code, 'barber-loft'],
        ['booking.confirmed', json.code, 'barber-loft'],
      ],
    )
    expect((await b.req(`/v1/events?after=${res.json.cursor}`)).json.items).toEqual([])
    expect((await browser(t.app).req('/v1/events')).status).toBe(401)
    // a cursor past what Postgres can hold starts over instead of failing
    const far = await b.req('/v1/events?after=99999999999999999999.1')
    expect(far.status).toBe(200)
    expect(far.json.items).toEqual([])
  })

  it('the OpenAPI document lists every endpoint', async () => {
    const doc = (await (await t.app.request('/openapi.json')).json()) as { paths: Record<string, unknown> }
    expect(Object.keys(doc.paths).sort()).toEqual(
      [
        '/v1/auth/code',
        '/v1/auth/identity',
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
        '/v1/cities',
        '/v1/events',
        '/v1/health',
        '/v1/links/{token}',
        '/v1/links/{token}/code',
        '/v1/links/{token}/verify',
        '/v1/me',
        '/v1/me/bookings',
        '/v1/me/bookings/{code}',
        '/v1/me/bookings/{code}/accept-alternative',
        '/v1/me/bookings/{code}/cancel',
        '/v1/me/bookings/{code}/note',
        '/v1/me/bookings/{code}/reschedule',
        '/v1/me/bookings/{code}/restore',
        '/v1/me/bookings/{code}/review',
        '/v1/me/bookings/{code}/withdraw-move',
        '/v1/me/favorites',
        '/v1/me/favorites/{slug}',
        '/v1/me/phone/code',
        '/v1/me/phone/verify',
        '/v1/places/suggest',
        '/v1/search',
        '/v1/search/suggest',
        // the team (ADR 0025)
        '/v1/me/workspaces',
        '/v1/me/workspaces/{slug}/open',
        '/v1/me/invites',
        '/v1/me/invites/{id}/accept',
        '/v1/me/invites/{id}/decline',
        '/v1/invites/{token}',
        '/v1/w/{slug}/team',
        '/v1/w/{slug}/team/invites',
        '/v1/w/{slug}/team/phone-only',
        '/v1/w/{slug}/team/{staffId}',
        '/v1/w/{slug}/team/{staffId}/invite',
        '/v1/w/{slug}/team/{staffId}/remove',
        '/v1/w/{slug}/team/{staffId}/reactivate',
        '/v1/w/{slug}/leave',
      ].sort(),
    )
  })
})
