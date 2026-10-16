import { describe, expect, it, beforeAll } from 'vitest'
import { testDatabase } from '../../test/db'
import type { Db } from './client'
import * as t from './schema'

/** The database refuses double bookings by itself (migration 0001). */
describe('no double booking', () => {
  let db: Db
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
        street: 'x',
        lat: 37.95,
        lng: 58.38,
        phone: '+99312000000',
        hours: [null, null, null, null, null, null, null],
      })
      .returning()
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

  it('keeps a business day inside midnight', async () => {
    await expect(db.insert(t.bookingItems).values(item(cancelledId, 1400, 1440, 10))).rejects.toThrow()
  })
})
