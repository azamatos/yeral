import { describe, expect, it, beforeAll } from 'vitest'
import { testDatabase } from '../../test/db'
import type { Db } from './client'
import * as t from './schema'

/** The SQLSTATE a statement fails with, or null when it succeeds. */
const sqlState = (q: PromiseLike<unknown>) =>
  Promise.resolve(q).then(
    () => null,
    (e: { code?: string; cause?: { code?: string } }) => e.code ?? e.cause?.code ?? 'unknown',
  )

/** The database refuses double bookings by itself (migration 0001). */
describe('no double booking', () => {
  let db: Db
  let bizId: string
  let staffId: string
  let bookingId: string
  let otherBookingId: string
  let cancelledId: string

  beforeAll(async () => {
    ;({ db } = await testDatabase())
    await db.insert(t.categories).values({
      id: 'beauty',
      icon: 'sparkles',
      name: { tk: 'Gözellik' },
      hint: { tk: '' },
      intro: { tk: '' },
      bookingTypes: ['appointment'],
      specialistWord: { tk: 'hünärmen' },
    })
    await db.insert(t.cities).values({ id: 'city', name: { en: 'City' }, lat: 37.95, lng: 58.38 })
    const [biz] = await db
      .insert(t.businesses)
      .values({
        slug: 'b',
        name: 'B',
        categoryId: 'beauty',
        kind: { tk: 'Salon' },
        bookingTypes: ['appointment'],
        about: { tk: '' },
        address: 'x',
        cityId: 'city',
        street: 'x',
        lat: 37.95,
        lng: 58.38,
        phone: '+99312000000',
        hours: [null, null, null, null, null, null, null],
      })
      .returning()
    bizId = biz!.id
    const [s] = await db.insert(t.staff).values({ businessId: biz!.id, name: 'A' }).returning()
    staffId = s!.id
    const booking = (code: string, status: 'confirmed' | 'cancelled' = 'confirmed') => ({
      code,
      businessId: biz!.id,
      type: 'appointment' as const,
      date: '2026-10-15',
      start: 600,
      end: 660,
      status,
      source: 'web' as const,
    })
    const rows = await db
      .insert(t.bookings)
      .values([booking('YR-10001'), booking('YR-10002'), booking('YR-10003', 'cancelled')])
      .returning()
    bookingId = rows[0]!.id
    otherBookingId = rows[1]!.id
    cancelledId = rows[2]!.id
  })

  // `active` comes from the booking (trigger, migration 0003)
  const item = (bookingId: string, start: number, end: number, bufferAfter = 0) => ({
    bookingId,
    staffId,
    serviceName: { tk: 'x' },
    date: '2026-10-15',
    start,
    end,
    bufferAfter,
    priceType: 'fixed' as const,
    priceAmount: 10,
  })

  it('refuses an overlap for the same specialist, buffer included', async () => {
    await db.insert(t.bookingItems).values(item(bookingId, 600, 660, 15))
    await expect(db.insert(t.bookingItems).values(item(otherBookingId, 670, 730))).rejects.toThrow()
    await db.insert(t.bookingItems).values(item(otherBookingId, 675, 735))
  })

  it('lets the items of a cancelled booking overlap', async () => {
    const [row] = await db
      .insert(t.bookingItems)
      .values(item(cancelledId, 600, 660))
      .returning()
    expect(row!.active).toBe(false)
  })

  it('lets a business day run past midnight, up to 48:00 (book Q-105)', async () => {
    await db.insert(t.bookingItems).values(item(cancelledId, 1400, 1440, 10))
    await expect(db.insert(t.bookingItems).values(item(cancelledId, 2850, 2880, 10))).rejects.toThrow()
  })

  it('refuses an overlap across midnight: late on one day, early the next', async () => {
    // 15th 00:30–01:30 the next morning = minutes 1470–1530 of the 15th
    await db.insert(t.bookingItems).values(item(bookingId, 1470, 1530))
    const nextMorning = (start: number, end: number) => ({ ...item(otherBookingId, start, end), date: '2026-10-16' })
    await expect(db.insert(t.bookingItems).values(nextMorning(60, 120))).rejects.toThrow()
    await db.insert(t.bookingItems).values(nextMorning(90, 150))
  })

  it('lets a move request overlap its own booking, nobody else’s, and keeps one waiting (book Q-165)', async () => {
    const move = (code: string, of: string) => ({
      code,
      businessId: bizId,
      type: 'appointment' as const,
      date: '2026-10-15',
      start: 900,
      end: 960,
      status: 'pending' as const,
      source: 'web' as const,
      rescheduleOf: of,
    })
    await db.insert(t.bookingItems).values(item(bookingId, 900, 960))
    const [own] = await db.insert(t.bookings).values(move('YR-10004', bookingId)).returning()
    // the move's items belong to the booking: they may overlap its 15:00
    const [moved] = await db
      .insert(t.bookingItems)
      .values(item(own!.id, 930, 990))
      .returning()
    expect(moved!.family).toBe(bookingId)
    // another booking's move may not: the overlap rule refuses it
    const [others] = await db.insert(t.bookings).values(move('YR-10005', otherBookingId)).returning()
    expect(await sqlState(db.insert(t.bookingItems).values(item(others!.id, 940, 1000)))).toBe('23P01')
    // one waiting move per booking: the unique index refuses a second
    expect(await sqlState(db.insert(t.bookings).values(move('YR-10006', bookingId)))).toBe('23505')
  })
})

