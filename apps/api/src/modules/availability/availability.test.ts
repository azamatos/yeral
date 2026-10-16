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
  })

  it('classes: seats left as the design shows them', async () => {
    const res = await b.req('/v1/businesses/aydyn-yoga/sessions?days=2')
    const today = res.json.items.filter((s: { date: string }) => s.date === '2026-10-14')
    expect(today.map((s: { name: string; seatsLeft: number; maxSeats: number }) => [s.name, s.seatsLeft, s.maxSeats])).toEqual([
      ['Hatha ýoga', 3, 2],
      ['Ýin ýoga', 0, 0],
    ])
    const tomorrow = res.json.items.filter((s: { date: string }) => s.date === '2026-10-15')
    expect(tomorrow.map((s: { seatsLeft: number }) => s.seatsLeft)).toEqual([7, 9])
  })
})
