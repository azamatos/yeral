/** The timed jobs' notices (book S-01, S-13): a request's 5-minute warning, an invite whose 7 days ran out. */
import { addDays, today } from '@yeral/domain/time'
import { and, eq } from 'drizzle-orm'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { DEMO_NOW, testApp } from '../../../test/app'
import { browser, eventsAfter } from '../../../test/client'
import { testDatabase } from '../../../test/db'
import type { Db } from '../../db/client'
import { bookingItems, bookings, businesses, invites, rateLimits, services, staff } from '../../db/schema'
import { seed } from '../../db/seed'
import { runDueJobs } from './run'

const MAYSA = '+99365102030' // owner of Glow Studio
const GULNAR = '+99364215590' // invited to Glow Studio

describe('the timed notices (book S-01, S-13)', () => {
  let db: Db
  let t: ReturnType<typeof testApp>
  let glowId: string
  beforeAll(async () => {
    ;({ db } = await testDatabase())
    await seed(db, { demo: true, now: DEMO_NOW })
    const [glow] = await db.select().from(businesses).where(eq(businesses.slug, 'glow-studio'))
    glowId = glow!.id
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

  it('"Haýyşyň wagty gutarýar" once, 5 minutes before a request’s answer time ends', async () => {
    const [manicure] = await db
      .select()
      .from(services)
      .where(and(eq(services.businessId, glowId), eq(services.archived, false)))
    const [maral] = await db
      .select()
      .from(staff)
      .where(and(eq(staff.businessId, glowId), eq(staff.name, 'Maral')))
    const date = addDays(today(DEMO_NOW), 3)
    const [b] = await db
      .insert(bookings)
      .values({
        code: 'YR-810001',
        businessId: glowId,
        type: 'appointment',
        clientName: 'Waiting',
        clientPhone: '+99365950001',
        date,
        start: 1380,
        end: 1410,
        status: 'pending',
        source: 'web',
        holdUntil: new Date(DEMO_NOW + 10 * 60_000),
      })
      .returning()
    await db.insert(bookingItems).values({
      bookingId: b!.id,
      serviceId: manicure!.id,
      serviceName: { en: 'Manicure' },
      staffId: maral!.id,
      date,
      start: 1380,
      end: 1410,
      priceType: 'fixed',
      priceAmount: 80,
    })
    const maysa = await as(MAYSA)
    const cursor = (await maysa.req('/v1/events')).json.cursor as string
    const warnedAt = async () => (await db.select().from(bookings).where(eq(bookings.id, b!.id)))[0]!.expiryWarnedAt
    // ten minutes left: not yet (the demo's own requests may be warned meanwhile)
    await runDueJobs(t.deps)
    expect(await warnedAt()).toBeNull()
    t.clock.now += 5 * 60_000 + 1
    expect((await runDueJobs(t.deps)).warned).toBeGreaterThanOrEqual(1)
    expect(await warnedAt()).not.toBeNull()
    expect((await runDueJobs(t.deps)).warned).toBe(0)
    const heard = await eventsAfter(maysa, cursor, (items) => items.some((e) => e.type === 'request.expiring'))
    const warnings = (heard.json.items as { type: string; bookingCode: string }[]).filter((e) => e.type === 'request.expiring')
    // once for this request
    expect(warnings.filter((e) => e.bookingCode === 'YR-810001')).toHaveLength(1)
  })

  it('an invite’s 7 days run out: the team’s screens and the invitee’s hear it once', async () => {
    const [invite] = await db
      .select()
      .from(invites)
      .where(and(eq(invites.businessId, glowId), eq(invites.phone, GULNAR)))
    const gulnar = await as(GULNAR)
    const cursor = (await gulnar.req('/v1/events')).json.cursor as string
    t.clock.now = invite!.expiresAt.getTime() + 60_000
    expect((await runDueJobs(t.deps)).invitesExpired).toBeGreaterThanOrEqual(1)
    expect((await runDueJobs(t.deps)).invitesExpired).toBe(0)
    const heard = await eventsAfter(gulnar, cursor, (items) => items.some((e) => e.type === 'team.changed'))
    expect((heard.json.items as { type: string }[]).map((e) => e.type)).toContain('team.changed')
    expect((await gulnar.req('/v1/me/invites')).json.items[0].state).toBe('expired')
  })
})
