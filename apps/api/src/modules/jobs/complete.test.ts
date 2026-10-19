import { eq } from 'drizzle-orm'
import { beforeAll, describe, expect, it } from 'vitest'
import { testApp } from '../../../test/app'
import { testDatabase } from '../../../test/db'
import type { Db } from '../../db/client'
import { bookings, businesses } from '../../db/schema'
import { seed } from '../../db/seed'
import { runDueJobs } from './run'

// Wednesday 2026-10-14, 11:20 at the business (UTC+5)
const DEMO_NOW = Date.parse('2026-10-14T06:20:00Z')

describe('completing visits past midnight (book Q-105)', () => {
  let db: Db
  beforeAll(async () => {
    ;({ db } = await testDatabase())
    await seed(db, { demo: true, now: DEMO_NOW })
  })

  it('a visit on a day open past midnight completes after its end, not at midnight', async () => {
    const [barber] = await db.select().from(businesses).where(eq(businesses.slug, 'barber-loft'))
    // Wednesday's business day, 00:30–01:30 the next morning
    const [late] = await db
      .insert(bookings)
      .values({
        code: 'YR-99001',
        businessId: barber!.id,
        type: 'appointment',
        date: '2026-10-14',
        start: 1470,
        end: 1530,
        status: 'confirmed',
        source: 'web',
      })
      .returning()
    const t = testApp(db, { now: Date.parse('2026-10-14T19:00:00Z') }) // Thursday 00:00 at the business
    await runDueJobs(t.deps)
    expect((await db.select().from(bookings).where(eq(bookings.id, late!.id)))[0]!.status).toBe('confirmed')
    t.clock.now = Date.parse('2026-10-14T20:31:00Z') // Thursday 01:31
    await runDueJobs(t.deps)
    expect((await db.select().from(bookings).where(eq(bookings.id, late!.id)))[0]!.status).toBe('completed')
  })
})
