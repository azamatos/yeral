/**
 * "Try the business app" (book F-242): a day in the demo workspace as its owner, without signing in; a demo account
 * tries the demo workspace and nothing else, and every number it types is a made-up one.
 */
import { eq } from 'drizzle-orm'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { DEMO_NOW, testApp } from '../../../test/app'
import { browser } from '../../../test/client'
import { testDatabase } from '../../../test/db'
import type { Db } from '../../db/client'
import { rateLimits, sessions, users } from '../../db/schema'
import { demoPhones, seed } from '../../db/seed'
import { DAY } from '../auth/session'
import { runDueJobs } from '../jobs/run'
import { DEMO_SESSIONS_PER_HOUR } from './routes'

const MAYSA = demoPhones()('+99365102030') // the demo workspace's owner: a demo account
const AYJEMAL = '+99365901122' // development's demo client: a real account

describe('“Try the business app” (book F-242)', () => {
  let db: Db
  let t: ReturnType<typeof testApp>
  beforeAll(async () => {
    ;({ db } = await testDatabase())
    await seed(db, { demo: true, now: DEMO_NOW })
    await runDueJobs(testApp(db, { demoWorkspace: true }).deps)
  })
  beforeEach(async () => {
    await db.delete(rateLimits)
    t = testApp(db, { demoWorkspace: true })
  })
  const tryIt = async () => {
    const b = browser(t.app)
    const res = await b.req('/v1/demo/session', { method: 'POST' })
    return { b, res }
  }
  const sessionsOf = async (phone: string) => {
    const [u] = await db.select().from(users).where(eq(users.phone, phone))
    return db.select().from(sessions).where(eq(sessions.userId, u!.id))
  }

  it('signs the visitor in to the demo workspace as its owner, for a day; without the switch there’s none', async () => {
    expect((await browser(testApp(db).app).req('/v1/demo/session', { method: 'POST' })).json.error.code).toBe('not_found')
    const before = (await sessionsOf(MAYSA)).length
    const { b, res } = await tryIt()
    expect(res.status).toBe(200)
    expect(res.json).toMatchObject({ slug: 'demo', me: { phone: MAYSA, demo: true, canChangePhone: false } })
    expect((await b.req('/v1/me')).json).toMatchObject({ demo: true })
    const mine = (await b.req('/v1/me/workspaces')).json.items as { slug: string }[]
    expect(mine.map((w) => w.slug)).toEqual(['demo'])
    const made = (await sessionsOf(MAYSA)).sort((x, y) => y.expiresAt.getTime() - x.expiresAt.getTime())
    expect(made).toHaveLength(before + 1)
    expect(made[0]!.expiresAt.getTime()).toBe(DEMO_NOW + DAY)
  })

  it('whoever was signed in is signed out first', async () => {
    const b = browser(t.app)
    await b.login(AYJEMAL)
    expect(await sessionsOf(AYJEMAL)).toHaveLength(1)
    expect((await b.req('/v1/demo/session', { method: 'POST' })).status).toBe(200)
    expect(await sessionsOf(AYJEMAL)).toHaveLength(0)
    expect((await b.req('/v1/me')).json).toMatchObject({ phone: MAYSA, demo: true })
  })

  it('tries the demo workspace and nothing else', async () => {
    const { b } = await tryIt()
    // the demo workspace, as its owner; what anyone reads
    expect((await b.req('/v1/w/demo/team')).status).toBe(200)
    expect((await b.req('/v1/categories?lang=en')).status).toBe(200)
    const refused = async (path: string, init: { method?: string; body?: unknown } = {}) => {
      const res = await b.req(path, init)
      expect([path, res.status, res.json.error?.code]).toEqual([path, 403, 'not_in_demo'])
    }
    // the person's own things, another workspace, the client site's booking, setting a business up
    await refused('/v1/me/bookings?tab=upcoming&lang=en')
    await refused('/v1/me', { method: 'PATCH', body: { name: 'Visitor' } })
    await refused('/v1/w/glow-studio/team')
    await refused('/v1/bookings', { body: {} })
    await refused('/v1/setup', { body: { name: 'Mine', categoryId: 'beauty' } })
    // in the demo workspace: what reaches beyond it
    await refused('/v1/w/demo/team/invites', { body: { phone: '+99369000001', level: 'specialist', name: 'X' } })
    await refused('/v1/w/demo/leave', { method: 'POST' })
    await refused('/v1/w/demo/settings/logo', { method: 'PUT', body: {} })
    await refused('/v1/w/demo/settings/photos', { body: {} })
    await refused('/v1/w/demo/verification', { method: 'POST' })
    await refused('/v1/w/demo/reviews/00000000-0000-4000-8000-000000000000/report', { body: { reason: 'spam' } })
    // signing out works
    expect((await b.req('/v1/auth/logout', { method: 'POST' })).status).toBe(204)
  })

  it('types made-up numbers only, in the market’s unused range (book S-20: no visitor sees another’s)', async () => {
    const { b } = await tryIt()
    for (const phone of ['+99365811077', '65 81 10 77']) {
      const res = await b.req('/v1/w/demo/clients', { body: { phone, name: 'A real one' } })
      expect([res.status, res.json.error?.code, res.json.error?.details]).toEqual([400, 'demo_number', { prefix: '69' }])
    }
    const made = await b.req('/v1/w/demo/clients', { body: { phone: '+99369811077', name: 'Made up' } })
    expect(made.status, JSON.stringify(made.json)).toBe(201)
  })

  it('lasts a day and isn’t renewed; no demo number signs in by code', async () => {
    const { b } = await tryIt()
    t.clock.now = DEMO_NOW + DAY - 60_000
    expect((await b.req('/v1/me')).status).toBe(200)
    t.clock.now = DEMO_NOW + DAY + 60_000
    expect((await b.req('/v1/me')).status).toBe(401)
    expect((await browser(t.app).req('/v1/auth/code', { body: { phone: MAYSA } })).status).toBe(400)
  })

  it('so many demo sessions an hour from one address', async () => {
    for (let i = 0; i < DEMO_SESSIONS_PER_HOUR; i++) expect((await tryIt()).res.status).toBe(200)
    expect((await tryIt()).res.status).toBe(429)
  })
})
