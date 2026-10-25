/** The admin tool's businesses (book F-179, S-17, B-11; Q-274, Q-275, Q-012, Q-215). */
import { epochOf, localOf } from '@yeral/domain/time'
import { and, eq, sql } from 'drizzle-orm'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { cmsBrowser, signedInAdmin } from '../../../test/admin'
import { DEMO_NOW, site, testApp } from '../../../test/app'
import { browser, eventsAfter } from '../../../test/client'
import { testDatabase } from '../../../test/db'
import type { Db } from '../../db/client'
import { bookings, businesses, jobs, rateLimits, services, staff, users } from '../../db/schema'
import { seed } from '../../db/seed'
import { runDueJobs } from '../jobs/run'

const MAYSA = '+99365102030' // owner of Glow Studio
const AYNA = '+99365312210' // a specialist there
const ADMIN = '/v1/admin/businesses'
/** Links as SMS carry them, without the scheme. */
const bare = (url: string) => url.replace(/^https?:\/\//, '')

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
    // the logo too, once it has one (none in the demo)
    expect(detail.json.logo).toBeNull()
    expect(detail.json.services).toBeGreaterThan(0)
    const maysa = await as(MAYSA)
    const cursor = (await maysa.req('/v1/events')).json.cursor as string
    expect((await team.req(`${ADMIN}/${glowId}/verify`, { method: 'POST' })).status).toBe(204)
    expect(await page()).toBe(200)
    const [sms] = await smsTo(MAYSA)
    expect(sms!.payload.text).toBe(`Ýeral: Glow Studio is open: clients find it in search and at ${bare(site.urls.client)}/b/glow-studio`)
    // by day it goes at once
    expect(sms!.runAt.getTime()).toBe(DEMO_NOW)
    const heard = await eventsAfter(maysa, cursor, (items) => items.some((e) => e.type === 'business.reviewed'))
    expect((heard.json.items as { type: string }[]).map((e) => e.type)).toContain('business.reviewed')
    const after = (await team.req(`${ADMIN}/${glowId}?lang=en`)).json
    expect(after.history[0]).toMatchObject({ status: 'verified' })
    expect(after.actions[0]).toMatchObject({ action: 'business.verified', by: 'Verifier' })
    expect((await team.req(`${ADMIN}/${glowId}/verify`, { method: 'POST' })).json.error.code).toBe('invalid_status')
    // a draft is only to look at
    const [draft] = await db.select().from(businesses).where(eq(businesses.slug, 'half-done'))
    expect((await team.req(`${ADMIN}/${draft!.id}?lang=en`)).json).toMatchObject({ slug: 'half-done', setupStep: 'address' })
    expect((await team.req(`${ADMIN}/${draft!.id}/verify`, { method: 'POST' })).json.error.code).toBe('invalid_status')
  })

  it('while the sign-in code shows on the screen nothing is verified: the first launch has no real businesses (book Q-036)', async () => {
    const pilot = testApp(db, { codeOnScreen: true })
    const team = await signedInAdmin(pilot, 'pilot')
    await db
      .update(businesses)
      .set({ verification: 'pending', sentForReviewAt: new Date(DEMO_NOW) })
      .where(eq(businesses.id, glowId))
    const told = (await smsTo(MAYSA)).length
    try {
      const res = await team.req(`${ADMIN}/${glowId}/verify`, { method: 'POST' })
      expect(res.status).toBe(409)
      expect(res.json.error.code).toBe('verify_unavailable')
      const [glow] = await db.select().from(businesses).where(eq(businesses.id, glowId))
      expect(glow!.verification).toBe('pending')
      expect(await page()).toBe(404)
      expect(await smsTo(MAYSA)).toHaveLength(told)
    } finally {
      await db.update(businesses).set({ verification: 'verified', sentForReviewAt: null }).where(eq(businesses.id, glowId))
    }
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
      `Ýeral: Glow Studio isn't open yet: The address is incomplete. Fix it in your workspace and send it again: ${bare(site.urls.business)}`,
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
    // at night a later word replaces the one waiting: the morning brings only "is open"
    const waiting = (await smsTo(MAYSA)).filter((m) => m.runAt.getTime() > t.clock.now)
    expect(waiting).toHaveLength(1)
    expect(waiting[0]!.payload.text).toMatch(/is open: clients find it/)
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

  it('while hidden: nothing new booked or moved online, its bookings kept; "open" said only once it is', async () => {
    const team = await signedInAdmin(t, 'hider.two')
    const maysa = await as(MAYSA)
    const [manicure] = (await db.select().from(services).where(eq(services.businessId, glowId))).filter((x) => x.name.en === 'Manicure')
    const [maral] = (await db.select().from(staff).where(eq(staff.businessId, glowId))).filter((x) => x.name === 'Maral')
    const client = await as('+99365800601', 'Client')
    const want = (start: number) => ({
      type: 'appointment',
      business: 'glow-studio',
      serviceIds: [manicure!.id],
      staffId: maral!.id,
      date: '2026-10-20',
      start,
    })
    const asked = await client.req('/v1/bookings', { body: want(840) })
    expect((await maysa.req(`/v1/w/glow-studio/requests/${asked.json.code}/confirm`, { method: 'POST', body: {} })).status).toBe(204)
    await team.req(`${ADMIN}/${glowId}/hide`, { body: { reason: 'Checking complaints' } })
    expect((await client.req('/v1/bookings', { body: want(900) })).json.error.code).toBe('not_found')
    expect((await browser(t.app).req('/v1/businesses/glow-studio/reviews?lang=en')).status).toBe(404)
    // the booking stays, and is moved by phone only
    expect((await client.req(`/v1/me/bookings/${asked.json.code}`)).json).toMatchObject({
      status: 'confirmed',
      bookOnline: false,
      actions: { reschedule: false },
    })
    const move = await client.req(`/v1/me/bookings/${asked.json.code}/reschedule`, { body: { date: '2026-10-20', start: 900 } })
    expect(move.json.error.code).toBe('online_disabled')
    // verified while hidden: no "is open" yet; shown while not verified: no "open again"
    const sent = (await smsTo(MAYSA)).length
    await db.update(businesses).set({ verification: 'pending' }).where(eq(businesses.id, glowId))
    expect((await team.req(`${ADMIN}/${glowId}/verify`, { method: 'POST' })).status).toBe(204)
    expect(await smsTo(MAYSA)).toHaveLength(sent)
    await team.req(`${ADMIN}/${glowId}/reject`, { body: { reason: 'Photos' } })
    expect((await team.req(`${ADMIN}/${glowId}/show`, { method: 'POST' })).status).toBe(204)
    expect((await smsTo(MAYSA))[0]!.payload.text).toMatch(/isn't open yet: Photos/)
    // a long reason: its start in the SMS, whole on the screen
    await team.req(`${ADMIN}/${glowId}/verify`, { method: 'POST' })
    await team.req(`${ADMIN}/${glowId}/reject`, { body: { reason: 'x'.repeat(400) } })
    expect((await smsTo(MAYSA))[0]!.payload.text).toContain(`${'x'.repeat(119)}…`)
    expect((await maysa.req('/v1/w/glow-studio/settings/profile')).json).toMatchObject({
      verificationReason: 'x'.repeat(400),
      hidden: null,
    })
    await team.req(`${ADMIN}/${glowId}/verify`, { method: 'POST' })
  })

  it('a business that moved is checked again: it stays public, and nobody is told', async () => {
    const team = await signedInAdmin(t, 'mover')
    await db
      .update(businesses)
      .set({ addressChangedAt: new Date(DEMO_NOW) })
      .where(eq(businesses.id, glowId))
    const sent = (await smsTo(MAYSA)).length
    const moved = (await team.req(`${ADMIN}?view=moved&lang=en`)).json.items as { slug: string; addressChangedAt: number }[]
    expect(moved.map((b) => b.slug)).toContain('glow-studio')
    // the move the team looked at, not an older or newer one
    expect((await team.req(`${ADMIN}/${glowId}/verify`, { method: 'POST' })).json.error.code).toBe('invalid_status')
    expect((await team.req(`${ADMIN}/${glowId}/verify?moved=${DEMO_NOW - 1}`, { method: 'POST' })).json.error.code).toBe('invalid_status')
    const seen = moved.find((b) => b.slug === 'glow-studio')!.addressChangedAt
    expect((await team.req(`${ADMIN}/${glowId}/verify?moved=${seen}`, { method: 'POST' })).status).toBe(204)
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

  it('closed as its owner asked: hidden from everyone, out of the switcher, its bookings ahead cancelled and told; opened again', async () => {
    const team = await signedInAdmin(t, 'closer')
    const maysa = await as(MAYSA)
    const [manicure] = (await db.select().from(services).where(eq(services.businessId, glowId))).filter((x) => x.name.en === 'Manicure')
    const [maral] = (await db.select().from(staff).where(eq(staff.businessId, glowId))).filter((x) => x.name === 'Maral')
    const TUE = '2026-10-20'
    const booked = await maysa.req('/v1/w/glow-studio/bookings', {
      body: {
        source: 'phone',
        phone: '+99365800501',
        serviceIds: [manicure!.id],
        staffId: maral!.id,
        date: TUE,
        start: 600,
        notifyClient: true,
      },
    })
    expect(booked.status).toBe(201)
    // its undo time over, so the client knows of it
    t.clock.now += 20_000
    const client = await as('+99365800502', 'Client')
    const asked = await client.req('/v1/bookings', {
      body: { type: 'appointment', business: 'glow-studio', serviceIds: [manicure!.id], staffId: maral!.id, date: TUE, start: 720 },
    })
    expect(asked.json.status).toBe('pending')
    // every booking ahead, these two among the demo's
    const ahead = (await db.select().from(bookings).where(eq(bookings.businessId, glowId))).filter(
      (r) => (r.status === 'pending' || r.status === 'confirmed') && epochOf(r.date, r.start) > t.clock.now,
    )
    const closed = await team.req(`${ADMIN}/${glowId}/close`, { body: { reason: 'The owner asked by phone' } })
    expect(closed.json).toEqual({ cancelled: ahead.length })
    // nobody sees it, its team included; it's out of the switcher
    expect(await page()).toBe(404)
    expect((await maysa.req('/v1/businesses/glow-studio?lang=en')).status).toBe(404)
    expect((await maysa.req('/v1/w/glow-studio/calendar?view=day&date=2026-10-20&lang=en')).status).toBe(404)
    expect(((await maysa.req('/v1/me/workspaces')).json.items as { slug: string }[]).map((w) => w.slug)).not.toContain('glow-studio')
    // its bookings ahead cancelled, each client told
    const rows = await db.select().from(bookings).where(eq(bookings.businessId, glowId))
    for (const code of [booked.json.code, asked.json.code])
      expect(rows.find((r) => r.code === code)).toMatchObject({ status: 'cancelled', businessCancelReason: 'business_closed' })
    expect((await client.req(`/v1/me/bookings/${asked.json.code}`)).json.businessCancel).toEqual({ reason: 'business_closed', text: null })
    // worded when they go, by the jobs
    await runDueJobs(t.deps)
    expect(t.sms.sent.filter((m) => m.to === '+99365800502').at(-1)!.text).toMatch(
      /cancelled your booking on .*: The business has closed\./,
    )
    expect((await smsTo(MAYSA))[0]!.payload.text).toMatch(/^Ýeral: Glow Studio is closed, as you asked/)
    expect((await team.req(`${ADMIN}?view=closed&lang=en`)).json.items[0]).toMatchObject({
      slug: 'glow-studio',
      closed: { reason: 'The owner asked by phone' },
    })
    // nothing else is done to a closed business but opening it again
    expect((await team.req(`${ADMIN}/${glowId}/hide`, { body: { reason: 'x' } })).json.error.code).toBe('invalid_status')
    expect((await team.req(`${ADMIN}/${glowId}/close`, { body: { reason: 'x' } })).json.error.code).toBe('invalid_status')
    expect((await team.req(`${ADMIN}/${glowId}/reopen`, { method: 'POST' })).status).toBe(204)
    expect(await page()).toBe(200)
    expect(((await maysa.req('/v1/me/workspaces')).json.items as { slug: string }[]).map((w) => w.slug)).toContain('glow-studio')
    expect((await db.select().from(bookings).where(eq(bookings.code, asked.json.code)))[0]!.status).toBe('cancelled')
  })

  it('once closed, nothing comes back by an offered time or an undo; its invitee hears it; its owner may leave', async () => {
    const team = await signedInAdmin(t, 'closer.two')
    const maysa = await as(MAYSA)
    const [manicure] = (await db.select().from(services).where(eq(services.businessId, glowId))).filter((x) => x.name.en === 'Manicure')
    const [maral] = (await db.select().from(staff).where(eq(staff.businessId, glowId))).filter((x) => x.name === 'Maral')
    const want = (start: number) => ({
      type: 'appointment',
      business: 'glow-studio',
      serviceIds: [manicure!.id],
      staffId: maral!.id,
      date: '2026-10-21',
      start,
    })
    // a request declined with an offered time, and a booking the client cancelled, its undo still open
    const declined = await as('+99365800701', 'Declined')
    const asked = await declined.req('/v1/bookings', { body: want(600) })
    const offer = { date: '2026-10-21', start: 720, staffId: maral!.id }
    expect(
      (await maysa.req(`/v1/w/glow-studio/requests/${asked.json.code}/decline`, { body: { reason: 'slot_busy', offers: [offer] } })).status,
    ).toBe(204)
    const undone = await as('+99365800702', 'Undone')
    const kept = await undone.req('/v1/bookings', { body: want(840) })
    await maysa.req(`/v1/w/glow-studio/requests/${kept.json.code}/confirm`, { method: 'POST', body: {} })
    await undone.req(`/v1/me/bookings/${kept.json.code}/cancel`, { body: {} })
    // an invitee with the invite on screen
    const invited = await maysa.req('/v1/w/glow-studio/team/invites', {
      body: { phone: '+99365800703', level: 'specialist', name: 'Invitee' },
    })
    expect(invited.status, JSON.stringify(invited.json)).toBe(201)
    const gulnar = await as('+99365800703')
    const cursor = (await gulnar.req('/v1/events')).json.cursor as string
    await team.req(`${ADMIN}/${glowId}/close`, { body: { reason: 'The owner asked' } })
    expect((await declined.req(`/v1/me/bookings/${asked.json.code}`)).json.decline.alternatives).toEqual([])
    expect((await declined.req(`/v1/me/bookings/${asked.json.code}/alternative`, { body: { source: 'decline', index: 0 } })).status).toBe(
      404,
    )
    expect((await undone.req(`/v1/me/bookings/${kept.json.code}/restore`, { method: 'POST' })).status).toBe(404)
    const heard = await eventsAfter(gulnar, cursor, (items) => items.some((e) => e.type === 'team.changed'))
    expect((heard.json.items as { type: string }[]).map((e) => e.type)).toContain('team.changed')
    // the owner of a closed workspace may let their account go (her other one closed too); with no owner it can't open again
    const owned = await db
      .select({ id: staff.businessId })
      .from(staff)
      .innerJoin(users, eq(users.id, staff.userId))
      .where(and(eq(users.phone, MAYSA), eq(staff.level, 'owner'), eq(staff.status, 'active')))
    for (const o of owned.filter((o) => o.id !== glowId)) await team.req(`${ADMIN}/${o.id}/close`, { body: { reason: 'The owner asked' } })
    expect((await maysa.req('/v1/me', { method: 'DELETE' })).status).toBe(204)
    expect((await team.req(`${ADMIN}/${glowId}/reopen`, { method: 'POST' })).json.error.code).toBe('invalid_status')
  })

  it('a business added for an owner the team met: a draft their first sign-in reopens (F-238)', async () => {
    const team = await signedInAdmin(t, 'adder', 'Adder')
    const OWNER = '+99365970001'
    const added = await team.req(ADMIN, {
      body: { name: 'Ogulgerek Beauty', categoryId: 'beauty', owner: { phone: '+993 65 97 00 01', name: 'Ogulgerek Amanowa' } },
    })
    expect(added.status).toBe(201)
    expect(added.json.slug).toBe('ogulgerek-beauty')
    const setups = (await team.req(`${ADMIN}?view=setup&lang=en`)).json.items as { slug: string; setupStep: string; owner: unknown }[]
    expect(setups.find((b) => b.slug === 'ogulgerek-beauty')).toMatchObject({
      setupStep: 'address',
      owner: { name: 'Ogulgerek Amanowa', phone: OWNER },
    })
    expect((await team.req(`${ADMIN}/${added.json.id}?lang=en`)).json.actions[0]).toMatchObject({ action: 'business.added', by: 'Adder' })
    // the owner signs in for the first time: named already, and the wizard reopens at the address
    const owner = browser(t.app)
    expect((await owner.login(OWNER)).isNew).toBe(false)
    expect((await owner.req('/v1/me/setup')).json).toEqual({
      setup: {
        slug: 'ogulgerek-beauty',
        name: 'Ogulgerek Beauty',
        step: 'address',
        category: 'Beauty',
        categoryId: 'beauty',
        logo: null,
        address: null,
        services: 0,
        team: 0,
        rules: { confirmMode: 'manual', holdMinutes: 30 },
      },
    })
    // one setup at a time, and appointments only
    const again = await team.req(ADMIN, {
      body: { name: 'Second Place', categoryId: 'beauty', owner: { phone: OWNER, name: 'Ogulgerek' } },
    })
    expect(again.json.error).toMatchObject({ code: 'setup_in_progress', details: { slug: 'ogulgerek-beauty' } })
    const tables = await team.req(ADMIN, {
      body: { name: 'Cafe', categoryId: 'restaurant', owner: { phone: '+99365970002', name: 'Aman' } },
    })
    expect(tables.status).toBe(400)
    // nothing is left behind by an add that failed
    expect(await db.select().from(users).where(eq(users.phone, '+99365970002'))).toHaveLength(0)
    // a landline signs in to nothing; an account unused for 6 months may be someone else's now
    const add = (name: string, owner: Record<string, string>) => team.req(ADMIN, { body: { name, categoryId: 'beauty', owner } })
    expect((await add('Ak Gul', { phone: '+99312345678', name: 'Aman' })).status).toBe(400)
    await db.insert(users).values({ phone: '+99365970003', name: 'Merdan', lang: 'en', lastSeenAt: new Date(DEMO_NOW - 200 * 86_400_000) })
    expect((await add('Merdan Cuts', { phone: '+99365970003', name: 'Ogulgerek' })).json.error.code).toBe('owner_account_unused')
    // an existing account keeps its name; a new one takes the team's language
    await db.insert(users).values({ phone: '+99365970004', name: 'Aýna', lang: 'en', lastSeenAt: new Date(DEMO_NOW) })
    expect((await add('Ayna Nails', { phone: '+99365970004', name: 'Someone Else' })).status).toBe(201)
    expect((await db.select().from(users).where(eq(users.phone, '+99365970004')))[0]!.name).toBe('Aýna')
    // the language is one of the market's (English alone for now)
    expect((await add('Russian Nails', { phone: '+99365970005', name: 'Olga', lang: 'ru' })).status).toBe(400)
    expect((await add('English Nails', { phone: '+99365970005', name: 'Olga', lang: 'en' })).status).toBe(201)
    expect((await db.select().from(users).where(eq(users.phone, '+99365970005')))[0]!.lang).toBe('en')
  })

  it('only the Ýeral team', async () => {
    const owner = await as(MAYSA)
    expect((await owner.req(`${ADMIN}?view=review&lang=en`, { headers: { Origin: site.urls.cms } })).status).toBe(401)
    expect((await cmsBrowser(t).req(`${ADMIN}/${glowId}/verify`, { method: 'POST' })).status).toBe(401)
  })
})
