import { and, eq, isNotNull, notInArray } from 'drizzle-orm'
import { beforeAll, describe, expect, it } from 'vitest'
import { DEMO_NOW, testApp } from '../../../test/app'
import { browser } from '../../../test/client'
import { testDatabase } from '../../../test/db'
import type { Db } from '../../db/client'
import { bookingRules, businesses, events, staff, verificationHistory } from '../../db/schema'
import { seed, seedExamples } from '../../db/seed'
import { memorySms } from '../../ports/sms'
import { exampleArgs, ExampleRefused, makeExample } from './examples'

const shows = { codeOnScreen: true, sms: memorySms(), now: () => DEMO_NOW }
const off = { ...shows, codeOnScreen: false }

describe('make-example (the owner’s D2): one of the owner’s test businesses open to clients, marked "Example"', () => {
  let db: Db
  let glow: typeof businesses.$inferSelect

  beforeAll(async () => {
    ;({ db } = await testDatabase())
    await seed(db, { demo: true, now: DEMO_NOW })
    // Glow Studio plays the owner's test business: in review, not an example
    await db.update(businesses).set({ verification: 'pending', demo: false }).where(eq(businesses.slug, 'glow-studio'))
    glow = (await db.select().from(businesses).where(eq(businesses.slug, 'glow-studio')))[0]!
  })

  const page = () => browser(testApp(db).app).req('/v1/businesses/glow-studio?lang=en')
  const row = async () => (await db.select().from(businesses).where(eq(businesses.id, glow.id)))[0]!
  const reviewed = async () =>
    (
      await db
        .select()
        .from(events)
        .where(and(eq(events.type, 'business.reviewed'), eq(events.businessId, glow.id)))
    ).length
  const history = async () =>
    (await db.select().from(verificationHistory).where(eq(verificationHistory.businessId, glow.id))).map((h) => h.status)
  const set = (change: Partial<typeof businesses.$inferInsert>) => db.update(businesses).set(change).where(eq(businesses.id, glow.id))

  it('reads one page address and maybe --off; anything else is refused', () => {
    expect(exampleArgs(['glow-studio'])).toEqual({ slug: 'glow-studio', on: true })
    expect(exampleArgs(['glow-studio', '--off'])).toEqual({ slug: 'glow-studio', on: false })
    for (const flags of [[], ['--off'], ['glow-studio', '--of'], ['glow-studio', 'bag-kafe']])
      expect(() => exampleArgs(flags)).toThrow(ExampleRefused)
  })

  it('opens only while the sign-in code shows on the screen; taking one back always', async () => {
    await expect(makeExample(db, off, 'glow-studio', true)).rejects.toBeInstanceOf(ExampleRefused)
    // a gateway that delivers: the code doesn't show, whatever the switch says
    await expect(makeExample(db, { ...shows, sms: memorySms({ delivers: true }) }, 'glow-studio', true)).rejects.toThrow(/only while/)
    expect(await makeExample(db, off, 'glow-studio', false)).toMatchObject({ done: 'unchanged' })
    expect(await row()).toMatchObject({ verification: 'pending', demo: false })
  })

  it('opens it to clients marked "Example", keeping how it confirms and its phone; again changes nothing; --off takes it back', async () => {
    const [rules] = await db.select().from(bookingRules).where(eq(bookingRules.businessId, glow.id))
    const heard = await reviewed()
    expect(await makeExample(db, shows, 'glow-studio', true)).toMatchObject({ done: 'opened' })
    expect(await row()).toMatchObject({ verification: 'verified', demo: true })
    expect(await page()).toMatchObject({ status: 200, json: { example: true } })
    expect((await db.select().from(bookingRules).where(eq(bookingRules.businessId, glow.id)))[0]!.confirmMode).toBe(rules!.confirmMode)
    // its team's banner and its page hear it
    expect(await reviewed()).toBe(heard + 1)
    expect(await history()).toEqual(['verified'])
    expect(await makeExample(db, shows, 'glow-studio', true)).toMatchObject({ done: 'unchanged' })
    expect(await reviewed()).toBe(heard + 1)
    // every deploy's examples step leaves its phone alone, though it sits at a design address
    await seedExamples(db, { now: DEMO_NOW, phone: '+99312000000' })
    expect((await row()).phone).toBe(glow.phone)

    // after the switch goes off, too
    expect(await makeExample(db, off, 'glow-studio', false)).toMatchObject({ done: 'closed' })
    expect(await row()).toMatchObject({ verification: 'pending', demo: false })
    expect((await page()).status).toBe(404)
    expect(await reviewed()).toBe(heard + 2)
    expect((await history()).sort()).toEqual(['pending', 'verified'])
    expect(await makeExample(db, off, 'glow-studio', false)).toMatchObject({ done: 'unchanged' })
  })

  it('takes the mark away from one the Ýeral team sent back meanwhile, keeping their verdict', async () => {
    expect(await makeExample(db, shows, 'glow-studio', true)).toMatchObject({ done: 'opened' })
    await set({ verification: 'rejected', verificationReason: 'No photos of the place' })
    expect(await makeExample(db, shows, 'glow-studio', false)).toMatchObject({ done: 'closed' })
    expect(await row()).toMatchObject({ verification: 'rejected', verificationReason: 'No photos of the place', demo: false })
    await set({ verification: 'pending', verificationReason: null })
  })

  it('refuses what isn’t one of the owner’s test businesses in review', async () => {
    await expect(makeExample(db, shows, 'no-such-place', true)).rejects.toThrow(/no business at/)
    // a business nobody signs in to as its owner (a seeded example's like), either way
    const owned = db
      .select({ id: staff.businessId })
      .from(staff)
      .where(and(eq(staff.level, 'owner'), isNotNull(staff.userId)))
    const [nobody] = await db
      .select()
      .from(businesses)
      .where(and(notInArray(businesses.id, owned), eq(businesses.sandbox, false)))
      .limit(1)
    expect(nobody).toBeDefined()
    for (const on of [true, false]) await expect(makeExample(db, shows, nobody!.slug, on)).rejects.toThrow(/no owner who signs in/)
    // the demo workspace
    const [sandbox] = await db.select().from(businesses).where(eq(businesses.sandbox, true))
    if (sandbox) await expect(makeExample(db, shows, sandbox.slug, true)).rejects.toThrow(/demo workspace/)
    // still being set up, closed, hidden, or the team's verdict given
    const at = new Date(DEMO_NOW)
    for (const [change, refusal] of [
      [{ setupStep: 'hours' }, /still being set up/],
      [{ closedAt: at }, /is closed/],
      [{ hiddenAt: at }, /hidden by the Ýeral team/],
      [{ verification: 'verified' }, /verified by the Ýeral team/],
      [{ verification: 'rejected' }, /rejected by the Ýeral team/],
    ] as const) {
      await set(change)
      try {
        await expect(makeExample(db, shows, 'glow-studio', true)).rejects.toThrow(refusal)
      } finally {
        await set({ setupStep: null, closedAt: null, hiddenAt: null, verification: 'pending' })
      }
    }
    expect(await row()).toMatchObject({ demo: false, verification: 'pending' })
  })
})
