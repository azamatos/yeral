import { beforeAll, describe, expect, it } from 'vitest'
import { and, eq } from 'drizzle-orm'
import { DEMO_NOW, testApp } from '../../../test/app'
import { browser } from '../../../test/client'
import { testDatabase } from '../../../test/db'
import type { Db } from '../../db/client'
import { businesses, services, staff } from '../../db/schema'
import { seed } from '../../db/seed'

describe('free times', () => {
  let db: Db
  let b: ReturnType<typeof browser>
  let s1: string
  let s5: string
  let ayna: string
  beforeAll(async () => {
    ;({ db } = await testDatabase())
    await seed(db, { demo: true, now: DEMO_NOW })
    b = browser(testApp(db).app)
    const [glow] = await db.select().from(businesses).where(eq(businesses.slug, 'glow-studio'))
    const svc = await db.select().from(services).where(eq(services.businessId, glow!.id))
    s1 = svc.find((s) => s.name.tk === 'Aýal saç kesimi')!.id
    s5 = svc.find((s) => s.name.tk === 'Manikýur')!.id
    ayna = (
      await db
        .select()
        .from(staff)
        .where(and(eq(staff.businessId, glow!.id), eq(staff.name, 'Aýna')))
    )[0]!.id
  })

  it('appointment: Thursday with Aýna, around the break and the 14:30 request', async () => {
    const res = await b.req(`/v1/businesses/glow-studio/availability?services=${s1}&staff=${ayna}&date=2026-10-15`)
    expect(res.status).toBe(200)
    const starts = res.json.slots.map((s: { start: number }) => s.start)
    expect(starts).toContain(735)
    expect(starts).not.toContain(750)
    expect(starts).not.toContain(870)
    expect(res.json.days).toHaveLength(14)
    expect(res.json.days[0]).toMatchObject({ date: '2026-10-14' })
    expect(res.json.days[4]).toMatchObject({ date: '2026-10-18', state: 'open' }) // Sunday 10:00–18:00
  })

  it('a full day points to the next free one', async () => {
    const res = await b.req(`/v1/businesses/glow-studio/availability?services=${s1}&staff=${ayna}`)
    expect(res.json.date).toBe('2026-10-14')
    expect(res.json.slots).toEqual([])
    expect(res.json.days[0].state).toBe('full')
    expect(res.json.nextFree).toMatchObject({ date: '2026-10-15', start: 540 })
  })

  it('services the specialist doesn’t do are not found', async () => {
    expect((await b.req(`/v1/businesses/glow-studio/availability?services=${s5}&staff=${ayna}`)).status).toBe(404)
  })

  it('specialists step: next free time per person who does the services', async () => {
    const res = await b.req(`/v1/businesses/glow-studio/specialists/availability?services=${s5}`)
    expect(res.json.items).toHaveLength(1)
    expect(res.json.any).toEqual(res.json.items[0].next)
  })

  it('tables: times for the party, VIP only from 6, 9+ by phone', async () => {
    const four = await b.req('/v1/businesses/bag-kafe/tables?party=4')
    expect(four.json.slots[0].start).toBeGreaterThanOrEqual(710) // 11:20 + 30 min lead → 12:00 on a 30-minute step
    expect(four.json.slots[0].areaIds).toHaveLength(2)
    const six = await b.req('/v1/businesses/bag-kafe/tables?party=6')
    expect(six.json.slots[0].areaIds).toHaveLength(3)
    const nine = await b.req('/v1/businesses/bag-kafe/tables?party=9')
    expect(nine.status).toBe(400)
    expect(nine.json.error).toEqual({ code: 'party_too_large', details: { callFrom: 9 } })
    expect((await b.req('/v1/businesses/no-such-place/tables?party=12')).status).toBe(404)
  })

  it('a business open past midnight offers 01:00 on the day before, books it, and won’t sell it twice (book Q-105)', async () => {
    const [barber] = await db.select().from(businesses).where(eq(businesses.slug, 'barber-loft'))
    const hours = [...barber!.hours]
    hours[3] = { open: 1080, close: 1560 } // Thursday 18:00–02:00
    await db.update(businesses).set({ hours }).where(eq(businesses.id, barber!.id))
    try {
      const detail = (await b.req('/v1/businesses/barber-loft')).json
      const svc = detail.serviceGroups.flatMap((g: { services: { id: string; durationMin: number }[] }) => g.services)[0]
      const who = detail.specialists[0].id
      const day = (await b.req(`/v1/businesses/barber-loft/availability?services=${svc.id}&staff=${who}&date=2026-10-15`)).json
      const starts = day.slots.map((s: { start: number }) => s.start)
      expect(starts).toContain(1440)
      expect(Math.max(...starts) + svc.durationMin).toBeLessThanOrEqual(1560)
      const client = browser(testApp(db).app)
      await client.login('+99365444001', 'Night owl')
      const body = {
        type: 'appointment',
        business: 'barber-loft',
        serviceIds: [svc.id],
        staffId: who,
        date: '2026-10-15',
        start: 1500 - svc.durationMin,
      }
      const made = await client.req('/v1/bookings', { body })
      expect(made.status).toBe(201)
      const again = browser(testApp(db).app)
      await again.login('+99365444002', 'Second owl')
      expect((await again.req('/v1/bookings', { body })).status).toBe(409)
    } finally {
      await db.update(businesses).set({ hours: barber!.hours }).where(eq(businesses.id, barber!.id))
    }
  })

  it('classes: seats left as the design shows them', async () => {
    const res = await b.req('/v1/businesses/aydyn-yoga/sessions?days=2')
    const today = res.json.items.filter((s: { date: string }) => s.date === '2026-10-14')
    expect(today.map((s: { name: string; seatsLeft: number; maxSeats: number }) => [s.name, s.seatsLeft, s.maxSeats])).toEqual([
      ['Hatha yoga', 3, 2],
      ['Yin yoga', 0, 0],
    ])
    const tomorrow = res.json.items.filter((s: { date: string }) => s.date === '2026-10-15')
    expect(tomorrow.map((s: { seatsLeft: number }) => s.seatsLeft)).toEqual([7, 9])
  })
})
