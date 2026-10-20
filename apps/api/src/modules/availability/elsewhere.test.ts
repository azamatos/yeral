/** Busy elsewhere (book Q-272, S-14): a person's bookings in one workspace take their time in the others. */
import { and, eq, inArray } from 'drizzle-orm'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { DEMO_NOW, testApp } from '../../../test/app'
import { browser } from '../../../test/client'
import { testDatabase } from '../../../test/db'
import type { Db } from '../../db/client'
import { bookingItems, bookings, businesses, rateLimits, services, staff, users } from '../../db/schema'
import { seed } from '../../db/seed'

const FRI = '2026-10-16'

describe('busy elsewhere (book Q-272)', () => {
  let db: Db
  let t: ReturnType<typeof testApp>
  const id: Record<string, string> = {}

  beforeAll(async () => {
    ;({ db } = await testDatabase())
    await seed(db, { demo: true, now: DEMO_NOW })
    const one = async (slug: string, en: string) => {
      const [biz] = await db.select().from(businesses).where(eq(businesses.slug, slug))
      const [svc] = await db
        .select()
        .from(services)
        .where(and(eq(services.businessId, biz!.id), eq(services.archived, false)))
        .then((rows) => rows.filter((s) => (s.name as { en?: string }).en === en))
      return { biz: biz!.id, svc: svc!.id }
    }
    const glow = await one('glow-studio', "Women's haircut")
    const barber = await one('barber-loft', "Men's haircut")
    id.haircut = glow.svc
    id.cut = barber.svc
    const person = async (biz: string, name: string) =>
      (
        await db
          .select()
          .from(staff)
          .where(and(eq(staff.businessId, biz), eq(staff.name, name)))
      )[0]!.id
    id.ayna = await person(glow.biz, 'Aýna')
    id.merdan = await person(barber.biz, 'Merdan')
    id.arslan = await person(barber.biz, 'Arslan')
    // one person who works in both places
    const [both] = await db.insert(users).values({ phone: '+99365600001', lang: 'en' }).returning()
    id.person = both!.id
    await db
      .update(staff)
      .set({ userId: both!.id })
      .where(inArray(staff.id, [id.ayna, id.merdan]))
  })

  beforeEach(async () => {
    await db.delete(rateLimits)
    t = testApp(db)
  })

  const client = async (phone: string) => {
    const b = browser(t.app)
    await b.login(phone, 'Client')
    return b
  }
  const free = async (b: ReturnType<typeof browser>, slug: string, service: string, who: string) =>
    (
      (await b.req(`/v1/businesses/${slug}/availability?services=${service}&staff=${who}&date=${FRI}`)).json.slots as { start: number }[]
    ).map((s) => s.start)
  const book = (b: ReturnType<typeof browser>, slug: string, service: string, who: string | null, start: number) =>
    b.req('/v1/bookings', { body: { type: 'appointment', business: slug, serviceIds: [service], staffId: who, date: FRI, start } })
  /** A start both places offer her, the n-th from the end of the day. */
  const bothFree = async (b: ReturnType<typeof browser>, n: number) => {
    const merdan = await free(b, 'barber-loft', id.cut!, id.merdan!)
    const both = (await free(b, 'glow-studio', id.haircut!, id.ayna!)).filter((s) => merdan.includes(s))
    return both[both.length - 1 - n]!
  }

  it('a request for her in one place takes that time, with its buffer, in the other, and nothing of it shows', async () => {
    const b = await client('+99365600010')
    const start = await bothFree(b, 0)
    const made = await book(b, 'glow-studio', id.haircut!, id.ayna!, start)
    expect(made.status).toBe(201)
    const [item] = await db
      .select()
      .from(bookingItems)
      .innerJoin(bookings, eq(bookings.id, bookingItems.bookingId))
      .where(eq(bookings.code, made.json.code))
    const until = item!.booking_items.end + item!.booking_items.bufferAfter

    const merdan = await free(b, 'barber-loft', id.cut!, id.merdan!)
    expect(merdan).not.toContain(start)
    // a 45-minute cut there ends before her visit here, or starts after it and its buffer
    for (const s of merdan) expect(s + 45 <= start || s >= until).toBe(true)
    const other = await client('+99365600011')
    const tried = await book(other, 'barber-loft', id.cut!, id.merdan!, start)
    expect(tried.status).toBe(409)
    expect(tried.json.error.code).toBe('slot_taken')
    // the other place's own specialist is still free then
    expect((await book(other, 'barber-loft', id.cut!, null, start)).status).toBe(201)
  })

  it('her own bookings as a client take nothing of her time as a specialist', async () => {
    const me = browser(t.app)
    await me.login('+99365600001', 'Aýna')
    const start = await bothFree(me, 2)
    expect((await book(me, 'barber-loft', id.cut!, id.arslan!, start)).status).toBe(201)
    expect(await free(me, 'glow-studio', id.haircut!, id.ayna!)).toContain(start)
    expect(await free(me, 'barber-loft', id.cut!, id.merdan!)).toContain(start)
  })

  it('a cancel brought back after the time went elsewhere is refused: the time was taken', async () => {
    const b = await client('+99365600012')
    const start = await bothFree(b, 4)
    const made = await book(b, 'barber-loft', id.cut!, id.merdan!, start)
    expect(made.status).toBe(201)
    expect((await b.req(`/v1/me/bookings/${made.json.code}/cancel`, { body: {} })).status).toBe(200)
    const other = await client('+99365600013')
    expect((await book(other, 'glow-studio', id.haircut!, id.ayna!, start)).status).toBe(201)
    const back = await b.req(`/v1/me/bookings/${made.json.code}/restore`, { method: 'POST' })
    expect(back.status).toBe(409)
    expect(back.json.error.code).toBe('slot_taken')
  })
})
