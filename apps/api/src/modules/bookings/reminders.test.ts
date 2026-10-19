import { epochOf } from '@yeral/domain/time'
import { eq, sql } from 'drizzle-orm'
import { beforeAll, describe, expect, it } from 'vitest'
import { DEMO_NOW, testApp } from '../../../test/app'
import { testDatabase } from '../../../test/db'
import type { Db } from '../../db/client'
import { bookings, businesses, jobs, users } from '../../db/schema'
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

  it('a moved reminder follows the switch of the reminder it stands for', async () => {
    const t = testApp(db)
    const [barber] = await db.select().from(businesses).where(eq(businesses.slug, 'barber-loft'))
    // wants the 2-hour reminder only
    const [user] = await db
      .insert(users)
      .values({ phone: '+99365555002', lang: 'en', notifyReminderDay: false, notifyReminder2h: true })
      .returning()
    const [row] = await db
      .insert(bookings)
      .values({
        code: 'YR-99102',
        businessId: barber!.id,
        userId: user!.id,
        type: 'appointment',
        date: '2026-10-16',
        start: 1380,
        end: 1440,
        status: 'confirmed',
        source: 'web',
        clientPhone: '+99365555002',
        clientName: 'Night owl',
      })
      .returning()
    await queueBookingSms(db, t.deps, row!, { confirmed: false })

    // the day reminder (23:00 Thursday) moved to 21:30 Thursday: its switch is off, nothing goes
    t.clock.now = epochOf('2026-10-15', 1291)
    await runDueJobs(t.deps)
    expect(t.sms.sent.filter((s) => s.to === '+99365555002')).toEqual([])
    // the 2-hour one, 21:00 Friday, goes
    t.clock.now = epochOf('2026-10-16', 1261)
    await runDueJobs(t.deps)
    expect(t.sms.sent.filter((s) => s.to === '+99365555002')).toHaveLength(1)
  })

  it("a reminder names the city of a business outside the market's main one (book Q-107)", async () => {
    const t = testApp(db)
    const [barber] = await db.update(businesses).set({ cityId: 'mary' }).where(eq(businesses.slug, 'barber-loft')).returning()
    let bookingId: string | undefined
    try {
      const [row] = await db
        .insert(bookings)
        .values({
          code: 'YR-99103',
          businessId: barber!.id,
          type: 'appointment',
          date: '2026-10-16',
          start: 900,
          end: 960,
          status: 'confirmed',
          source: 'web',
          clientPhone: '+99365555003',
          clientName: 'Traveller',
        })
        .returning()
      bookingId = row!.id
      await queueBookingSms(db, t.deps, row!, { confirmed: false })
      t.clock.now = epochOf('2026-10-15', 901)
      await runDueJobs(t.deps)
      expect(t.sms.sent.find((s) => s.to === '+99365555003')?.text).toBe(
        `Reminder: tomorrow at 15:00, Barber Loft, ${barber!.address}, Mary.`,
      )
    } finally {
      // later tests in this file share the database: the business goes back, the booking and its SMS go away
      await db.update(businesses).set({ cityId: 'ashgabat' }).where(eq(businesses.slug, 'barber-loft'))
      if (bookingId) {
        await db.delete(jobs).where(sql`${jobs.payload}->>'bookingId' = ${bookingId}`)
        await db.delete(bookings).where(eq(bookings.id, bookingId))
      }
    }
  })
})
