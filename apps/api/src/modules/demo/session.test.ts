/**
 * "Try the business app" (book F-242): a day in the demo workspace as its owner, in a cookie of its own that the
 * business app reads first, so the client site keeps the person's own session; a demo account tries the demo
 * workspace and nothing else, and every number it types is a made-up one.
 */
import { eq } from 'drizzle-orm'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { DEMO_NOW, site, testApp } from '../../../test/app'
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
const BUSINESS = { Origin: site.urls.business }

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
  /** The business app in one browser: its requests carry its Origin. */
  const businessApp = (b = browser(t.app)) => ({
    b,
    req: (path: string, init: { method?: string; body?: unknown; headers?: Record<string, string> } = {}) =>
      b.req(path, { ...init, headers: { ...BUSINESS, ...init.headers } }),
  })
  const tryIt = async (b = browser(t.app)) => {
    const app = businessApp(b)
    return { ...app, res: await app.req('/v1/demo/session', { method: 'POST' }) }
  }
  const sessionsOf = async (phone: string) => {
    const [u] = await db.select().from(users).where(eq(users.phone, phone))
    return db.select().from(sessions).where(eq(sessions.userId, u!.id))
  }

  it('signs the visitor in to the demo workspace as its owner, for a day; without the switch there’s none', async () => {
    const off = browser(testApp(db).app)
    expect((await off.req('/v1/demo/session', { method: 'POST', headers: BUSINESS })).json.error.code).toBe('not_found')
    const before = (await sessionsOf(MAYSA)).length
    const { req, res } = await tryIt()
    expect(res.status).toBe(200)
    expect(res.json).toMatchObject({ slug: 'demo', me: { phone: MAYSA, demo: true, canChangePhone: false } })
    expect((await req('/v1/me')).json).toMatchObject({ demo: true })
    const mine = (await req('/v1/me/workspaces')).json.items as { slug: string }[]
    expect(mine.map((w) => w.slug)).toEqual(['demo'])
    const made = (await sessionsOf(MAYSA)).sort((x, y) => y.expiresAt.getTime() - x.expiresAt.getTime())
    expect(made).toHaveLength(before + 1)
    expect(made[0]!.expiresAt.getTime()).toBe(DEMO_NOW + DAY)
  })

  it('keeps the person’s own session: the client site stays theirs, and leaving the demo brings the business app back to it', async () => {
    const b = browser(t.app)
    await b.login(AYJEMAL)
    const { req } = await tryIt(b)
    expect(await sessionsOf(AYJEMAL)).toHaveLength(1)
    expect((await req('/v1/me')).json).toMatchObject({ phone: MAYSA, demo: true })
    // the client site reads only the person's own cookie
    expect((await b.req('/v1/me')).json).toMatchObject({ phone: AYJEMAL, demo: false })
    // trying it again ends the earlier demo session, not hers
    const demoBefore = (await sessionsOf(MAYSA)).length
    await req('/v1/demo/session', { method: 'POST' })
    expect(await sessionsOf(MAYSA)).toHaveLength(demoBefore)
    expect(await sessionsOf(AYJEMAL)).toHaveLength(1)
    // "Log in" in the demo: it ends, and the business app is hers again
    expect((await req('/v1/auth/logout', { method: 'POST' })).status).toBe(204)
    expect((await req('/v1/me')).json).toMatchObject({ phone: AYJEMAL })
  })

  it('a real sign-in from the demo ends the demo’s session', async () => {
    const { b, req } = await tryIt()
    const demoBefore = (await sessionsOf(MAYSA)).length
    expect((await req('/v1/auth/code', { body: { phone: AYJEMAL } })).status).toBe(200)
    expect((await req('/v1/auth/verify', { body: { phone: AYJEMAL, code: '1234' } })).status).toBe(200)
    expect(await sessionsOf(MAYSA)).toHaveLength(demoBefore - 1)
    expect((await req('/v1/me')).json).toMatchObject({ phone: AYJEMAL })
    expect((await b.req('/v1/me')).json).toMatchObject({ phone: AYJEMAL })
  })

  it('tries the demo workspace and nothing else', async () => {
    const { req } = await tryIt()
    // the demo workspace as its owner; what its own account has; what anyone reads; what the business app marks
    expect((await req('/v1/w/demo/team')).status).toBe(200)
    expect((await req('/v1/me/invites')).status).toBe(200)
    expect((await req('/v1/categories?lang=en')).status).toBe(200)
    expect((await req('/v1/me/workspaces/demo/open', { method: 'POST' })).status).toBe(204)
    // the admin tool has sessions of its own: the demo doesn't stand in their way
    expect((await req('/v1/admin/me')).json.error.code).not.toBe('not_in_demo')
    const refused = async (path: string, init: { method?: string; body?: unknown } = {}) => {
      const res = await req(path, init)
      expect([path, res.status, res.json?.error?.code]).toEqual([path, 403, 'not_in_demo'])
    }
    // the person's own changes, another workspace, the client site's booking, setting a business up
    await refused('/v1/me', { method: 'PATCH', body: { name: 'Visitor' } })
    await refused('/v1/me/workspaces/glow-studio/open', { method: 'POST' })
    await refused('/v1/w/glow-studio/team')
    await refused('/v1/bookings', { body: {} })
    await refused('/v1/setup', { body: { name: 'Mine', categoryId: 'beauty' } })
    // in the demo workspace: what reaches beyond it, and what isn't a day's work there (a route added later too)
    await refused('/v1/w/demo/team/invites', { body: { phone: '+99369000001', level: 'specialist', name: 'X' } })
    await refused('/v1/w/demo/leave', { method: 'POST' })
    await refused('/v1/w/demo/settings/logo', { method: 'PUT', body: {} })
    await refused('/v1/w/demo/settings/photos', { body: {} })
    await refused('/v1/w/demo/verification', { method: 'POST' })
    await refused('/v1/w/demo/reviews/00000000-0000-4000-8000-000000000000/report', { body: { reason: 'spam' } })
    await refused('/v1/w/demo/import', { body: {} })
  })

  it('types made-up numbers only, in the market’s unused range (book S-20: no visitor sees another’s)', async () => {
    const { req } = await tryIt()
    const refusal = { status: 400, code: 'demo_number', details: { prefix: '69' } }
    for (const [phone, type] of [
      ['+99365811077', 'application/json'],
      ['65 81 10 77', 'Application/JSON; charset=utf-8'],
      ['+99365811077', 'application/merge-patch+json'],
    ] as const) {
      const res = await req('/v1/w/demo/clients', { body: { phone, name: 'A real one' }, headers: { 'Content-Type': type } })
      expect({ status: res.status, code: res.json.error?.code, details: res.json.error?.details }).toEqual(refusal)
    }
    // a team's booking by phone, through its route: a real number never gets in
    const booked = await req('/v1/w/demo/bookings', { body: { source: 'phone', phone: '+99365811078', serviceIds: [], start: 600 } })
    expect({ status: booked.status, code: booked.json.error?.code, details: booked.json.error?.details }).toEqual(refusal)
    // nor inside a text: a name, a note
    const noted = await req('/v1/w/demo/clients', { body: { phone: '+99369811076', name: 'Aman, call 8 65 81 10 79' } })
    expect({ status: noted.status, code: noted.json.error?.code, details: noted.json.error?.details }).toEqual(refusal)
    // ids, dates and made-up numbers pass
    const made = await req('/v1/w/demo/clients', {
      body: { phone: '+99369811077', name: 'Made up, also on +993 69 81 10 78', birthday: '1990-05-17' },
    })
    expect(made.status, JSON.stringify(made.json)).toBe(201)
    // taking a photo or the logo away reaches nothing beyond the demo
    expect((await req('/v1/w/demo/settings/logo', { method: 'DELETE' })).json?.error?.code).not.toBe('not_in_demo')
  })

  it('lasts a day and isn’t renewed; no demo number signs in by code', async () => {
    const { req } = await tryIt()
    t.clock.now = DEMO_NOW + DAY - 60_000
    expect((await req('/v1/me')).status).toBe(200)
    t.clock.now = DEMO_NOW + DAY + 60_000
    expect((await req('/v1/me')).status).toBe(401)
    expect((await browser(t.app).req('/v1/auth/code', { body: { phone: MAYSA } })).status).toBe(400)
  })

  it('keeps its page address: one visitor doesn’t move everyone’s demo (chapter 9, 25.10.2026)', async () => {
    const { req } = await tryIt()
    expect((await req('/v1/w/demo/settings/page-address', { method: 'PUT', body: { slug: 'my-demo' } })).status).toBe(403)
    expect((await req('/v1/me/workspaces')).json.items.map((w: { slug: string }) => w.slug)).toEqual(['demo'])
  })

  it('so many demo sessions an hour from one address', async () => {
    for (let i = 0; i < DEMO_SESSIONS_PER_HOUR; i++) expect((await tryIt()).res.status).toBe(200)
    expect((await tryIt()).res.status).toBe(429)
  })
})
