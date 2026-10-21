/** The timed notices (book S-01, S-13): when a request's 5-minute warning is due, an invite whose 7 days ran out. */
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

  it('a request says when "Haýyşyň wagty gutarýar" is due: 5 open minutes before its answer time ends', async () => {
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
        // sent at 11:20 while Glow Studio is open, with 30 minutes to answer
        holdUntil: new Date(DEMO_NOW + 30 * 60_000),
        createdAt: new Date(DEMO_NOW),
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
    const items = (await (await as(MAYSA)).req('/v1/w/glow-studio/requests')).json.items as { code: string; warnAt: number | null }[]
    expect(items.find((r) => r.code === 'YR-810001')!.warnAt).toBe(DEMO_NOW + 25 * 60_000)
  })

  it('an invite’s 7 days run out: the owner’s screens and the invitee’s hear it, once', async () => {
    const [invite] = await db
      .select()
      .from(invites)
      .where(and(eq(invites.businessId, glowId), eq(invites.phone, GULNAR)))
    const [maysa, gulnar] = [await as(MAYSA), await as(GULNAR)]
    const ownerCursor = (await maysa.req('/v1/events')).json.cursor as string
    const guestCursor = (await gulnar.req('/v1/events')).json.cursor as string
    t.clock.now = invite!.expiresAt.getTime() + 60_000
    expect((await runDueJobs(t.deps)).invitesExpired).toBe(1)
    expect((await runDueJobs(t.deps)).invitesExpired).toBe(0)
    const changes = async (b: ReturnType<typeof browser>, cursor: string) =>
      ((await eventsAfter(b, cursor, (items) => items.some((e) => e.type === 'team.changed'))).json.items as { type: string }[]).filter(
        (e) => e.type === 'team.changed',
      )
    expect(await changes(maysa, ownerCursor)).toHaveLength(1)
    expect(await changes(gulnar, guestCursor)).toHaveLength(1)
    expect((await gulnar.req('/v1/me/invites')).json.items[0].state).toBe('expired')
  })
})
