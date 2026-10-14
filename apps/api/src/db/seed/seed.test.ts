import { appointmentSlots } from '@yeral/domain/availability'
import { clientStats } from '@yeral/domain/clients'
import { and, eq } from 'drizzle-orm'
import { beforeAll, describe, expect, it } from 'vitest'
import { DEMO_NOW } from '../../../test/app'
import { testDatabase } from '../../../test/db'
import type { Db } from '../client'
import * as t from '../schema'
import { seed } from './index'
import { GLOW_CLIENTS } from './demo-data'

describe('demo seed', () => {
  let db: Db
  let counts: Record<string, number>

  beforeAll(async () => {
    ;({ db } = await testDatabase())
    counts = await seed(db, { demo: true, now: DEMO_NOW })
  })

  it('creates the catalogue and every demo business, verified', async () => {
    expect(counts).toMatchObject({ categories: 13, businesses: 14 })
    const pending = await db.select().from(t.businesses).where(eq(t.businesses.verification, 'pending'))
    expect(pending).toEqual([])
  })

  it('Glow Studio’s client list matches the design (visits and no-shows)', async () => {
    const [glow] = await db.select().from(t.businesses).where(eq(t.businesses.slug, 'glow-studio'))
    for (const c of GLOW_CLIENTS.filter((x) => x.key.startsWith('c'))) {
      const [client] = await db
        .select()
        .from(t.clients)
        .where(and(eq(t.clients.businessId, glow!.id), eq(t.clients.phone, c.phone)))
      const visits = await db.select().from(t.bookings).where(eq(t.bookings.clientId, client!.id))
      const stats = clientStats(visits.map((v) => ({ date: v.date, status: v.status, price: v.priceAmount ?? 0 })))
      expect(stats.visits, c.name).toBe(c.visits)
      expect(stats.noShows, c.name).toBe(c.noShows ?? 0)
    }
  })

  it('on the demo day, Aýjemal’s request YR-48213 holds Thursday 14:30 with Aýna', async () => {
    const [b] = await db.select().from(t.bookings).where(eq(t.bookings.code, 'YR-48213'))
    expect(b).toMatchObject({ date: '2026-10-15', start: 870, end: 930, status: 'pending', active: true })
    expect(b!.holdUntil!.getTime()).toBe(DEMO_NOW + 28 * 60_000)

    const [glow] = await db.select().from(t.businesses).where(eq(t.businesses.slug, 'glow-studio'))
    const [ayna] = await db
      .select()
      .from(t.staff)
      .where(and(eq(t.staff.businessId, glow!.id), eq(t.staff.name, 'Aýna')))
    const [s1] = (await db.select().from(t.services).where(eq(t.services.businessId, glow!.id))).filter(
      (s) => s.name.tk === 'Aýal saç kesimi',
    )
    const items = await db
      .select()
      .from(t.bookingItems)
      .where(and(eq(t.bookingItems.staffId, ayna!.id), eq(t.bookingItems.active, true)))
    const slots = appointmentSlots(
      {
        business: { hours: glow!.hours, exceptions: glow!.exceptions },
        rules: { leadMinutes: 60, windowDays: 30, bufferMinutes: 10, slotStep: 15 },
        staff: [
          {
            id: ayna!.id,
            serviceIds: [s1!.id],
            bookable: true,
            active: true,
            shift: ayna!.shift,
            breaks: ayna!.breaks,
            daysOff: ayna!.daysOff,
          },
        ],
        services: [{ id: s1!.id, durationMin: 60, bufferMin: null, online: true }],
        busy: items.map((i) => ({ staffId: ayna!.id, date: i.date, start: i.start, end: i.end + i.bufferAfter, bookingId: i.bookingId })),
        now: DEMO_NOW,
      },
      { date: '2026-10-15', serviceIds: [s1!.id], staffId: ayna!.id, by: 'client' },
    ).map((s) => s.start)
    // 60 min + 10 min buffer: the last start before the 13:30 break is 12:15; the request holds 14:30–15:40
    expect(slots).toContain(735)
    expect(slots).not.toContain(750)
    expect(slots).not.toContain(855)
    expect(slots).not.toContain(870)
    expect(slots).toContain(945)
  })
})
