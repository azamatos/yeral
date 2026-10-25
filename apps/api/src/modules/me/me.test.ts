import { addDays, today } from '@yeral/domain/time'
import { eq, inArray } from 'drizzle-orm'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { DEMO_NOW, testApp } from '../../../test/app'
import { browser, eventsAfter } from '../../../test/client'
import { testDatabase } from '../../../test/db'
import type { Db } from '../../db/client'
import { bookingRules, bookings, businesses, clientNotes, clients, invites, rateLimits, reviews, staff, users } from '../../db/schema'
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

  it('profile: name and surname as two fields, the surname optional (book Q-156)', async () => {
    const b = browser(t.app)
    await b.login('+99365222030')
    const set = (body: Record<string, unknown>) => b.req('/v1/me', { method: 'PATCH', body })
    expect((await set({ firstName: 'Aýna', surname: 'Orazowa' })).json).toMatchObject({
      name: 'Aýna Orazowa',
      firstName: 'Aýna',
      surname: 'Orazowa',
    })
    expect((await set({ surname: null })).json).toMatchObject({ name: 'Aýna', firstName: 'Aýna', surname: null })
    // an older client's one field is split at the first space
    expect((await set({ name: 'Bahar Hojaýewa' })).json).toMatchObject({ firstName: 'Bahar', surname: 'Hojaýewa' })
    expect((await set({ name: 'Bahar', firstName: 'Bahar' })).status).toBe(400)
    // a first name of two words survives an older client sending back the whole name it read
    const two = (await set({ firstName: 'Ogul Bibi', surname: 'Orazowa' })).json
    expect((await set({ name: two.name, lang: 'en' })).json).toMatchObject({ firstName: 'Ogul Bibi', surname: 'Orazowa' })
    // a surname alone isn't a name; a part over 40 characters is refused
    const fresh = browser(t.app)
    await fresh.login('+99365222031')
    expect((await fresh.req('/v1/me', { method: 'PATCH', body: { surname: 'Orazowa' } })).status).toBe(400)
    expect((await set({ name: `Aýjemal ${'X'.repeat(41)}` })).status).toBe(400)
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

  it('no phone change while the sign-in code shows on the screen (book Q-036)', async () => {
    const on = testApp(db, { codeOnScreen: true })
    const b = browser(on.app)
    const { me } = await b.login('+99365222009', 'Merjen')
    // the sign-in's account says it too
    expect(me.canChangePhone).toBe(false)
    // the account says so before anyone taps "Change number"
    expect((await b.req('/v1/me')).json.canChangePhone).toBe(false)
    const off = browser(t.app)
    await off.login('+99365222009')
    expect((await off.req('/v1/me')).json.canChangePhone).toBe(true)
    const refused = await b.req('/v1/me/phone/code', { body: { phone: '+99365222010' } })
    expect(refused.status).toBe(409)
    expect(refused.json.error.code).toBe('phone_change_unavailable')
    expect(on.sms.sent.filter((m) => m.to === '+99365222010')).toEqual([])
    expect((await b.req('/v1/me/phone/verify', { body: { phone: '+99365222010', code: '1234' } })).json.error.code).toBe(
      'phone_change_unavailable',
    )
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
    const [mine, theirs, atBarber, earlierHolder, sinceSignIn] = await db
      .insert(clients)
      .values([
        // a block lifted 5 days ago, but the new number's record below is blocked by its count: that block stays
        { businessId: glow!, phone: oldPhone, name: 'Kerim', userId: me.id, tags: ['vip'], noShowsSince: at(5) },
        // the business already wrote the new number down: a phone booking, a note, phone-only
        { businessId: glow!, phone: newPhone, name: 'Kerim (new)', tags: ['regular'], onlineBlocked: true, createdAt: at(30) },
        { businessId: barber!, phone: oldPhone, name: 'Kerim', userId: me.id },
        // a year-old record of the new number's earlier holder: not Kerim's
        { businessId: barber!, phone: newPhone, name: 'Earlier holder', onlineBlocked: true, createdAt: at(365) },
        // a phone booking Ak diş made for the old number after Kerim last signed in
        { businessId: dentist!, phone: oldPhone, name: 'Kerim' },
      ])
      .returning()
    await db.insert(clientNotes).values({ clientId: theirs!.id, text: 'Prefers mornings' })
    // the new number's record is phone-only by its count: 2 no-shows at a limit of 2
    await db.update(bookingRules).set({ blockAfterNoShows: 2 }).where(eq(bookingRules.businessId, glow!))
    const booking = (code: string, days: number, x: { clientId: string; phone: string; userId?: string; businessId?: string }) => ({
      code,
      businessId: x.businessId ?? glow!,
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
        booking('YR-995004', 5, { clientId: sinceSignIn!.id, phone: oldPhone, businessId: dentist! }),
        { ...booking('YR-995005', -10, { clientId: theirs!.id, phone: newPhone }), status: 'noshow' as const, completedAt: at(10) },
        { ...booking('YR-995006', -11, { clientId: theirs!.id, phone: newPhone }), status: 'noshow' as const, completedAt: at(11) },
      ])
    // on Barber Loft's team, once on Glow Studio's, and invited to Ak diş
    await db.insert(staff).values([
      { businessId: barber!, userId: me.id, name: 'Kerim', phone: oldPhone },
      { businessId: glow!, userId: me.id, name: 'Kerim', phone: oldPhone, status: 'removed' as const },
    ])
    // an invite that brought back a row of Kerim's
    const [row] = await db
      .insert(staff)
      .values({ businessId: dentist!, userId: me.id, name: 'Kerim', phone: oldPhone, status: 'invited' })
      .returning()
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
    expect(kerim[0]).toMatchObject({
      id: mine!.id,
      phone: newPhone,
      userId: me.id,
      name: 'Kerim',
      onlineBlocked: true,
      noShowsSince: null,
    })
    expect(kerim[0]!.tags.sort()).toEqual(['regular', 'vip'])
    expect((await db.select().from(clientNotes).where(eq(clientNotes.clientId, mine!.id))).map((n) => n.text)).toEqual(['Prefers mornings'])
    const moved = await db
      .select()
      .from(bookings)
      .where(inArray(bookings.code, ['YR-995001', 'YR-995002', 'YR-995003', 'YR-995004']))
    const byCode = (code: string) => moved.find((m) => m.code === code)!
    // the business's booking for the new number is the person's now; the visits ahead reach the new number
    expect(byCode('YR-995001')).toMatchObject({ clientId: mine!.id, userId: me.id, clientPhone: newPhone })
    expect(byCode('YR-995002')).toMatchObject({ clientId: mine!.id, clientPhone: newPhone })
    expect(byCode('YR-995003')).toMatchObject({ clientId: mine!.id, clientPhone: oldPhone })
    // made for the old number since the last sign-in: Kerim's, and it moves with him
    expect(byCode('YR-995004')).toMatchObject({ clientId: sinceSignIn!.id, userId: me.id, clientPhone: newPhone })
    const byId = async (id: string) => (await db.select().from(clients).where(eq(clients.id, id)))[0]
    expect(await byId(sinceSignIn!.id)).toMatchObject({ phone: newPhone, userId: me.id })
    // Barber Loft: Kerim's record takes the number; the earlier holder's keeps its history without it
    expect(await byId(atBarber!.id)).toMatchObject({ phone: newPhone, userId: me.id, onlineBlocked: false })
    expect(await byId(earlierHolder!.id)).toMatchObject({ phone: null, userId: null, onlineBlocked: true })
    const team = await db.select().from(staff).where(eq(staff.userId, me.id))
    // a team Kerim left, or one that only invited him, doesn't learn the new number; the invited row is as it was before
    // the invite brought it back
    expect(team.find((r) => r.businessId === dentist)!.status).toBe('removed')
    expect(team.map((r) => [r.businessId, r.phone]).sort()).toEqual(
      [
        [barber, newPhone],
        [glow, oldPhone],
        [dentist, oldPhone],
      ].sort(),
    )
    const [invite] = await db.select().from(invites).where(eq(invites.tokenHash, 'q171-test-invite'))
    expect(invite!.status).toBe('cancelled')
    expect((await db.select().from(users).where(eq(users.id, me.id)))[0]!.phone).toBe(newPhone)
  })

  it('records made one keep a fresh start the business gave, when no count blocks either', async () => {
    const [oldPhone, newPhone] = ['+99365222012', '+99365222013']
    const b = browser(t.app)
    const { me } = await b.login(oldPhone, 'Leýla')
    const [pamyk] = await db.select().from(businesses).where(eq(businesses.slug, 'pamyk'))
    const at = (days: number) => new Date(t.clock.now - days * 86_400_000)
    const [mine] = await db
      .insert(clients)
      .values([
        // a no-show 10 days ago, forgiven 5 days ago
        { businessId: pamyk!.id, phone: oldPhone, name: 'Leýla', userId: me.id, noShowsSince: at(5) },
        { businessId: pamyk!.id, phone: newPhone, name: 'Leýla', createdAt: at(20) },
      ])
      .returning()
    await db.insert(bookings).values({
      code: 'YR-995007',
      businessId: pamyk!.id,
      type: 'appointment',
      date: addDays(today(t.clock.now), -10),
      start: 600,
      end: 660,
      status: 'noshow',
      completedAt: at(10),
      source: 'phone',
      clientId: mine!.id,
      clientPhone: oldPhone,
      userId: me.id,
    })
    await b.req('/v1/me/phone/code', { body: { phone: newPhone } })
    expect((await b.req('/v1/me/phone/verify', { body: { phone: newPhone, code: '1234' } })).status).toBe(200)
    const records = await db.select().from(clients).where(eq(clients.businessId, pamyk!.id))
    const leyla = records.filter((r) => r.phone === newPhone || r.phone === oldPhone)
    expect(leyla).toHaveLength(1)
    expect(leyla[0]).toMatchObject({ id: mine!.id, phone: newPhone, noShowsSince: at(5) })
  })

  it('the delete confirm counts what deleting touches: its bookings and requests ahead, those on its teams (book Q-172)', async () => {
    expect((await browser(t.app).req('/v1/me/deletion')).status).toBe(401)
    const fresh = browser(t.app)
    await fresh.login('+99365222077', 'Nobody')
    const none = { bookings: 0, requests: 0 }
    expect((await fresh.req('/v1/me/deletion')).json).toEqual({ ...none, team: none })
    // Aýjemal's demo: the request YR-48213 and two confirmed visits ahead; her history is past
    const ayjemal = browser(t.app)
    await ayjemal.login('+99365901122')
    expect((await ayjemal.req('/v1/me/deletion')).json).toEqual({ bookings: 2, requests: 1, team: none })
    // a specialist's visits stay with the business for its owner; an owner can't delete, as the deletion answers
    const ayna = browser(t.app)
    await ayna.login('+99365312210')
    expect(((await ayna.req('/v1/me/deletion')).json.team.bookings as number) > 0).toBe(true)
    const maysa = browser(t.app)
    await maysa.login('+99365102030')
    expect((await maysa.req('/v1/me/deletion')).json.error.code).toBe('owns_workspace')
  })

  it('deleting the account cancels upcoming bookings, deletes the reviews and signs out (book Q-172)', async () => {
    const b = browser(t.app)
    const { me } = await b.login('+99365222004', 'Aman')
    // visits yesterday at two businesses, reviewed
    const before = await db
      .select()
      .from(businesses)
      .where(inArray(businesses.slug, ['barber-loft', 'bag-kafe']))
    const visits = await db
      .insert(bookings)
      .values(
        before.map((biz, i) => ({
          code: `YR-99510${i + 1}`,
          businessId: biz.id,
          type: 'appointment' as const,
          date: addDays(today(t.clock.now), -1),
          start: 600,
          end: 660,
          status: 'completed' as const,
          completedAt: new Date(t.clock.now - 86_400_000),
          source: 'web' as const,
          clientPhone: '+99365222004',
          clientName: 'Aman',
          userId: me.id,
        })),
      )
      .returning()
    for (const v of visits) expect((await b.req(`/v1/me/bookings/${v.code}/review`, { body: { rating: 1 } })).status).toBe(200)
    const svc = (await b.req('/v1/businesses/barber-loft')).json.serviceGroups[0].services[0].id
    const { json } = await b.req('/v1/bookings', {
      body: { type: 'appointment', business: 'barber-loft', serviceIds: [svc], staffId: null, date: '2026-10-16', start: 660 },
    })
    expect(json.status).toBe('confirmed')
    expect((await b.req('/v1/me', { method: 'DELETE' })).status).toBe(204)
    expect((await b.req('/v1/me')).status).toBe(401)
    // the reviews are gone, and each rating is as it was before them: worked out from the stars
    const ids = visits.map((v) => v.id)
    expect(await db.select().from(reviews).where(inArray(reviews.bookingId, ids))).toEqual([])
    for (const biz of before) {
      const [after] = await db.select().from(businesses).where(eq(businesses.id, biz.id))
      const n = Object.values(biz.ratingBreakdown).reduce((s, x) => s + x, 0)
      const stars = Object.entries(biz.ratingBreakdown).reduce((s, [k, x]) => s + Number(k) * x, 0)
      expect(after).toMatchObject({
        reviewsCount: biz.reviewsCount,
        ratingBreakdown: biz.ratingBreakdown,
        rating: Math.round((stars / n) * 10) / 10,
      })
    }
    // the time is free again
    const other = browser(t.app)
    await other.login('+99365222005', 'Serdar')
    const again = await other.req('/v1/bookings', {
      body: { type: 'appointment', business: 'barber-loft', serviceIds: [svc], staffId: null, date: '2026-10-16', start: 660 },
    })
    expect(again.status).toBe(201)
  })

  it('a review sent twice at once is written once', async () => {
    const [cafe] = await db.select().from(businesses).where(eq(businesses.slug, 'bag-kafe'))
    const b = browser(t.app)
    const { me } = await b.login('+99365222022', 'Döwlet')
    await db.insert(bookings).values({
      code: 'YR-995210',
      businessId: cafe!.id,
      type: 'appointment',
      date: addDays(today(t.clock.now), -1),
      start: 600,
      end: 660,
      status: 'completed',
      completedAt: new Date(t.clock.now - 86_400_000),
      source: 'web',
      clientPhone: '+99365222022',
      userId: me.id,
    })
    const sent = await Promise.all([1, 2].map(() => b.req('/v1/me/bookings/YR-995210/review', { body: { rating: 4 } })))
    expect(sent.map((r) => r.status).sort()).toEqual([200, 409])
  })

  it('two reviews at once both count', async () => {
    const [cafe] = await db.select().from(businesses).where(eq(businesses.slug, 'bag-kafe'))
    const people = await Promise.all(
      ['+99365222020', '+99365222021'].map(async (phone, i) => {
        const b = browser(t.app)
        const { me } = await b.login(phone, `Guest ${i}`)
        await db.insert(bookings).values({
          code: `YR-99520${i}`,
          businessId: cafe!.id,
          type: 'appointment',
          date: addDays(today(t.clock.now), -1),
          start: 600,
          end: 660,
          status: 'completed',
          completedAt: new Date(t.clock.now - 86_400_000),
          source: 'web',
          clientPhone: phone,
          userId: me.id,
        })
        return { b, code: `YR-99520${i}` }
      }),
    )
    const [written] = await Promise.all([
      people[0]!.b.req(`/v1/me/bookings/${people[0]!.code}/review`, { body: { rating: 5 } }),
      people[1]!.b.req(`/v1/me/bookings/${people[1]!.code}/review`, { body: { rating: 3 } }),
    ]).then((rs) => [rs.map((r) => r.status)])
    expect(written).toEqual([200, 200])
    const [after] = await db.select().from(businesses).where(eq(businesses.id, cafe!.id))
    expect(after!.reviewsCount).toBe(cafe!.reviewsCount + 2)
    expect(after!.ratingBreakdown[5]).toBe(cafe!.ratingBreakdown[5] + 1)
    expect(after!.ratingBreakdown[3]).toBe(cafe!.ratingBreakdown[3] + 1)
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
        '/v1/auth/mode',
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
        '/v1/demo/session',
        '/v1/events',
        '/v1/events/stream',
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
        '/v1/w/{slug}/team/{staffId}/schedule',
        '/v1/w/{slug}/team/{staffId}/reactivate',
        '/v1/w/{slug}/team/{staffId}/services',
        '/v1/w/{slug}/leave',
        '/v1/w/{slug}/settings/rules',
        '/v1/w/{slug}/settings/statuses',
        '/v1/w/{slug}/settings/statuses/{id}',
        '/v1/w/{slug}/settings/profile',
        '/v1/w/{slug}/settings/hours',
        '/v1/w/{slug}/services',
        '/v1/w/{slug}/services/{serviceId}',
        '/v1/w/{slug}/services/{serviceId}/restore',
        '/v1/w/{slug}/services/groups',
        '/v1/w/{slug}/services/groups/{groupId}',
        '/v1/w/{slug}/services/order',
        '/v1/w/{slug}/requests',
        '/v1/w/{slug}/requests/{code}/confirm',
        '/v1/w/{slug}/requests/{code}/decline',
        '/v1/w/{slug}/free-times',
        '/v1/w/{slug}/bookings',
        '/v1/w/{slug}/bookings/export',
        '/v1/w/{slug}/calendar',
        '/v1/w/{slug}/calendar/blocks',
        '/v1/w/{slug}/calendar/blocks/{id}',
        '/v1/w/{slug}/bookings/{code}/undo',
        '/v1/w/{slug}/bookings/{code}/move',
        '/v1/w/{slug}/bookings/{code}/cancel',
        '/v1/w/{slug}/bookings/{code}/complaint',
        '/v1/w/{slug}/bookings/{code}/internal-status',
        '/v1/w/{slug}/clients',
        '/v1/w/{slug}/clients/lookup',
        '/v1/w/{slug}/clients/{id}',
        '/v1/w/{slug}/clients/{id}/notes',
        '/v1/w/{slug}/reviews',
        '/v1/w/{slug}/reviews/{id}/reply',
        '/v1/w/{slug}/reviews/{id}/report',
        '/v1/setup',
        '/v1/me/setup',
        '/v1/w/{slug}/setup',
        '/v1/w/{slug}/setup/finish',
        '/v1/w/{slug}/setup/services',
        '/v1/w/{slug}/setup/team',
        '/v1/me/photo',
        '/v1/w/{slug}/settings/address-search',
        '/v1/page-address',
        '/v1/w/{slug}/settings/page-address',
        '/v1/w/{slug}/settings/logo',
        '/v1/me/deletion',
        '/v1/me/how-was-it',
        '/v1/me/bookings/{code}/how-was-it/close',
        '/v1/w/{slug}/settings/photos',
        '/v1/w/{slug}/settings/photos/{id}',
        '/v1/w/{slug}/settings/photos/order',
        '/v1/w/{slug}/team/{staffId}/photo',
        '/v1/admin/sign-in',
        '/v1/admin/sign-out',
        '/v1/admin/me',
        '/v1/admin/me/password',
        '/v1/admin/me/recovery-codes',
        '/v1/admin/setup/{token}',
        '/v1/admin/setup/{token}/password',
        '/v1/admin/setup/{token}/confirm',
        '/v1/admin/team',
        '/v1/admin/team/{id}/reset',
        '/v1/admin/team/{id}/disable',
        '/v1/admin/businesses',
        '/v1/admin/businesses/{id}',
        '/v1/admin/businesses/{id}/verify',
        '/v1/admin/businesses/{id}/reject',
        '/v1/admin/businesses/{id}/hide',
        '/v1/admin/businesses/{id}/show',
        '/v1/admin/businesses/{id}/close',
        '/v1/admin/businesses/{id}/reopen',
        '/v1/w/{slug}/verification',
        '/v1/admin/reviews',
        '/v1/admin/reviews/{id}/clear',
        '/v1/admin/reviews/{id}/remove',
        '/v1/sitemap',
      ].sort(),
    )
  })
})
