/** Setting a business up (book B-02–B-06, Q-200): the draft, its step at sign-in, filling it in, finishing. */
import { and, eq } from 'drizzle-orm'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { DEMO_NOW, testApp } from '../../../test/app'
import { browser } from '../../../test/client'
import { testDatabase } from '../../../test/db'
import type { Db } from '../../db/client'
import { businesses, rateLimits, staff } from '../../db/schema'
import { seed } from '../../db/seed'

describe('setting a business up (book B-02–B-06, Q-200)', () => {
  let db: Db
  let t: ReturnType<typeof testApp>
  beforeAll(async () => {
    ;({ db } = await testDatabase())
    await seed(db, { demo: true, now: DEMO_NOW })
  })
  beforeEach(async () => {
    await db.delete(rateLimits)
    t = testApp(db)
  })
  const as = async (phone: string, name = 'Owner') => {
    const b = browser(t.app)
    await b.login(phone, name)
    return b
  }

  it('the draft from step 2: its page address, the wizard’s step at sign-in, one at a time, out of the switcher', async () => {
    const owner = await as('+99365930001', 'Aýna')
    const started = await owner.req('/v1/setup', { body: { name: 'Aýna Beauty', categoryId: 'beauty' } })
    expect(started.status).toBe(201)
    expect(started.json).toEqual({ slug: 'ayna-beauty' })
    expect((await owner.req('/v1/me/setup')).json).toEqual({ setup: { slug: 'ayna-beauty', name: 'Aýna Beauty', step: 'address' } })
    const again = await owner.req('/v1/setup', { body: { name: 'Second', categoryId: 'beauty' } })
    expect(again.json.error).toMatchObject({ code: 'setup_in_progress', details: { slug: 'ayna-beauty' } })
    // not in the switcher, no "Biznes" link, not public
    expect((await owner.req('/v1/me/workspaces')).json.items).toEqual([])
    expect((await owner.req('/v1/me')).json.hasBusiness).toBe(false)
    expect((await browser(t.app).req('/v1/businesses/ayna-beauty')).status).toBe(404)
    // the wizard moves on, and reopens there
    expect((await owner.req('/v1/w/ayna-beauty/setup', { method: 'PUT', body: { step: 'hours' } })).status).toBe(204)
    expect((await owner.req('/v1/me/setup')).json.setup.step).toBe('hours')
    // another business of that name gets the next address; tables wait for later
    const other = await as('+99365930002')
    expect((await other.req('/v1/setup', { body: { name: 'Glow Studio', categoryId: 'nails' } })).json).toEqual({ slug: 'glow-studio-2' })
    const third = await as('+99365930003')
    expect((await third.req('/v1/setup', { body: { name: 'Bag', categoryId: 'restaurant' } })).status).toBe(400)
  })

  it('filled in through the settings, finished with an address, an open day and a service; then a workspace in review', async () => {
    const owner = await as('+99365930010', 'Merjen')
    const { slug } = (await owner.req('/v1/setup', { body: { name: 'Merjen Nails', categoryId: 'nails' } })).json as { slug: string }
    const W = `/v1/w/${slug}`
    const early = await owner.req(`${W}/setup/finish`, { method: 'POST' })
    expect(early.json.error).toMatchObject({ code: 'setup_incomplete', details: { missing: ['address', 'hours', 'services'] } })
    // the first address isn't a move: no "New address", no SMS
    const location = { cityId: 'ashgabat', address: 'Magtymguly şaýoly 5', street: 'Magtymguly şaýoly', lat: 37.95, lng: 58.37 }
    expect((await owner.req(`${W}/settings/profile`, { method: 'PATCH', body: { location } })).status).toBe(200)
    const [draft] = await db.select().from(businesses).where(eq(businesses.slug, slug))
    expect(draft).toMatchObject({ movedAt: null, addressChangedAt: null, street: 'Magtymguly şaýoly' })
    const day = { open: 600, close: 1140, break: null }
    const hours = await owner.req(`${W}/settings/hours`, {
      method: 'PUT',
      body: { hours: [day, day, day, day, day, null, null], specialDays: [] },
    })
    expect(hours.status).toBe(200)
    const [me] = await db
      .select()
      .from(staff)
      .where(and(eq(staff.businessId, draft!.id), eq(staff.level, 'owner')))
    expect(me).toMatchObject({ name: 'Merjen', bookable: true, hasApp: true })
    const group = await owner.req(`${W}/services/groups`, { body: { name: { en: 'Nails' } } })
    const service = await owner.req(`${W}/services`, {
      body: { groupId: group.json.id, name: { en: 'Manicure' }, durationMin: 60, priceType: 'fixed', priceAmount: 80, staffIds: [me!.id] },
    })
    expect(service.status).toBe(201)
    expect((await owner.req(`${W}/setup/finish`, { method: 'POST' })).status).toBe(204)
    // a workspace now, in review: not public until Ýeral verifies it
    expect((await owner.req('/v1/me/setup')).json).toEqual({ setup: null })
    expect((await owner.req('/v1/me/workspaces')).json.items.map((w: { slug: string }) => w.slug)).toEqual([slug])
    expect((await owner.req('/v1/me')).json.hasBusiness).toBe(true)
    expect((await db.select().from(businesses).where(eq(businesses.slug, slug)))[0]).toMatchObject({
      setupStep: null,
      verification: 'pending',
    })
    expect((await owner.req(`${W}/setup`, { method: 'PUT', body: { step: 'team' } })).json.error.code).toBe('invalid_status')
    // the next business can be started now
    expect((await owner.req('/v1/setup', { body: { name: 'Merjen Nails Two', categoryId: 'nails' } })).status).toBe(201)
  })
})
