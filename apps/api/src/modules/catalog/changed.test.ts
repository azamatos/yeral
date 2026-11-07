import { beforeAll, describe, expect, it } from 'vitest'
import { eq } from 'drizzle-orm'
import { DEMO_NOW, testApp } from '../../../test/app'
import { browser } from '../../../test/client'
import { testDatabase } from '../../../test/db'
import type { Db } from '../../db/client'
import { bookings, businesses, users } from '../../db/schema'
import { seed } from '../../db/seed'
import { updateHours } from '../settings/hours'
import { updateProfile } from '../settings/service'

const DAY = 86_400_000
const PHONE = '+99365777040'
const weekOf = (hours: (typeof businesses.$inferSelect)['hours']) =>
  hours.map((d) => (d ? { open: d.open, close: d.close, break: d.break ?? null } : null))

describe('what changed since the last visit (F-245, C7-Booking D1)', () => {
  let db: Db
  let t: ReturnType<typeof testApp>
  let glow: typeof businesses.$inferSelect
  let client: ReturnType<typeof browser>
  let userId: string
  const changed = async (who: ReturnType<typeof browser>) => (await who.req('/v1/businesses/glow-studio')).json.changedSinceLastVisit
  const visit = (code: string, date: string, extra: Partial<typeof bookings.$inferInsert> = {}) =>
    db.insert(bookings).values({
      code,
      businessId: glow.id,
      type: 'appointment',
      date,
      start: 600,
      end: 660,
      status: 'completed',
      source: 'web',
      userId,
      clientPhone: PHONE,
      createdAt: new Date(Date.parse(date) - 2 * DAY),
      ...extra,
    })

  beforeAll(async () => {
    ;({ db } = await testDatabase())
    await seed(db, { demo: true, now: DEMO_NOW })
    t = testApp(db)
    ;[glow] = (await db.select().from(businesses).where(eq(businesses.slug, 'glow-studio'))) as [typeof glow]
    // Glow Studio moved on 5 October from Görogly köçesi
    await db
      .update(businesses)
      .set({
        movedAt: new Date(Date.parse('2026-10-05T08:00:00Z')),
        movedFrom: { address: 'Görogly köçesi 52, 1-nji gat', street: 'Görogly köçesi', cityId: glow.cityId },
      })
      .where(eq(businesses.id, glow.id))
    client = browser(t.app)
    await client.login(PHONE, 'Aýjemal')
    ;[{ id: userId }] = (await db.select({ id: users.id }).from(users).where(eq(users.phone, PHONE))) as [{ id: string }]
  })

  it('tells nothing to a guest or to a client with no completed visit here', async () => {
    expect(await changed(browser(t.app))).toBeNull()
    expect(await changed(client)).toBeNull()
    // a visit that didn't happen isn't one
    await visit('YR-997040', '2026-09-01', { status: 'cancelled', cancelledBy: 'client' })
    expect(await changed(client)).toBeNull()
  })

  it('a visit before the move: the new address with the one it moved from; the hours and phone changed since too', async () => {
    // confirmed and ended counts as completed, as every screen shows it
    await visit('YR-997041', '2026-09-01', { status: 'confirmed' })
    expect(await changed(client)).toEqual({ address: { was: 'Görogly köçesi 52, 1-nji gat' }, hours: false, phone: false })
    // a home-based business's old place is told by its street, as its page tells the new one
    await db.update(businesses).set({ hideExactAddress: true }).where(eq(businesses.id, glow.id))
    expect((await changed(client)).address).toEqual({ was: 'Görogly köçesi' })
    await db.update(businesses).set({ hideExactAddress: false }).where(eq(businesses.id, glow.id))

    await updateHours(
      t.deps,
      glow.id,
      { hours: weekOf(glow.hours).map((d, i) => (i === 4 && d ? { open: 600, close: 1140, break: null } : d)), specialDays: [] },
      'en',
    )
    await updateProfile(t.deps, glow.id, { phone: '+99312000040' }, 'en')
    expect(await changed(client)).toEqual({ address: { was: 'Görogly köçesi 52, 1-nji gat' }, hours: true, phone: true })
  })

  it("saving the same week or the same phone isn't a change", async () => {
    const [before] = await db.select().from(businesses).where(eq(businesses.id, glow.id))
    await updateHours(t.deps, glow.id, { hours: weekOf(before!.hours), specialDays: [] }, 'en')
    await updateProfile(t.deps, glow.id, { phone: before!.phone }, 'en')
    const [after] = await db.select().from(businesses).where(eq(businesses.id, glow.id))
    expect(after!.hoursChangedAt).toEqual(before!.hoursChangedAt)
    expect(after!.phoneChangedAt).toEqual(before!.phoneChangedAt)
  })

  it('a visit after the changes, or an own booking made since them, has nothing new to tell (once per change)', async () => {
    const tenth = new Date(Date.parse('2026-10-10T08:00:00Z'))
    await db.update(businesses).set({ hoursChangedAt: tenth, phoneChangedAt: tenth }).where(eq(businesses.id, glow.id))
    await visit('YR-997042', '2026-10-13')
    expect(await changed(client)).toBeNull()
    await db.delete(bookings).where(eq(bookings.code, 'YR-997042'))
    expect(await changed(client)).not.toBeNull()
    // booked with the tick just now: the next booking doesn't ask again
    await visit('YR-997043', '2026-10-20', { status: 'pending', createdAt: new Date(DEMO_NOW) })
    expect(await changed(client)).toBeNull()
    await db.delete(bookings).where(eq(bookings.code, 'YR-997043'))
    // a visit the team entered for this number counts as theirs
    await visit('YR-997044', '2026-10-13', { userId: null, source: 'phone' })
    expect(await changed(client)).toBeNull()
  })
})
