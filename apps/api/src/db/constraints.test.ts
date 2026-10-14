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
    const booking = (code: string) => ({
      code,
      businessId: biz!.id,
      type: 'appointment' as const,
      date: '2026-10-15',
      start: 600,
      end: 660,
      status: 'confirmed' as const,
      active: true,
      source: 'web' as const,
    })
    const rows = await db
      .insert(t.bookings)
      .values([booking('YR-10001'), booking('YR-10002')])
      .returning()
    bookingId = rows[0]!.id
    otherBookingId = rows[1]!.id
  })

  const item = (bookingId: string, start: number, end: number, bufferAfter = 0, active = true) => ({
    bookingId,
    staffId,
    serviceName: { tk: 'x' },
    date: '2026-10-15',
    start,
    end,
    bufferAfter,
    priceType: 'fixed' as const,
    priceAmount: 10,
    active,
  })

  it('refuses an overlap for the same specialist, buffer included', async () => {
    await db.insert(t.bookingItems).values(item(bookingId, 600, 660, 15))
    await expect(db.insert(t.bookingItems).values(item(otherBookingId, 670, 730))).rejects.toThrow()
    await db.insert(t.bookingItems).values(item(otherBookingId, 675, 735))
  })

  it('lets inactive items overlap', async () => {
    await db.insert(t.bookingItems).values(item(otherBookingId, 600, 660, 0, false))
  })

  it('keeps a business day inside midnight', async () => {
    await expect(db.insert(t.bookingItems).values(item(otherBookingId, 1400, 1440, 10, false))).rejects.toThrow()
  })
})
