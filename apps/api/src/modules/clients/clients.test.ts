/** "Müşderiler" (book B-32, B-34, B-23's lookup): the list, the drawer's matches and the card, as each level sees them. */
import { addDays, today } from '@yeral/domain/time'
import { and, eq } from 'drizzle-orm'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { DEMO_NOW, testApp } from '../../../test/app'
import { browser } from '../../../test/client'
import { testDatabase } from '../../../test/db'
import type { Db } from '../../db/client'
import { bookingItems, bookings, businesses, clientNotes, clients, rateLimits, services, staff } from '../../db/schema'
import { seed } from '../../db/seed'

const MAYSA = '+99365102030' // owner of Glow Studio
const SELBI = '+99365884102' // administrator
const MARAL = '+99361440819' // specialist: nails
const W = '/v1/w/glow-studio'
const TODAY = today(DEMO_NOW)

interface Row {
  id: string
  name: string | null
  phone: string | null
  segments: string[]
  phoneOnly: boolean
  visits: number
  lastVisit: string | null
  total: number | null
  next: { code: string; status: string } | null
}

describe('clients (book B-32, B-34)', () => {
  let db: Db
  let t: ReturnType<typeof testApp>
  let glowId: string
  let manicure: string
  let haircut: string
  let maralId: string
  let aynaId: string
  let maysaId: string
  let regular: string
  let lapsed: string
  let fresh: string
  let seq = 0

  /** A booking of the client's with one service and specialist, on a late hour nobody else books. */
  async function booking(x: {
    clientId: string
    date: string
    status: 'completed' | 'confirmed' | 'noshow' | 'cancelled' | 'pending'
    staffId: string
    serviceId: string
    /** null: a booking without a price. */
    price?: number | null
    rescheduleOf?: string
    complaint?: 'late'
  }) {
    const code = `YR-77${String(++seq).padStart(4, '0')}`
    const [row] = await db
      .insert(bookings)
      .values({
        code,
        businessId: glowId,
        type: 'appointment',
        clientId: x.clientId,
        clientName: 'Client',
        clientPhone: '+99365900000',
        date: x.date,
        start: 1380,
        end: 1410,
        status: x.status,
        source: 'phone',
        priceType: x.price === null ? null : 'fixed',
        priceAmount: x.price === null ? null : (x.price ?? 100),
        rescheduleOf: x.rescheduleOf ?? null,
        holdUntil: x.status === 'pending' ? new Date(DEMO_NOW + 3_600_000) : null,
        ...(x.complaint ? { complaintType: x.complaint, complaintAt: new Date(DEMO_NOW - 86_400_000), complaintBy: maysaId } : {}),
      })
      .returning()
    await db.insert(bookingItems).values({
      bookingId: row!.id,
      serviceId: x.serviceId,
      serviceName: { en: x.serviceId === manicure ? 'Manicure' : "Women's haircut" },
      staffId: x.staffId,
      date: x.date,
      start: 1380,
      end: 1410,
      priceType: 'fixed',
      priceAmount: x.price ?? 100,
    })
    return code
  }

  beforeAll(async () => {
    ;({ db } = await testDatabase())
    await seed(db, { demo: true, now: DEMO_NOW })
    const [glow] = await db.select().from(businesses).where(eq(businesses.slug, 'glow-studio'))
    glowId = glow!.id
    const menu = await db.select().from(services).where(eq(services.businessId, glowId))
    manicure = menu.find((s) => s.name.en === 'Manicure')!.id
    haircut = menu.find((s) => s.name.en === "Women's haircut")!.id
    const person = async (name: string) =>
      (
        await db
          .select()
          .from(staff)
          .where(and(eq(staff.businessId, glowId), eq(staff.name, name)))
      )[0]!.id
    ;[maralId, aynaId, maysaId] = [await person('Maral'), await person('Aýna'), await person('Maýsa')]
    const made = await db
      .insert(clients)
      .values([
        { businessId: glowId, phone: '+99365900001', name: 'Test Regular', createdAt: new Date(DEMO_NOW - 200 * 86_400_000) },
        { businessId: glowId, phone: '+99365900002', name: 'Test Lapsed', createdAt: new Date(DEMO_NOW - 300 * 86_400_000) },
        { businessId: glowId, phone: '+99365900003', name: null, createdAt: new Date(DEMO_NOW - 20 * 86_400_000) },
      ])
      .returning()
    ;[regular, lapsed, fresh] = made.map((c) => c.id) as [string, string, string]
    // regular: three visits with Maral in 6 months (one still stored confirmed: it ended), one ahead
    await booking({ clientId: regular, date: addDays(TODAY, -100), status: 'completed', staffId: maralId, serviceId: manicure })
    await booking({ clientId: regular, date: addDays(TODAY, -40), status: 'completed', staffId: maralId, serviceId: manicure })
    await booking({ clientId: regular, date: addDays(TODAY, -5), status: 'confirmed', staffId: maralId, serviceId: manicure })
    await booking({ clientId: regular, date: addDays(TODAY, -3), status: 'cancelled', staffId: maralId, serviceId: haircut })
    await booking({ clientId: regular, date: addDays(TODAY, 2), status: 'confirmed', staffId: maralId, serviceId: manicure })
    // lapsed: one visit with Aýna 90 days ago, reported late
    await booking({
      clientId: lapsed,
      date: addDays(TODAY, -90),
      status: 'completed',
      staffId: aynaId,
      serviceId: haircut,
      price: 80,
      complaint: 'late',
    })
    // new: a first visit 10 days ago
    await booking({ clientId: fresh, date: addDays(TODAY, -10), status: 'completed', staffId: aynaId, serviceId: haircut, price: 80 })
    await booking({ clientId: fresh, date: addDays(TODAY, -12), status: 'completed', staffId: aynaId, serviceId: haircut, price: null })
    await db.insert(clientNotes).values({ clientId: regular, text: 'Allergic to acetone', alert: true, authorStaffId: maysaId })
    await db.update(clients).set({ onlineBlocked: true }).where(eq(clients.id, fresh))
  })
  beforeEach(async () => {
    await db.delete(rateLimits)
    t = testApp(db)
  })
  const as = async (phone: string) => {
    const b = browser(t.app)
    await b.login(phone)
    return b
  }
  const list = async (b: ReturnType<typeof browser>, query: string) =>
    (await b.req(`${W}/clients?${query}`)).json as {
      items: Row[]
      total: number
      cursor: string | null
      counts: Record<'all' | 'regular' | 'new' | 'lapsed' | 'flagged', number>
    }

  it('the most recently seen first, by number or name, with the chips; the owner sees totals, an administrator doesn’t', async () => {
    const maysa = await as(MAYSA)
    const found = await list(maysa, 'q=659000')
    expect(found.items.map((r) => r.id)).toEqual([regular, fresh, lapsed])
    expect(found.total).toBe(3)
    const [r, f, l] = found.items
    // the visit that ended counts; the cancelled one and the one ahead don't
    expect(r).toMatchObject({
      name: 'Test Regular',
      visits: 3,
      total: 300,
      segments: ['regular'],
      lastVisit: addDays(TODAY, -5),
      phoneOnly: false,
    })
    expect(r!.next).toMatchObject({ status: 'confirmed' })
    expect(f).toMatchObject({ name: null, segments: ['new'], phoneOnly: true, next: null })
    expect(l).toMatchObject({ segments: ['lapsed', 'flagged'], total: 80 })
    expect((await list(maysa, 'q=659000&segment=lapsed')).items.map((x) => x.id)).toEqual([lapsed])
    expect((await list(maysa, 'q=test reg')).items.map((x) => x.id)).toEqual([regular])
    // a page at a time
    const first = await list(maysa, 'q=659000&limit=2')
    expect(first.items).toHaveLength(2)
    expect((await list(maysa, `q=659000&limit=2&cursor=${first.cursor}`)).items.map((x) => x.id)).toEqual([lapsed])
    // no sums for an administrator
    expect((await list(await as(SELBI), 'q=659000')).items.every((x) => x.total === null)).toBe(true)
  })

  it('a specialist sees only clients with a booking with her, and only those bookings', async () => {
    const maral = await as(MARAL)
    const mine = await list(maral, 'q=659000')
    expect(mine.items.map((x) => x.id)).toEqual([regular])
    expect(mine.items[0]).toMatchObject({ visits: 3, total: null })
    expect((await maral.req(`${W}/clients/${lapsed}?lang=en`)).status).toBe(404)
    const card = (await maral.req(`${W}/clients/${regular}?lang=en`)).json
    expect(card.stats).toMatchObject({ visits: 3, avgCheck: null })
  })

  it('the new-booking drawer: from 3 digits the number’s start, or 2 letters of the name; alerts and usual services', async () => {
    const maysa = await as(MAYSA)
    const lookup = async (q: string) => (await maysa.req(`${W}/clients/lookup?${q}`)).json.items as Record<string, unknown>[]
    expect(await lookup('phone=65')).toEqual([])
    expect((await lookup('phone=6590000')).map((x) => x.id)).toEqual([regular, fresh, lapsed])
    expect(await lookup('phone=%2B993%2065%2090%2000%2001')).toEqual([
      {
        id: regular,
        name: 'Test Regular',
        phone: '+99365900001',
        visits: 3,
        avgCheck: 100,
        phoneOnly: false,
        alerts: ['Allergic to acetone'],
        usualServices: [manicure],
      },
    ])
    expect((await lookup('name=LAPSED')).map((x) => x.id)).toEqual([lapsed])
    expect((await maysa.req(`${W}/clients/lookup?phone=659&name=Test`)).status).toBe(400)
  })

  it('the card: numbers, notes, ahead and before, reports and switches', async () => {
    const maysa = await as(MAYSA)
    const card = (await maysa.req(`${W}/clients/${regular}?lang=en`)).json
    expect(card).toMatchObject({
      name: 'Test Regular',
      account: false,
      since: addDays(TODAY, -200),
      stats: { visits: 3, avgCheck: 100, lastVisit: addDays(TODAY, -5), noShows: 0 },
      notes: [{ text: 'Allergic to acetone', alert: true, by: 'Maýsa' }],
      settings: { phoneOnly: false, phoneOnlyByCount: false, noReminders: false },
      moreHistory: false,
      reports: [],
    })
    expect(card.upcoming).toEqual([
      expect.objectContaining({ date: addDays(TODAY, 2), status: 'confirmed', price: { type: 'fixed', amount: 100 } }),
    ])
    expect(card.upcoming[0].items).toEqual([expect.objectContaining({ service: 'Manicure', staffId: maralId })])
    expect(card.history.map((b: { date: string; status: string }) => [b.date, b.status])).toEqual([
      [addDays(TODAY, -3), 'cancelled'],
      [addDays(TODAY, -5), 'completed'],
      [addDays(TODAY, -40), 'completed'],
      [addDays(TODAY, -100), 'completed'],
    ])
    const short = (await maysa.req(`${W}/clients/${regular}?lang=en&history=2`)).json
    expect(short).toMatchObject({ moreHistory: true })
    expect(short.history).toHaveLength(2)
    const reported = (await maysa.req(`${W}/clients/${lapsed}?lang=en`)).json
    // who filed it, by id and name: the same `by` as the calendar booking's complaint
    expect(reported.reports).toEqual([
      expect.objectContaining({ type: 'late', by: { staffId: maysaId, name: 'Maýsa' }, date: addDays(TODAY, -90) }),
    ])
    const blocked = (await maysa.req(`${W}/clients/${fresh}?lang=en`)).json
    expect(blocked).toMatchObject({ name: null, settings: { phoneOnly: true, phoneOnlyByCount: false } })
    expect((await maysa.req(`${W}/clients/00000000-0000-4000-8000-000000000000?lang=en`)).status).toBe(404)
  })

  it('the request drawer and the calendar open the card; a request shows the alert notes and the visits as the card counts them', async () => {
    const maysa = await as(MAYSA)
    const code = await booking({ clientId: regular, date: addDays(TODAY, 4), status: 'pending', staffId: maralId, serviceId: manicure })
    const requests = (await maysa.req(`${W}/requests`)).json.items as { code: string; client: Record<string, unknown> }[]
    expect(requests.find((r) => r.code === code)!.client).toMatchObject({ id: regular, visits: 3, alerts: ['Allergic to acetone'] })
    const day = (await maysa.req(`${W}/calendar?date=${addDays(TODAY, 4)}`)).json.bookings as { code: string; client: { id: string } }[]
    expect(day.find((b) => b.code === code)!.client.id).toBe(regular)
  })

  it('a specialist finds any of the business’s clients by the whole number in the drawer, only her own by its start', async () => {
    const maral = await as(MARAL)
    const lookup = async (q: string) => (await maral.req(`${W}/clients/lookup?${q}`)).json.items as { id: string; avgCheck: unknown }[]
    expect((await lookup('phone=6590000')).map((x) => x.id)).toEqual([regular])
    // Aýna's client: the alert notes and phone-only mark matter to whoever books her
    expect(await lookup('phone=65900003')).toEqual([expect.objectContaining({ id: fresh, phoneOnly: true, avgCheck: null })])
    expect(await lookup('name=lapsed')).toEqual([])
  })

  it('a waiting move onto a specialist opens its client’s card for her; her request drawer counts the business’s visits', async () => {
    const maral = await as(MARAL)
    const [original] = await db.select().from(bookings).where(eq(bookings.clientId, lapsed))
    const move = await booking({
      clientId: lapsed,
      date: addDays(TODAY, 5),
      status: 'pending',
      staffId: maralId,
      serviceId: manicure,
      rescheduleOf: original!.id,
    })
    expect((await maral.req(`${W}/clients/${lapsed}?lang=en`)).status).toBe(200)
    const requests = (await maral.req(`${W}/requests`)).json.items as { code: string; client: { id: string; visits: number } }[]
    expect(requests.find((r) => r.code === move)!.client).toMatchObject({ id: lapsed, visits: 1 })
  })

  it('the average check leaves out visits without a price; usual services leave out archived ones', async () => {
    const maysa = await as(MAYSA)
    const lookup = async () => (await maysa.req(`${W}/clients/lookup?phone=65900003`)).json.items[0] as Record<string, unknown>
    expect(await lookup()).toMatchObject({ visits: 2, avgCheck: 80, usualServices: [haircut] })
    await db.update(services).set({ archived: true }).where(eq(services.id, haircut))
    try {
      expect((await lookup()).usualServices).toEqual([])
    } finally {
      await db.update(services).set({ archived: false }).where(eq(services.id, haircut))
    }
  })

  describe('sorted, counted and paged (the owner’s #11, #31)', () => {
    const DAY = 86_400_000
    let a: string
    let b: string
    let c: string
    let d: string
    let e: string
    /** Ties, and the ones without the thing, come by id. */
    const byId = (...ids: string[]) => [...ids].sort()
    const ids = (page: { items: Row[] }) => page.items.map((x) => x.id)
    /** Each sort's order, the sort's own direction first. */
    const orders = (): [string, string[]][] => [
      ['sort=recent', [e, a, d, b, c]],
      ['sort=recent&dir=asc', [c, b, d, a, e]],
      ['sort=visits', [a, b, ...byId(c, e), d]],
      ['sort=visits&dir=asc', [d, ...byId(c, e), b, a]],
      ['sort=name', [d, ...byId(c, e), a, b]],
      ['sort=name&dir=desc', [a, ...byId(c, e), d, b]],
      ['sort=lastVisit', [a, b, ...byId(c, e), d]],
      ['sort=lastVisit&dir=asc', [...byId(c, e), b, a, d]],
      ['sort=total', [a, ...byId(b, c, e), d]],
      ['sort=total&dir=asc', [d, ...byId(b, c, e), a]],
      ['sort=nextBooking', [a, e, ...byId(b, c, d)]],
      ['sort=nextBooking&dir=desc', [e, a, ...byId(b, c, d)]],
    ]

    beforeAll(async () => {
      const made = await db
        .insert(clients)
        .values([
          { businessId: glowId, phone: '+99365910001', name: 'Sort Regular', createdAt: new Date(DEMO_NOW - 200 * DAY) },
          { businessId: glowId, phone: '+99365910002', name: null, createdAt: new Date(DEMO_NOW - 20 * DAY) },
          { businessId: glowId, phone: '+99365910003', name: 'Sort Lapsed', createdAt: new Date(DEMO_NOW - 300 * DAY) },
          { businessId: glowId, phone: '+99365910004', name: 'Sort Empty', createdAt: new Date(DEMO_NOW - DAY) },
          { businessId: glowId, phone: '+99365910005', name: 'Sort Lapsed', createdAt: new Date(DEMO_NOW - 250 * DAY) },
        ])
        .returning()
      ;[a, b, c, d, e] = made.map((x) => x.id) as [string, string, string, string, string]
      // a: regular, three visits with Maral (300), one ahead in 3 days
      await booking({ clientId: a, date: addDays(TODAY, -100), status: 'completed', staffId: maralId, serviceId: manicure })
      await booking({ clientId: a, date: addDays(TODAY, -40), status: 'completed', staffId: maralId, serviceId: manicure })
      await booking({ clientId: a, date: addDays(TODAY, -5), status: 'completed', staffId: maralId, serviceId: manicure })
      await booking({ clientId: a, date: addDays(TODAY, 3), status: 'confirmed', staffId: maralId, serviceId: manicure })
      // b: new, unnamed, two visits with Aýna, one without a price (80)
      await booking({ clientId: b, date: addDays(TODAY, -10), status: 'completed', staffId: aynaId, serviceId: haircut, price: 80 })
      await booking({ clientId: b, date: addDays(TODAY, -12), status: 'completed', staffId: aynaId, serviceId: haircut, price: null })
      // c and e: lapsed twins with the same name, one visit 90 days ago (80); c reported, e with a visit ahead in 9 days
      await booking({
        clientId: c,
        date: addDays(TODAY, -90),
        status: 'completed',
        staffId: aynaId,
        serviceId: haircut,
        price: 80,
        complaint: 'late',
      })
      await booking({ clientId: e, date: addDays(TODAY, -90), status: 'completed', staffId: aynaId, serviceId: haircut, price: 80 })
      await booking({ clientId: e, date: addDays(TODAY, 9), status: 'confirmed', staffId: aynaId, serviceId: haircut })
      // d: added yesterday, nothing yet
    })

    it('each sort both ways: ties by id, the ones without the thing last; the usual order without a sort', async () => {
      const maysa = await as(MAYSA)
      expect(ids(await list(maysa, 'q=659100'))).toEqual([e, a, d, b, c])
      for (const [query, order] of orders()) expect(ids(await list(maysa, `q=659100&${query}`)), query).toEqual(order)
      expect((await maysa.req(`${W}/clients?sort=phone`)).status).toBe(400)
      expect((await maysa.req(`${W}/clients?sort=name&dir=up`)).status).toBe(400)
    })

    it('a page at a time keeps each sort’s order: the second page follows the first', async () => {
      const maysa = await as(MAYSA)
      for (const [query, order] of orders()) {
        const first = await list(maysa, `q=659100&limit=2&${query}`)
        expect(ids(first), query).toEqual(order.slice(0, 2))
        const second = await list(maysa, `q=659100&limit=2&${query}&cursor=${first.cursor}`)
        expect(ids(second), query).toEqual(order.slice(2, 4))
        expect(ids(await list(maysa, `q=659100&limit=2&${query}&cursor=${second.cursor}`)), query).toEqual(order.slice(4))
      }
    })

    it('the chips’ counts: for the search, whatever chip is on; without a search, the whole list’s', async () => {
      const maysa = await as(MAYSA)
      const counts = { all: 5, regular: 1, new: 1, lapsed: 2, flagged: 1 }
      expect((await list(maysa, 'q=659100')).counts).toEqual(counts)
      const lapsed = await list(maysa, 'q=659100&segment=lapsed')
      expect(ids(lapsed)).toEqual([e, c])
      expect(lapsed.counts).toEqual(counts)
      // a chip and a sort together: the chip's rows in the sort's order, the counts still the search's
      const lapsedAsc = await list(maysa, 'q=659100&segment=lapsed&sort=recent&dir=asc')
      expect(ids(lapsedAsc)).toEqual([c, e])
      expect(lapsedAsc.total).toBe(2)
      expect(lapsedAsc.counts).toEqual(counts)
      expect(ids(await list(maysa, 'q=659100&segment=lapsed&sort=nextBooking&dir=desc'))).toEqual([e, c])
      const whole = await list(maysa, '')
      expect(whole.counts.all).toBe(whole.total)
      expect(whole.counts.all).toBeGreaterThan(5)
      for (const segment of ['regular', 'new', 'lapsed', 'flagged'] as const)
        expect((await list(maysa, `segment=${segment}`)).total, segment).toBe(whole.counts[segment])
    })

    it('a specialist sorts and counts her own clients only; without "See revenue" the total stays hidden and sorts as usual', async () => {
      const maral = await as(MARAL)
      for (const [query] of orders()) {
        const mine = await list(maral, `q=659100&${query}`)
        expect(ids(mine), query).toEqual([a])
        expect(mine.counts, query).toEqual({ all: 1, regular: 1, new: 0, lapsed: 0, flagged: 0 })
      }
      const selbi = await as(SELBI)
      const byTotal = await list(selbi, 'q=659100&sort=total')
      expect(ids(byTotal)).toEqual([e, a, d, b, c])
      expect(byTotal.items.every((x) => x.total === null)).toBe(true)
      // the direction goes with the sort: not the oldest first, which would be `recent` ascending
      expect(ids(await list(selbi, 'q=659100&sort=total&dir=asc'))).toEqual([e, a, d, b, c])
      expect(ids(await list(selbi, 'q=659100&sort=name&dir=desc'))).toEqual([a, ...byId(c, e), d, b])
    })

    it('the card: what the completed visits cost, and how many bookings the history holds', async () => {
      const maysa = await as(MAYSA)
      const card = (await maysa.req(`${W}/clients/${a}?lang=en&history=2`)).json
      expect(card).toMatchObject({ stats: { visits: 3, total: 300, avgCheck: 100 }, historyCount: 3, moreHistory: true })
      expect(card.history).toHaveLength(2)
      const selbi = await as(SELBI)
      expect((await selbi.req(`${W}/clients/${a}?lang=en`)).json.stats).toMatchObject({ visits: 3, total: null, avgCheck: null })
    })
  })
})
