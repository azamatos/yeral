import { and, eq, isNotNull, notInArray } from 'drizzle-orm'
import { beforeAll, describe, expect, it } from 'vitest'
import { DEMO_NOW, testApp } from '../../../test/app'
import { browser } from '../../../test/client'
import { testDatabase } from '../../../test/db'
import type { Db } from '../../db/client'
import { bookingRules, businesses, staff } from '../../db/schema'
import { seed } from '../../db/seed'
import { ExampleRefused, makeExample } from './examples'

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

  it('only while the sign-in code shows on the screen; taking one back always', async () => {
    await expect(makeExample(db, false, 'glow-studio', true)).rejects.toBeInstanceOf(ExampleRefused)
    expect(await makeExample(db, false, 'glow-studio', false)).toBe('unchanged')
    expect((await db.select().from(businesses).where(eq(businesses.id, glow.id)))[0]).toMatchObject({
      verification: 'pending',
      demo: false,
    })
  })

  it('opens it to clients marked "Example", keeping how it confirms; again changes nothing; --off takes it back to review', async () => {
    const [rules] = await db.select().from(bookingRules).where(eq(bookingRules.businessId, glow.id))
    expect(await makeExample(db, true, 'glow-studio', true)).toBe('opened')
    const [open] = await db.select().from(businesses).where(eq(businesses.id, glow.id))
    expect(open).toMatchObject({ verification: 'verified', demo: true })
    expect(await page()).toMatchObject({ status: 200, json: { example: true } })
    expect((await db.select().from(bookingRules).where(eq(bookingRules.businessId, glow.id)))[0]!.confirmMode).toBe(rules!.confirmMode)
    expect(await makeExample(db, true, 'glow-studio', true)).toBe('unchanged')

    // after the switch goes off, too
    expect(await makeExample(db, false, 'glow-studio', false)).toBe('closed')
    const [back] = await db.select().from(businesses).where(eq(businesses.id, glow.id))
    expect(back).toMatchObject({ verification: 'pending', demo: false })
    expect((await page()).status).toBe(404)
    expect(await makeExample(db, true, 'glow-studio', false)).toBe('unchanged')
  })

  it('refuses a business that isn’t one of the owner’s finished test businesses', async () => {
    await expect(makeExample(db, true, 'no-such-place', true)).rejects.toThrow(/no business at/)
    // a business nobody signs in to as its owner (a seeded example's like)
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
    await expect(makeExample(db, true, nobody!.slug, true)).rejects.toThrow(/no owner who signs in/)
    // one still being set up
    await db.update(businesses).set({ setupStep: 'hours' }).where(eq(businesses.id, glow.id))
    try {
      await expect(makeExample(db, true, 'glow-studio', true)).rejects.toThrow(/still being set up/)
    } finally {
      await db.update(businesses).set({ setupStep: null }).where(eq(businesses.id, glow.id))
    }
  })
})
