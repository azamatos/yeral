import { epochOf } from '@yeral/domain/time'
import { eq } from 'drizzle-orm'
import { beforeAll, describe, expect, it } from 'vitest'
import { DEMO_NOW, testApp } from '../../../test/app'
import { testDatabase } from '../../../test/db'
import type { Db } from '../../db/client'
import { bookings, businesses, jobs } from '../../db/schema'
import { seed } from '../../db/seed'
import { runDueJobs } from '../jobs/run'
import { queueBookingSms } from './confirm'

describe('reminders and the night (book Q-285)', () => {
  let db: Db
  beforeAll(async () => {
    ;({ db } = await testDatabase())
    await seed(db, { demo: true, now: DEMO_NOW })
  })

  it('a 07:00 visit gets one reminder, at 21:30 the evening before, worded "tomorrow"', async () => {
    const t = testApp(db)
    const [barber] = await db.select().from(businesses).where(eq(businesses.slug, 'barber-loft'))
    const [row] = await db
      .insert(bookings)
      .values({
        code: 'YR-99101',
        businessId: barber!.id,
        type: 'appointment',
        date: '2026-10-16',
        start: 420,
        end: 480,
        status: 'confirmed',
        source: 'web',
        clientPhone: '+99365555001',
        clientName: 'Early bird',
      })
      .returning()
    await queueBookingSms(db, t.deps, row!, { confirmed: false })
    const queued = await db.select({ payload: jobs.payload, runAt: jobs.runAt }).from(jobs).where(eq(jobs.kind, 'booking.sms'))
    const mine = queued.filter((j) => (j.payload as { bookingId: string }).bookingId === row!.id)
    expect(mine.map((j) => (j.payload as { kind: string }).kind).sort()).toEqual(['reminderEvening', 'reviewAsk'])
    const evening = mine.find((j) => (j.payload as { kind: string }).kind === 'reminderEvening')!
    expect(evening.runAt.getTime()).toBe(epochOf('2026-10-15', 1290))

    t.clock.now = epochOf('2026-10-15', 1291)
    await runDueJobs(t.deps)
    expect(t.sms.sent.find((s) => s.to === '+99365555001')?.text).toMatch(/^Reminder: tomorrow at 07:00, Barber Loft/)
  })
})