/** The team's invariants hold in the database too (ADR 0025, migration 0005). */
describe('a team', () => {
  let db: Db
  let businessId: string
  let userId: string

  beforeAll(async () => {
    ;({ db } = await testDatabase())
    await db
      .insert(t.categories)
      .values({
        id: 'beauty',
        icon: 'sparkles',
        name: { en: 'Beauty' },
        hint: {},
        intro: {},
        bookingTypes: ['appointment'],
        specialistWord: { en: 'specialist' },
      })
      .onConflictDoNothing()
    await db
      .insert(t.cities)
      .values({ id: 'city', name: { en: 'City' }, lat: 37.95, lng: 58.38 })
      .onConflictDoNothing()
    const [biz] = await db
      .insert(t.businesses)
      .values({
        slug: 'team',
        name: 'Team',
        categoryId: 'beauty',
        kind: { en: 'Salon' },
        bookingTypes: ['appointment'],
        about: {},
        address: 'x',
        cityId: 'city',
        street: 'x',
        lat: 37.95,
        lng: 58.38,
        phone: '+99312000001',
        hours: [null, null, null, null, null, null, null],
      })
      .returning()
    businessId = biz!.id
    const [u] = await db.insert(t.users).values({ phone: '+99365000101', lang: 'en' }).returning()
    userId = u!.id
  })

  it('has exactly one active owner', async () => {
    await db.insert(t.staff).values({ businessId, name: 'Owner', level: 'owner', userId })
    await expect(db.insert(t.staff).values({ businessId, name: 'Second', level: 'owner' })).rejects.toThrow()
    // a removed owner doesn't count
    await db.insert(t.staff).values({ businessId, name: 'Former', level: 'owner', status: 'removed' })
  })

  it('keeps one row per person per workspace', async () => {
    await expect(db.insert(t.staff).values({ businessId, name: 'Again', userId })).rejects.toThrow()
  })

  it('needs a phone for a specialist without the app, and the owner always has the app', async () => {
    await expect(db.insert(t.staff).values({ businessId, name: 'Läle', hasApp: false })).rejects.toThrow()
    await db.insert(t.staff).values({ businessId, name: 'Läle', hasApp: false, phone: '+99365000102' })
    await expect(
      db.insert(t.staff).values({ businessId, name: 'X', level: 'owner', hasApp: false, phone: '+99365000103', status: 'removed' }),
    ).rejects.toThrow()
  })

  it('keeps one open invite per phone per workspace', async () => {
    const [s] = await db.insert(t.staff).values({ businessId, name: 'Selbi', status: 'invited' }).returning()
    const invite = (tokenHash: string, status: 'pending' | 'declined' = 'pending') => ({
      businessId,
      staffId: s!.id,
      phone: '+99365000104',
      tokenHash,
      status,
      sentAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 86_400_000),
    })
    await db.insert(t.invites).values(invite('a'))
    await expect(db.insert(t.invites).values(invite('b'))).rejects.toThrow()
    await db.insert(t.invites).values(invite('c', 'declined'))
  })
})
