/** A phone's history and a number that passes to someone else (book Q-270). */
import { addDays, today } from '@yeral/domain/time'
import { eq, inArray } from 'drizzle-orm'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { DEMO_NOW, testApp } from '../../../test/app'
import { browser } from '../../../test/client'
import { testDatabase } from '../../../test/db'
import type { Db } from '../../db/client'
import { bookings, businesses, clients, favorites, invites, rateLimits, staff, users } from '../../db/schema'
import { seed } from '../../db/seed'
import { newBookingLink } from '../bookings/links'

const DAY = 86_400_000
const TODAY = today(DEMO_NOW)
const tokenOf = (url: string) => /\/l\/([\w-]+)/.exec(url)?.[1] ?? ''

describe('linking by phone and "Is this you?" (book Q-270)', () => {
  let db: Db
  let t: ReturnType<typeof testApp>
  let glowId: string
  let barberId: string
  let dentistId: string

  beforeAll(async () => {
    ;({ db } = await testDatabase())
    await seed(db, { demo: true, now: DEMO_NOW })
    const rows = await db
      .select()
      .from(businesses)
      .where(inArray(businesses.slug, ['glow-studio', 'barber-loft', 'ak-dis']))
    const id = (slug: string) => rows.find((r) => r.slug === slug)!.id
    ;[glowId, barberId, dentistId] = [id('glow-studio'), id('barber-loft'), id('ak-dis')]
  })

  beforeEach(async () => {
    await db.delete(rateLimits)
    t = testApp(db)
  })

  /** A booking a business made by phone (no items: nothing here needs its time taken). */
  async function phoneBooking(x: { code: string; businessId: string; phone: string; date: string; clientId?: string; userId?: string }) {
    const past = x.date < TODAY
    const [row] = await db
      .insert(bookings)
      .values({
        code: x.code,
        businessId: x.businessId,
        type: 'appointment',
        date: x.date,
        start: 600,
        end: 660,
        status: past ? 'completed' : 'confirmed',
        source: 'phone',
        clientPhone: x.phone,
        clientName: 'Phone client',
        clientId: x.clientId ?? null,
        userId: x.userId ?? null,
      })
      .returning()
    return row!
  }

  /** An account last used `daysAgo` days before the demo's now. */
  async function account(phone: string, name: string, daysAgo: number) {
    const [row] = await db
      .insert(users)
      .values({ phone, name, lang: 'en', lastSeenAt: new Date(DEMO_NOW - daysAgo * DAY) })
      .returning()
    return row!
  }

  async function codeAndVerify(phone: string) {
    const b = browser(t.app)
    await b.req('/v1/auth/code', { body: { phone } })
    return { b, res: await b.req('/v1/auth/verify', { body: { phone, code: '1234' } }) }
  }

  it('signing in links a phone’s bookings and client records only if upcoming or from the last 6 months', async () => {
    const phone = '+99365777001'
    const [oldRecord, recentRecord, oldButBooked] = await db
      .insert(clients)
      .values([
        { businessId: glowId, phone, name: 'Earlier holder', createdAt: new Date(DEMO_NOW - 300 * DAY) },
        { businessId: barberId, phone, name: 'Phone client', createdAt: new Date(DEMO_NOW - 10 * DAY) },
        { businessId: dentistId, phone, name: 'Phone client', createdAt: new Date(DEMO_NOW - 300 * DAY) },
      ])
      .returning()
    const old = await phoneBooking({ code: 'YR-994001', businessId: glowId, phone, date: addDays(TODAY, -200), clientId: oldRecord!.id })
    const recent = await phoneBooking({ code: 'YR-994002', businessId: glowId, phone, date: addDays(TODAY, -100) })
    const ahead = await phoneBooking({
      code: 'YR-994003',
      businessId: dentistId,
      phone,
      date: addDays(TODAY, 3),
      clientId: oldButBooked!.id,
    })
    const { me } = await browser(t.app).login(phone, 'Nazik')
    const rows = await db
      .select()
      .from(bookings)
      .where(inArray(bookings.id, [old.id, recent.id, ahead.id]))
    const owner = (id: string) => rows.find((r) => r.id === id)!.userId
    expect([owner(old.id), owner(recent.id), owner(ahead.id)]).toEqual([null, me.id, me.id])
    const records = await db.select().from(clients).where(eq(clients.phone, phone))
    const linked = (id: string) => records.find((r) => r.id === id)!.userId
    // an old record joins only through a booking that joined
    expect([linked(oldRecord!.id), linked(recentRecord!.id), linked(oldButBooked!.id)]).toEqual([null, me.id, me.id])
  })

  it('an account unused for 6 months asks "Is this you?" with its first name; yes signs in to it', async () => {
    const phone = '+99365777002'
    const old = await account(phone, 'Bahar Orazowa', 200)
    const { b, res } = await codeAndVerify(phone)
    expect(res.status).toBe(202)
    expect(res.json).toEqual({ isThisYou: { name: 'Bahar', ticket: expect.any(String) } })
    // nobody is signed in yet
    expect(b.cookie).toBe('')
    expect((await b.req('/v1/me')).status).toBe(401)
    const yes = await b.req('/v1/auth/identity', { body: { ticket: res.json.isThisYou.ticket, yes: true } })
    expect(yes.status).toBe(200)
    expect(yes.json).toMatchObject({ me: { id: old.id, name: 'Bahar Orazowa' }, isNew: false })
    expect((await b.req('/v1/me')).status).toBe(200)
    // a ticket answers once
    const again = await browser(t.app).req('/v1/auth/identity', { body: { ticket: res.json.isThisYou.ticket, yes: true } })
    expect(again.json.error.code).toBe('code_expired')
    // used now: the next sign-in doesn't ask
    t.clock.now += 60_000
    expect((await codeAndVerify(phone)).res.status).toBe(200)
  })

  it('one answer settles the question: the account’s other open tickets stop working', async () => {
    const phone = '+99365777006'
    await account(phone, 'Aýna', 200)
    const first = (await codeAndVerify(phone)).res.json.isThisYou.ticket
    t.clock.now += 60_000
    const second = await codeAndVerify(phone)
    expect((await second.b.req('/v1/auth/identity', { body: { ticket: second.res.json.isThisYou.ticket, yes: true } })).status).toBe(200)
    // a "No" from the other ticket can't let go the account just confirmed
    const no = await browser(t.app).req('/v1/auth/identity', { body: { ticket: first, yes: false } })
    expect(no.json.error.code).toBe('code_expired')
    expect(await db.select().from(users).where(eq(users.phone, phone))).toHaveLength(1)
  })

  it('an account without a name is asked by the name on its bookings; one holding nothing starts afresh', async () => {
    const named = await db
      .insert(users)
      .values({ phone: '+99365777007', lang: 'en', lastSeenAt: new Date(DEMO_NOW - 200 * DAY) })
      .returning()
    const booked = await phoneBooking({
      code: 'YR-994008',
      businessId: barberId,
      phone: '+99365777007',
      date: addDays(TODAY, -20),
      userId: named[0]!.id,
    })
    await db.update(bookings).set({ clientName: 'Gülşat Ataýewa' }).where(eq(bookings.id, booked.id))
    const asked = await codeAndVerify('+99365777007')
    expect(asked.res.status).toBe(202)
    expect(asked.res.json.isThisYou.name).toBe('Gülşat')
    // a booking without a name: asked all the same, without one
    const [unnamed] = await db
      .insert(users)
      .values({ phone: '+99365777010', lang: 'en', lastSeenAt: new Date(DEMO_NOW - 200 * DAY) })
      .returning()
    const ahead = await phoneBooking({
      code: 'YR-994010',
      businessId: barberId,
      phone: '+99365777010',
      date: addDays(TODAY, 30),
      userId: unnamed!.id,
    })
    await db.update(bookings).set({ clientName: null }).where(eq(bookings.id, ahead.id))
    const nameless = await codeAndVerify('+99365777010')
    expect(nameless.res.status).toBe(202)
    expect(nameless.res.json.isThisYou.name).toBeNull()
    const [bare] = await db
      .insert(users)
      .values({ phone: '+99365777008', lang: 'en', lastSeenAt: new Date(DEMO_NOW - 200 * DAY) })
      .returning()
    await db.insert(favorites).values({ userId: bare!.id, businessId: glowId })
    const fresh = await codeAndVerify('+99365777008')
    expect(fresh.res.status).toBe(200)
    expect(fresh.res.json.me.id).not.toBe(bare!.id)
    expect((await fresh.b.req('/v1/me/favorites')).json.items).toEqual([])
  })

  it('"No" lets the old account go and starts a fresh one; what was sent to the number lately stays the holder’s', async () => {
    const phone = '+99365777003'
    const old = await account(phone, 'Earlier Holder', 400)
    const [record] = await db.insert(clients).values({ businessId: glowId, phone, name: 'Earlier Holder', userId: old.id }).returning()
    const past = await phoneBooking({
      code: 'YR-994004',
      businessId: glowId,
      phone,
      date: addDays(TODAY, -30),
      clientId: record!.id,
      userId: old.id,
    })
    const ahead = await phoneBooking({
      code: 'YR-994005',
      businessId: glowId,
      phone,
      date: addDays(TODAY, 4),
      clientId: record!.id,
      userId: old.id,
    })
    // made for the number's holder now: a phone booking with its SMS link, one Glow filed under the old record, and a
    // team invite; and an invite that brought back the old account's own team row
    const lately = await phoneBooking({ code: 'YR-994007', businessId: barberId, phone, date: addDays(TODAY, 6) })
    const filed = await phoneBooking({ code: 'YR-994009', businessId: glowId, phone, date: addDays(TODAY, 8), clientId: record!.id })
    const [oldRow] = await db
      .insert(staff)
      .values({ businessId: barberId, userId: old.id, name: 'Earlier', phone, status: 'invited' })
      .returning()
    await db.insert(invites).values({
      businessId: barberId,
      staffId: oldRow!.id,
      phone,
      tokenHash: 'q270-reused-invite',
      sentAt: new Date(DEMO_NOW - DAY),
      expiresAt: new Date(DEMO_NOW + 6 * DAY),
    })
    const link = await newBookingLink(db, t.deps.site, lately, phone, DEMO_NOW)
    const [row] = await db.insert(staff).values({ businessId: dentistId, name: 'Täze', phone, status: 'invited' }).returning()
    await db.insert(invites).values({
      businessId: dentistId,
      staffId: row!.id,
      phone,
      tokenHash: 'q270-test-invite',
      sentAt: new Date(DEMO_NOW - DAY),
      expiresAt: new Date(DEMO_NOW + 6 * DAY),
    })
    const { b, res } = await codeAndVerify(phone)
    const no = await b.req('/v1/auth/identity', { body: { ticket: res.json.isThisYou.ticket, yes: false } })
    expect(no.status).toBe(200)
    expect(no.json).toMatchObject({ me: { phone, name: null }, isNew: true })
    expect(no.json.me.id).not.toBe(old.id)
    expect(await db.select().from(users).where(eq(users.id, old.id))).toEqual([])
    // the old history stays with the business, never with the new person; the visit ahead isn't cancelled
    const rows = await db
      .select()
      .from(bookings)
      .where(inArray(bookings.id, [past.id, ahead.id]))
    for (const row of rows) expect(row).toMatchObject({ userId: null, accountDeletedAt: expect.any(Date), clientId: record!.id })
    expect(rows.find((r) => r.id === ahead.id)!.status).toBe('confirmed')
    expect((await b.req('/v1/me/bookings?tab=past')).json.items).toEqual([])
    // the business's record of the earlier holder keeps its history without the number: it never joins the new one
    const [kept] = await db.select().from(clients).where(eq(clients.id, record!.id))
    expect(kept).toMatchObject({ phone: null, userId: null, name: 'Earlier Holder' })
    // the new holder's own: the phone booking joined and its link works, the invite waits for them
    const [joined] = await db.select().from(bookings).where(eq(bookings.id, lately.id))
    expect(joined!.userId).toBe(no.json.me.id)
    expect((await b.req(`/v1/links/${tokenOf(link.url)}`)).json).toMatchObject({ owner: true })
    const [invite] = await db.select().from(invites).where(eq(invites.tokenHash, 'q270-test-invite'))
    expect(invite!.status).toBe('pending')
    // Glow's booking for the number is the new holder's, on a record of the number of its own
    const [moved] = await db.select().from(bookings).where(eq(bookings.id, filed.id))
    expect(moved!.clientId).not.toBe(record!.id)
    const [own] = await db.select().from(clients).where(eq(clients.id, moved!.clientId!))
    expect(own).toMatchObject({ phone, userId: no.json.me.id, businessId: glowId })
    expect(moved!.userId).toBe(no.json.me.id)
    // the old account's team row keeps its history without the number, and its invite is gone with it
    const [left] = await db.select().from(staff).where(eq(staff.id, oldRow!.id))
    expect(left).toMatchObject({ status: 'removed', phone: null, userId: null })
    const [reused] = await db.select().from(invites).where(eq(invites.tokenHash, 'q270-reused-invite'))
    expect(reused!.status).toBe('cancelled')
  })

  it('an invite to an unused account’s number doesn’t bring back its old team row, which stays out after "No"', async () => {
    const phone = '+99365777011'
    const old = await account(phone, 'Old Stylist', 200)
    const [oldRow] = await db
      .insert(staff)
      .values({ businessId: glowId, userId: old.id, name: 'Old Stylist', phone, status: 'removed' })
      .returning()
    await db
      .update(users)
      .set({ lastSeenAt: new Date(t.clock.now) })
      .where(eq(users.phone, '+99365102030'))
    const maysa = browser(t.app)
    await maysa.login('+99365102030') // Glow Studio's owner
    const sent = await maysa.req('/v1/w/glow-studio/team/invites', { body: { phone, name: 'New Person', level: 'specialist' } })
    expect(sent.status).toBe(201)
    expect(sent.json.member.id).not.toBe(oldRow!.id)
    const { b, res } = await codeAndVerify(phone)
    expect((await b.req('/v1/auth/identity', { body: { ticket: res.json.isThisYou.ticket, yes: false } })).status).toBe(200)
    // the invite to the number waits for its holder; the old row has no number left to invite
    expect((await db.select().from(invites).where(eq(invites.staffId, sent.json.member.id)))[0]!.status).toBe('pending')
    const back = await maysa.req(`/v1/w/glow-studio/team/${oldRow!.id}/reactivate`, { method: 'POST' })
    expect(back.json.error.code).toBe('invalid_status')
  })

  it('a workspace owner’s account can’t be let go: "No" is refused and the question stays', async () => {
    const phone = '+99365102030' // Maýsa owns Glow Studio
    await db
      .update(users)
      .set({ lastSeenAt: new Date(DEMO_NOW - 200 * DAY) })
      .where(eq(users.phone, phone))
    const { b, res } = await codeAndVerify(phone)
    expect(res.json.isThisYou.name).toBe('Maýsa')
    const no = await b.req('/v1/auth/identity', { body: { ticket: res.json.isThisYou.ticket, yes: false } })
    expect(no.status).toBe(409)
    expect(no.json.error.code).toBe('owns_workspace')
    const yes = await b.req('/v1/auth/identity', { body: { ticket: res.json.isThisYou.ticket, yes: true } })
    expect(yes.json.me).toMatchObject({ phone, hasBusiness: true })
  })

  it('the link page asks too, and an answer waits 10 minutes at most', async () => {
    const phone = '+99365777004'
    const old = await account(phone, 'Selbi', 190)
    const row = await phoneBooking({ code: 'YR-994006', businessId: barberId, phone, date: addDays(TODAY, 2), userId: old.id })
    const link = await newBookingLink(db, t.deps.site, row, phone, DEMO_NOW)
    const visitor = browser(t.app)
    await visitor.req(`/v1/links/${tokenOf(link.url)}/code`, { body: {} })
    const res = await visitor.req(`/v1/links/${tokenOf(link.url)}/verify`, { body: { code: '1234' } })
    expect(res.status).toBe(202)
    expect(res.json.isThisYou.name).toBe('Selbi')
    t.clock.now += 11 * 60_000
    const late = await visitor.req('/v1/auth/identity', { body: { ticket: res.json.isThisYou.ticket, yes: true } })
    expect(late.json.error.code).toBe('code_expired')
    expect((await visitor.req('/v1/me')).status).toBe(401)
  })

  it('a session in use counts: the account is marked as used once a day', async () => {
    const phone = '+99365777005'
    const b = browser(t.app)
    const { me } = await b.login(phone, 'Merjen')
    await db
      .update(users)
      .set({ lastSeenAt: new Date(DEMO_NOW - 200 * DAY) })
      .where(eq(users.id, me.id))
    expect((await b.req('/v1/me')).status).toBe(200)
    const [row] = await db.select().from(users).where(eq(users.id, me.id))
    expect(row!.lastSeenAt.getTime()).toBe(t.clock.now)
    t.clock.now += 60_000
    expect((await codeAndVerify(phone)).res.status).toBe(200)
  })
})
