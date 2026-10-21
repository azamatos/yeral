/** The admin tool's businesses (book F-179, S-17, B-11; Q-274, Q-275, Q-012, Q-215). */
import { epochOf, localOf } from '@yeral/domain/time'
import { and, eq, sql } from 'drizzle-orm'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { cmsBrowser, signedInAdmin } from '../../../test/admin'
import { DEMO_NOW, site, testApp } from '../../../test/app'
import { browser, eventsAfter } from '../../../test/client'
import { testDatabase } from '../../../test/db'
import type { Db } from '../../db/client'
import { businesses, jobs, rateLimits } from '../../db/schema'
import { seed } from '../../db/seed'

const MAYSA = '+99365102030' // owner of Glow Studio
const AYNA = '+99365312210' // a specialist there
const ADMIN = '/v1/admin/businesses'

describe('the admin tool’s businesses (book F-179)', () => {
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
  const as = async (phone: string, name?: string) => {
    const b = browser(t.app)
    await b.login(phone, name)
    return b
  }
  const page = async () => (await browser(t.app).req('/v1/businesses/glow-studio?lang=en')).status
  /** The SMS queued for the owner, the last queued first. */
  const smsTo = async (phone: string) =>
    (
      await db
        .select()
        .from(jobs)
        .where(and(eq(jobs.kind, 'sms'), sql`${jobs.payload}->>'to' = ${phone}`))
    ).sort((x, y) => y.id - x.id) as unknown as {
      runAt: Date
      payload: { text: string }
    }[]

  it('the queue: finished businesses waiting, oldest first, never a draft; verified, it’s public and the owner hears it', async () => {
    const team = await signedInAdmin(t, 'verifier', 'Verifier')
    await db
      .update(businesses)
      .set({ verification: 'pending', sentForReviewAt: new Date(DEMO_NOW - 3_600_000) })
      .where(eq(businesses.id, glowId))
    // someone's setup still in progress
    const drafter = await as('+99365930011', 'Draft')
    await drafter.req('/v1/setup', { body: { name: 'Half Done', categoryId: 'beauty' } })
    const queue = (await team.req(`${ADMIN}?view=review&lang=en`)).json.items as { slug: string; owner: { phone: string } | null }[]
    expect(queue.map((b) => b.slug)).toContain('glow-studio')
    expect(queue.map((b) => b.slug)).not.toContain('half-done')
    expect(queue.find((b) => b.slug === 'glow-studio')!.owner).toMatchObject({ phone: MAYSA })
    expect(await page()).toBe(404)
    // what the team checks first (Q-276)
    const detail = await team.req(`${ADMIN}/${glowId}?lang=en`)
    expect(detail.json).toMatchObject({ slug: 'glow-studio', phone: expect.stringMatching(/^\+993/), verification: 'pending' })
    expect(detail.json.photos.length).toBeGreaterThan(0)
    expect(detail.json.services).toBeGreaterThan(0)
    const maysa = await as(MAYSA)
    const cursor = (await maysa.req('/v1/events')).json.cursor as string
    expect((await team.req(`${ADMIN}/${glowId}/verify`, { method: 'POST' })).status).toBe(204)
    expect(await page()).toBe(200)
    const [sms] = await smsTo(MAYSA)
    expect(sms!.payload.text).toBe(`Ýeral: Glow Studio is open: clients find it in search and at ${site.urls.client}/b/glow-studio`)
    // by day it goes at once
    expect(sms!.runAt.getTime()).toBe(DEMO_NOW)
    const heard = await eventsAfter(maysa, cursor, (items) => items.some((e) => e.type === 'business.reviewed'))
    expect((heard.json.items as { type: string }[]).map((e) => e.type)).toContain('business.reviewed')
    const after = (await team.req(`${ADMIN}/${glowId}?lang=en`)).json
    expect(after.history[0]).toMatchObject({ status: 'verified' })
    expect(after.actions[0]).toMatchObject({ action: 'business.verified', by: 'Verifier' })
    expect((await team.req(`${ADMIN}/${glowId}/verify`, { method: 'POST' })).json.error.code).toBe('invalid_status')
    // a draft isn't the team's to open
    const [draft] = await db.select().from(businesses).where(eq(businesses.slug, 'half-done'))
    expect((await team.req(`${ADMIN}/${draft!.id}?lang=en`)).status).toBe(404)
  })

  it('sent back with a reason, a live page closes; the owner fixes it and sends it again, at night told in the morning', async () => {
    // 23:20 at the business
    t.clock.now = DEMO_NOW + 12 * 3_600_000
    const team = await signedInAdmin(t, 'checker')
    expect((await team.req(`${ADMIN}/${glowId}/reject`, { body: { reason: '' } })).status).toBe(400)
    expect((await team.req(`${ADMIN}/${glowId}/reject`, { body: { reason: 'The address is incomplete' } })).status).toBe(204)
    expect((await browser(t.app).req('/v1/businesses/glow-studio?lang=en')).json.error.code).toBe('in_review')
    const maysa = await as(MAYSA)
    expect((await maysa.req('/v1/businesses/glow-studio?lang=en')).json.preview).toEqual({
      status: 'rejected',
      reason: 'The address is incomplete',
    })
    const [sms] = await smsTo(MAYSA)
    expect(sms!.payload.text).toBe(
      `Ýeral: Glow Studio isn't open yet: The address is incomplete. Fix it in your workspace and send it again: ${site.urls.business}`,
    )
    expect(sms!.runAt.getTime()).toBe(epochOf(localOf(t.clock.now + 86_400_000).date, 8 * 60))
    expect((await team.req(`${ADMIN}/${glowId}?lang=en`)).json.actions[0]).toMatchObject({
      action: 'business.unverified',
      reason: 'The address is incomplete',
    })
    // the owner sends it again; a specialist can't
    expect((await (await as(AYNA)).req('/v1/w/glow-studio/verification', { method: 'POST' })).status).toBe(403)
    expect((await maysa.req('/v1/w/glow-studio/verification', { method: 'POST' })).status).toBe(204)
    expect((await maysa.req('/v1/w/glow-studio/verification', { method: 'POST' })).json.error.code).toBe('invalid_status')
    const queue = (await team.req(`${ADMIN}?view=review&lang=en`)).json.items as {
      slug: string
      sentForReviewAt: number
      reason: string | null
    }[]
    expect(queue.find((b) => b.slug === 'glow-studio')).toMatchObject({ sentForReviewAt: t.clock.now, reason: null })
    await team.req(`${ADMIN}/${glowId}/verify`, { method: 'POST' })
  })

  it('hidden: out of search and its page closed to visitors, its team told why; shown again', async () => {
    const team = await signedInAdmin(t, 'hider')
    expect((await team.req(`${ADMIN}/${glowId}/hide`, { body: { reason: 'Clients complain about fake photos' } })).status).toBe(204)
    expect(await page()).toBe(404)
    const found = (await browser(t.app).req('/v1/search?q=Glow&lang=en')).json.items as { slug: string }[]
    expect(found.map((b) => b.slug)).not.toContain('glow-studio')
    const maysa = await as(MAYSA)
    expect((await maysa.req('/v1/businesses/glow-studio?lang=en')).json.preview).toEqual({
      status: 'hidden',
      reason: 'Clients complain about fake photos',
    })
    // the team keeps working; only the owner reads the reason
    expect((await (await as(AYNA)).req('/v1/businesses/glow-studio?lang=en')).json.preview).toEqual({ status: 'hidden', reason: null })
    expect((await smsTo(MAYSA))[0]!.payload.text).toBe(
      "Ýeral: we've hidden Glow Studio's page for now: Clients complain about fake photos.",
    )
    expect((await team.req(`${ADMIN}?view=hidden&lang=en`)).json.items[0]).toMatchObject({
      slug: 'glow-studio',
      hidden: { reason: 'Clients complain about fake photos' },
    })
    expect((await team.req(`${ADMIN}/${glowId}/hide`, { body: { reason: 'Again' } })).json.error.code).toBe('invalid_status')
    expect((await team.req(`${ADMIN}/${glowId}/show`, { method: 'POST' })).status).toBe(204)
    expect(await page()).toBe(200)
    expect((await smsTo(MAYSA))[0]!.payload.text).toBe("Ýeral: Glow Studio's page is open again.")
  })

  it('a business that moved is checked again: it stays public, and nobody is told', async () => {
    const team = await signedInAdmin(t, 'mover')
    await db
      .update(businesses)
      .set({ addressChangedAt: new Date(DEMO_NOW) })
      .where(eq(businesses.id, glowId))
    const sent = (await smsTo(MAYSA)).length
    expect(((await team.req(`${ADMIN}?view=moved&lang=en`)).json.items as { slug: string }[]).map((b) => b.slug)).toContain('glow-studio')
    expect((await team.req(`${ADMIN}/${glowId}/verify`, { method: 'POST' })).status).toBe(204)
    expect(((await team.req(`${ADMIN}?view=moved&lang=en`)).json.items as { slug: string }[]).map((b) => b.slug)).not.toContain(
      'glow-studio',
    )
    expect(await smsTo(MAYSA)).toHaveLength(sent)
    expect((await team.req(`${ADMIN}/${glowId}?lang=en`)).json.actions[0]).toMatchObject({ action: 'business.move_checked' })
    // a search across them all
    const found = (await team.req(`${ADMIN}?view=all&q=glow&lang=en`)).json.items as { slug: string; name: string }[]
    expect(found.map((b) => b.slug)).toContain('glow-studio')
    expect(found.every((b) => /glow/i.test(b.name + b.slug))).toBe(true)
  })

  it('only the Ýeral team', async () => {
    const owner = await as(MAYSA)
    expect((await owner.req(`${ADMIN}?view=review&lang=en`, { headers: { Origin: site.urls.cms } })).status).toBe(401)
    expect((await cmsBrowser(t).req(`${ADMIN}/${glowId}/verify`, { method: 'POST' })).status).toBe(401)
  })
})
