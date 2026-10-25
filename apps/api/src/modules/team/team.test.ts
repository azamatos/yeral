import { and, eq } from 'drizzle-orm'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { DEMO_NOW, testApp } from '../../../test/app'
import { browser, eventsAfter } from '../../../test/client'
import { testDatabase } from '../../../test/db'
import type { Db } from '../../db/client'
import { bookingRules, businesses, invites, rateLimits, staff } from '../../db/schema'
import { seed } from '../../db/seed'

// the demo team of Glow Studio
const MAYSA = '+99365102030' // owner (also of the Parahat branch)
const SELBI = '+99365884102' // administrator
const AYNA = '+99365312210' // specialist
const MARAL = '+99361440819' // specialist
const GULNAR = '+99364215590' // invited
const DAY = 86_400_000

describe('the team (book chapter 3, ADR 0025)', () => {
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
  const as = async (phone: string, name?: string) => {
    const b = browser(t.app)
    await b.login(phone, name)
    return b
  }
  const rowOf = async (phone: string) => (await db.select().from(staff).where(eq(staff.phone, phone)))[0]

  it('the switcher lists every workspace with the requests this person may answer', async () => {
    const maysa = await as(MAYSA)
    const list = (await maysa.req('/v1/me/workspaces')).json
    expect(list.items.map((w: { slug: string; level: string }) => [w.slug, w.level])).toEqual([
      ['glow-studio', 'owner'],
      ['glow-studio-parahat', 'owner'],
    ])
    // branches are businesses of their own: the city tells them apart (book Q-107)
    expect(list.items[0].city).toEqual({ id: 'ashgabat', name: 'Ashgabat' })
    // the branch's two waiting requests are for a specialist without the app: the owner answers them
    expect(list.items[1].requestsToAnswer).toBe(2)
    const ownerCount = list.items[0].requestsToAnswer
    expect(ownerCount).toBeGreaterThan(0)
    // a specialist counts only their own (the default "both": whoever is first)
    const ayna = await as(AYNA)
    const [glow] = (await ayna.req('/v1/me/workspaces')).json.items
    expect(glow).toMatchObject({ slug: 'glow-studio', level: 'specialist' })
    expect(glow.requestsToAnswer).toBeLessThanOrEqual(ownerCount)
    // the business app opens the one opened last
    expect(list.current).toBeNull()
    expect((await maysa.req('/v1/me/workspaces/glow-studio-parahat/open', { method: 'POST' })).status).toBe(204)
    expect((await maysa.req('/v1/me/workspaces')).json.current).toBe('glow-studio-parahat')
    expect((await maysa.req('/v1/me/workspaces/barber-loft/open', { method: 'POST' })).status).toBe(404)
  })

  it('the switcher says each page’s state, the person’s specialization and the reviews waiting for a reply', async () => {
    const maysa = await as(MAYSA)
    const ayna = await as(AYNA)
    const mine = async (b: Awaited<ReturnType<typeof as>>) =>
      ((await b.req('/v1/me/workspaces')).json.items as { slug: string }[]).find((w) => w.slug === 'glow-studio') as Record<string, unknown>
    // live; the owner's count is the reviews page's "Jogapsyz"; a specialist (who doesn't reply) has none
    const unanswered = (await maysa.req('/v1/w/glow-studio/reviews')).json.summary.unanswered as number
    expect(unanswered).toBeGreaterThan(0)
    expect(await mine(maysa)).toMatchObject({ status: 'live', statusReason: null, specialization: null, reviewsToAnswer: unanswered })
    const team = (await maysa.req('/v1/w/glow-studio/team')).json.items as { name: string; specialization: string | null }[]
    const aynaRow = team.find((m) => m.name.startsWith('Aýna'))!
    expect(aynaRow.specialization).not.toBeNull()
    expect(await mine(ayna)).toMatchObject({ status: 'live', specialization: aynaRow.specialization, reviewsToAnswer: 0 })
    // an administrator replies too, so counts them; a reply takes one off, and taking it away puts it back
    const selbi = await as(SELBI)
    expect(await mine(selbi)).toMatchObject({ reviewsToAnswer: unanswered })
    const open = (await maysa.req('/v1/w/glow-studio/reviews?unanswered=true')).json.items[0] as { id: string }
    expect((await selbi.req(`/v1/w/glow-studio/reviews/${open.id}/reply`, { method: 'PUT', body: { text: 'Thank you!' } })).status).toBe(
      204,
    )
    expect(await mine(maysa)).toMatchObject({ reviewsToAnswer: unanswered - 1 })
    expect((await selbi.req(`/v1/w/glow-studio/reviews/${open.id}/reply`, { method: 'DELETE' })).status).toBe(204)
    expect(await mine(maysa)).toMatchObject({ reviewsToAnswer: unanswered })
    const [glow] = await db.select().from(businesses).where(eq(businesses.slug, 'glow-studio'))
    try {
      // sent back: the reason to the owner, who can fix it; the specialist sees the state only
      await db
        .update(businesses)
        .set({ verification: 'rejected', verificationReason: 'Add photos of the place' })
        .where(eq(businesses.id, glow!.id))
      expect(await mine(maysa)).toMatchObject({ status: 'not_approved', statusReason: 'Add photos of the place' })
      // an administrator can fix what it points to; the specialist sees the state only
      expect(await mine(selbi)).toMatchObject({ status: 'not_approved', statusReason: 'Add photos of the place' })
      expect(await mine(ayna)).toMatchObject({ status: 'not_approved', statusReason: null })
      // hidden by the Ýeral team wins over the review
      await db
        .update(businesses)
        .set({ hiddenAt: new Date(DEMO_NOW), hiddenReason: 'Wrong address' })
        .where(eq(businesses.id, glow!.id))
      expect(await mine(maysa)).toMatchObject({ status: 'hidden', statusReason: 'Wrong address' })
      await db
        .update(businesses)
        .set({ verification: 'pending', verificationReason: null, hiddenAt: null, hiddenReason: null })
        .where(eq(businesses.id, glow!.id))
      expect(await mine(maysa)).toMatchObject({ status: 'in_review', statusReason: null })
      // the shared demo workspace says so, whatever its review (F-242)
      await db.update(businesses).set({ sandbox: true }).where(eq(businesses.id, glow!.id))
      expect(await mine(maysa)).toMatchObject({ status: 'demo', statusReason: null })
    } finally {
      await db
        .update(businesses)
        .set({
          verification: glow!.verification,
          verificationReason: glow!.verificationReason,
          hiddenAt: glow!.hiddenAt,
          hiddenReason: glow!.hiddenReason,
          sandbox: false,
        })
        .where(eq(businesses.id, glow!.id))
    }
  })

  it('an invited person sees the invite at sign-in and joins by accepting it', async () => {
    const gulnar = await as(GULNAR)
    const cards = (await gulnar.req('/v1/me/invites')).json.items
    expect(cards).toHaveLength(1)
    expect(cards[0]).toMatchObject({
      business: { slug: 'glow-studio', name: 'Glow Studio', city: { id: 'ashgabat', name: 'Ashgabat' } },
      level: 'specialist',
      // the card's lines for the level follow who answers requests there (book B-08)
      answersRequests: true,
      state: 'pending',
    })
    expect(cards[0].expiresAt - cards[0].sentAt).toBe(7 * DAY)
    // where the owner and administrators answer, a specialist doesn't; nor where bookings confirm at once
    const [glow] = await db.select().from(businesses).where(eq(businesses.slug, 'glow-studio'))
    const [rules] = await db.select().from(bookingRules).where(eq(bookingRules.businessId, glow!.id))
    const answers = async () => (await gulnar.req('/v1/me/invites')).json.items[0].answersRequests as boolean
    try {
      await db.update(bookingRules).set({ requestAnswerers: 'desk' }).where(eq(bookingRules.businessId, glow!.id))
      expect(await answers()).toBe(false)
      await db.update(bookingRules).set({ requestAnswerers: 'each', confirmMode: 'instant' }).where(eq(bookingRules.businessId, glow!.id))
      expect(await answers()).toBe(false)
    } finally {
      await db
        .update(bookingRules)
        .set({ requestAnswerers: rules!.requestAnswerers, confirmMode: rules!.confirmMode })
        .where(eq(bookingRules.businessId, glow!.id))
    }
    const joined = await gulnar.req(`/v1/me/invites/${cards[0].id}/accept`, { method: 'POST' })
    expect(joined.status).toBe(200)
    expect(joined.json).toMatchObject({ slug: 'glow-studio', level: 'specialist' })
    expect((await gulnar.req('/v1/me')).json.hasBusiness).toBe(true)
    expect(await rowOf(GULNAR)).toMatchObject({ status: 'active', hasApp: true })
    expect((await gulnar.req('/v1/me/invites')).json.items).toEqual([])
    // answered once
    expect((await gulnar.req(`/v1/me/invites/${cards[0].id}/accept`, { method: 'POST' })).json.error.code).toBe('invite_answered')
  })

  it('the owner invites by phone and copies the link; the person declines', async () => {
    const maysa = await as(MAYSA)
    const sent = await maysa.req('/v1/w/glow-studio/team/invites', {
      body: { phone: '+993 65 33 30 01', name: 'Bägül', level: 'specialist', specialization: { en: 'Stylist' } },
    })
    expect(sent.status).toBe(201)
    expect(sent.json.member).toMatchObject({ name: 'Bägül', status: 'invited', joined: false, invite: { state: 'pending' } })
    const token = (sent.json.link as string).split('/invite/')[1]!
    expect(sent.json.link).toMatch(/^http:\/\/localhost:3002\/invite\//)
    // the link opens the invite, signed in or not
    const card = await browser(t.app).req(`/v1/invites/${token}`)
    expect(card.json).toMatchObject({ business: { slug: 'glow-studio' }, invitedBy: 'Maýsa', state: 'pending' })
    expect((await browser(t.app).req('/v1/invites/not-a-real-token-at-all-xyz')).status).toBe(404)

    const bagul = await as('+99365333001', 'Bägül')
    expect((await bagul.req(`/v1/me/invites/${card.json.id}/decline`, { method: 'POST' })).status).toBe(204)
    expect((await bagul.req('/v1/me')).json.hasBusiness).toBe(false)
    const team = (await maysa.req('/v1/w/glow-studio/team')).json.items
    expect(team.find((m: { name: string }) => m.name === 'Bägül')).toMatchObject({ status: 'invited', invite: { state: 'declined' } })
    // someone else's invite is "not found"
    const other = await as('+99365333009', 'Other')
    expect((await other.req(`/v1/me/invites/${card.json.id}/accept`, { method: 'POST' })).status).toBe(404)
  })

  it('an invite expires after 7 days; resending gives a new link and a new 7 days', async () => {
    const maysa = await as(MAYSA)
    const sent = (await maysa.req('/v1/w/glow-studio/team/invites', { body: { phone: '+99365333002', name: 'Jemal', level: 'admin' } }))
      .json
    t.clock.now += 8 * DAY
    const jemal = await as('+99365333002', 'Jemal')
    const [card] = (await jemal.req('/v1/me/invites')).json.items
    expect(card.state).toBe('expired')
    expect((await jemal.req(`/v1/me/invites/${card.id}/accept`, { method: 'POST' })).json.error.code).toBe('invite_expired')
    const again = await maysa.req(`/v1/w/glow-studio/team/${sent.member.id}/invite`, { method: 'POST' })
    expect(again.status).toBe(201)
    expect(again.json.member.invite.state).toBe('pending')
    // the old link shows a cancelled invite; the new one works
    const oldToken = (sent.link as string).split('/invite/')[1]!
    expect((await browser(t.app).req(`/v1/invites/${oldToken}`)).json.state).toBe('cancelled')
    const [fresh] = (await jemal.req('/v1/me/invites')).json.items
    expect((await jemal.req(`/v1/me/invites/${fresh.id}/accept`, { method: 'POST' })).json).toMatchObject({ level: 'admin' })
  })

  it('only the owner manages the team; administrators see it; specialists and outsiders don’t', async () => {
    const invite = { phone: '+99365333003', name: 'X', level: 'specialist' }
    const selbi = await as(SELBI)
    expect((await selbi.req('/v1/w/glow-studio/team')).status).toBe(200)
    expect((await selbi.req('/v1/w/glow-studio/team/invites', { body: invite })).status).toBe(403)
    const maral = await as(MARAL)
    expect((await maral.req('/v1/w/glow-studio/team')).status).toBe(403)
    const outsider = await as('+99365333004', 'Outsider')
    expect((await outsider.req('/v1/w/glow-studio/team')).status).toBe(404)
    // the owner's own row isn't changed through the team
    const maysa = await as(MAYSA)
    const own = await rowOf(MAYSA)
    expect((await maysa.req(`/v1/w/glow-studio/team/${own!.id}`, { method: 'PATCH', body: { level: 'admin' } })).status).toBe(403)
    expect((await maysa.req('/v1/w/glow-studio/leave', { method: 'POST' })).json.error.code).toBe('owner_cannot_leave')
  })

  it('someone already on the team, or with an open invite, isn’t invited twice', async () => {
    const maysa = await as(MAYSA)
    const twice = (phone: string) => maysa.req('/v1/w/glow-studio/team/invites', { body: { phone, name: 'Again', level: 'specialist' } })
    expect((await twice(MARAL)).json.error.code).toBe('already_on_team')
    await twice('+99365333005')
    expect((await twice('+99365333005')).json.error.code).toBe('already_on_team')
  })

  it('a specialist without the app: added at once; switching the app on sends the usual invite', async () => {
    const maysa = await as(MAYSA)
    // a landline is fine without the app (the owner calls them), but an invite needs a mobile
    const landline = await maysa.req('/v1/w/glow-studio/team/phone-only', { body: { phone: '+99312345678', name: 'Mähri' } })
    expect(landline.status).toBe(201)
    expect(landline.json).toMatchObject({ hasApp: false, status: 'active', joined: false })
    expect((await maysa.req(`/v1/w/glow-studio/team/${landline.json.id}/invite`, { method: 'POST' })).status).toBe(400)

    const added = (await maysa.req('/v1/w/glow-studio/team/phone-only', { body: { phone: '+99365333006', name: 'Ogulnur' } })).json
    const sent = await maysa.req(`/v1/w/glow-studio/team/${added.id}/invite`, { method: 'POST' })
    expect(sent.status).toBe(201)
    // until they accept, they work as before
    expect(sent.json.member).toMatchObject({ hasApp: false, status: 'active', invite: { state: 'pending' } })
    const ogulnur = await as('+99365333006', 'Ogulnur')
    const [card] = (await ogulnur.req('/v1/me/invites')).json.items
    await ogulnur.req(`/v1/me/invites/${card.id}/accept`, { method: 'POST' })
    expect(await rowOf('+99365333006')).toMatchObject({ hasApp: true, status: 'active', level: 'specialist' })
  })

  it('the owner can take the right to answer one’s own requests away', async () => {
    const maysa = await as(MAYSA)
    const jeren = await as('+99362701533')
    const before = (await jeren.req('/v1/me/workspaces')).json.items[0].requestsToAnswer
    const row = await rowOf('+99362701533')
    const res = await maysa.req(`/v1/w/glow-studio/team/${row!.id}`, { method: 'PATCH', body: { canAnswerOwn: false } })
    expect(res.json.canAnswerOwn).toBe(false)
    expect((await jeren.req('/v1/me/workspaces')).json.items[0].requestsToAnswer).toBe(0)
    await maysa.req(`/v1/w/glow-studio/team/${row!.id}`, { method: 'PATCH', body: { canAnswerOwn: true } })
    expect((await jeren.req('/v1/me/workspaces')).json.items[0].requestsToAnswer).toBe(before)
  })

  it('removed: no access, off the client site; reactivated: back; leaving works like removing', async () => {
    const maysa = await as(MAYSA)
    const maral = await as(MARAL)
    const row = await rowOf(MARAL)
    const shown = async () =>
      ((await browser(t.app).req('/v1/businesses/glow-studio')).json.specialists as { name: string }[]).map((s) => s.name)
    expect(await shown()).toContain('Maral')
    // her bookings ahead come first (B-50): kept, she comes to those
    const asked = await maysa.req(`/v1/w/glow-studio/team/${row!.id}/remove`, { body: {} })
    expect(asked.json.error.code).toBe('bookings_affected')
    expect((await maysa.req(`/v1/w/glow-studio/team/${row!.id}/remove`, { body: { affected: 'keep' } })).status).toBe(200)
    expect((await maral.req('/v1/me/workspaces')).json.items).toEqual([])
    expect(await shown()).not.toContain('Maral')
    const back = await maysa.req(`/v1/w/glow-studio/team/${row!.id}/reactivate`, { method: 'POST' })
    expect(back.json).toMatchObject({ status: 'active', bookable: true, joined: true })
    expect(await shown()).toContain('Maral')
    // leaving: the confirm counts what stays for the owner, the bookings removing her would ask about
    const left = (await maral.req('/v1/w/glow-studio/leave')).json as { bookings: number; requests: number }
    expect(left.bookings + left.requests).toBe(asked.json.error.details.count)
    expect(left.bookings).toBeGreaterThan(0)
    expect((await maysa.req('/v1/w/glow-studio/leave')).json.error.code).toBe('owner_cannot_leave')
    expect((await maral.req('/v1/w/glow-studio/leave', { method: 'POST' })).status).toBe(204)
    expect(await rowOf(MARAL)).toMatchObject({ status: 'removed', bookable: false })
    // the account stays linked to the row, so the bookings kept there still block the person elsewhere
    expect((await rowOf(MARAL))!.userId).not.toBeNull()
    await maysa.req(`/v1/w/glow-studio/team/${row!.id}/reactivate`, { method: 'POST' })
  })

  it('a specialist hears only about their own bookings; the front desk about all of them', async () => {
    const ayna = await as(AYNA)
    const selbi = await as(SELBI)
    const aynaCursor = (await ayna.req('/v1/events')).json.cursor
    const selbiCursor = (await selbi.req('/v1/events')).json.cursor
    const client = await as('+99365333007', 'Ogulgerek')
    const detail = (await client.req('/v1/businesses/glow-studio')).json
    const maral = detail.specialists.find((s: { name: string }) => s.name === 'Maral').id
    const svc = detail.serviceGroups
      .flatMap((g: { services: { id: string; name: string }[] }) => g.services)
      .find((s: { name: string }) => s.name === 'Manicure').id
    const free = (await client.req(`/v1/businesses/glow-studio/availability?services=${svc}&staff=${maral}&date=2026-10-16`)).json
    const made = await client.req('/v1/bookings', {
      body: {
        type: 'appointment',
        business: 'glow-studio',
        serviceIds: [svc],
        staffId: maral,
        date: '2026-10-16',
        start: free.slots[0].start,
      },
    })
    expect(made.status).toBe(201)
    const forSelbi = (await eventsAfter(selbi, selbiCursor, (items) => items.some((e) => e.bookingCode === made.json.code))).json.items
    expect(forSelbi.map((e: { bookingCode: string }) => e.bookingCode)).toContain(made.json.code)
    const forAyna = (await ayna.req(`/v1/events?after=${aynaCursor}`)).json.items
    expect(forAyna.map((e: { bookingCode: string }) => e.bookingCode)).not.toContain(made.json.code)
  })

  it('a specialist who deletes their account leaves every team and the client site', async () => {
    const jeren = await as('+99362701533')
    const before = ((await browser(t.app).req('/v1/businesses/glow-studio')).json.specialists as { name: string }[]).map((s) => s.name)
    expect(before).toContain('Jeren')
    expect((await jeren.req('/v1/me', { method: 'DELETE' })).status).toBe(204)
    const after = ((await browser(t.app).req('/v1/businesses/glow-studio')).json.specialists as { name: string }[]).map((s) => s.name)
    expect(after).not.toContain('Jeren')
    const [glow] = await db.select().from(businesses).where(eq(businesses.slug, 'glow-studio'))
    const [row] = await db
      .select()
      .from(staff)
      .where(and(eq(staff.businessId, glow!.id), eq(staff.name, 'Jeren')))
    expect(row).toMatchObject({ status: 'removed', userId: null })
    // invites of the business are untouched
    expect((await db.select().from(invites).where(eq(invites.businessId, glow!.id))).length).toBeGreaterThan(0)
  })

  it('deleting an account cancels the open invites to its phone', async () => {
    const maysa = await as(MAYSA)
    await maysa.req('/v1/w/glow-studio/team/invites', { body: { phone: '+99365333010', name: 'Leaving', level: 'specialist' } })
    const leaving = await as('+99365333010', 'Leaving')
    expect((await leaving.req('/v1/me', { method: 'DELETE' })).status).toBe(204)
    const [open] = await db
      .select()
      .from(invites)
      .where(and(eq(invites.phone, '+99365333010'), eq(invites.status, 'pending')))
    expect(open).toBeUndefined()
  })

  it('the staff drawer’s profile: names and specialization; the phone only without the app; the owner’s own names', async () => {
    const maysa = await as(MAYSA)
    const added = (await maysa.req('/v1/w/glow-studio/team/phone-only', { body: { phone: '+99365333031', name: 'Bägül' } })).json
    const named = await maysa.req(`/v1/w/glow-studio/team/${added.id}`, {
      method: 'PATCH',
      body: { name: 'Bägül M.', fullName: 'Bägül Myradowa', specialization: { en: 'Colourist' } },
    })
    expect(named.status).toBe(200)
    expect(named.json).toMatchObject({ name: 'Bägül M.', fullName: 'Bägül Myradowa', specialization: 'Colourist' })
    expect((await maysa.req(`/v1/w/glow-studio/team/${added.id}`, { method: 'PATCH', body: { fullName: null } })).json.fullName).toBeNull()
    // with the app the number is how they sign in: not the owner's to change
    const ayna = await rowOf(AYNA)
    const theirs = await maysa.req(`/v1/w/glow-studio/team/${ayna!.id}`, { method: 'PATCH', body: { phone: '+99365333030' } })
    expect(theirs.json.error.details.issues).toEqual([expect.objectContaining({ path: ['phone'], code: 'signs_in' })])
    // without it the owner keeps the number up to date, a landline too, not one already on the team
    const moved = await maysa.req(`/v1/w/glow-studio/team/${added.id}`, { method: 'PATCH', body: { phone: '+99312345670' } })
    expect(moved.json.phone).toBe('+99312345670')
    const taken = await maysa.req(`/v1/w/glow-studio/team/${added.id}`, { method: 'PATCH', body: { phone: MARAL } })
    expect(taken.json.error.code).toBe('already_on_team')
    // an administrator always uses the app
    expect((await maysa.req(`/v1/w/glow-studio/team/${added.id}`, { method: 'PATCH', body: { level: 'admin' } })).status).toBe(400)
    // the owner's own row takes its names, nothing about access
    const own = await rowOf(MAYSA)
    const ownName = await maysa.req(`/v1/w/glow-studio/team/${own!.id}`, { method: 'PATCH', body: { name: 'Maýsa' } })
    expect(ownName.status).toBe(200)
    expect((await maysa.req(`/v1/w/glow-studio/team/${own!.id}`, { method: 'PATCH', body: { hasApp: false } })).status).toBe(403)
    // only the owner
    const selbi = await as(SELBI)
    expect((await selbi.req(`/v1/w/glow-studio/team/${added.id}`, { method: 'PATCH', body: { name: 'B.' } })).status).toBe(403)
  })

  it('turning the app off: an open invite is cancelled, the person stays on the team without it', async () => {
    const maysa = await as(MAYSA)
    const sent = (
      await maysa.req('/v1/w/glow-studio/team/invites', { body: { phone: '+99365333032', name: 'Gözel', level: 'specialist' } })
    ).json
    const off = await maysa.req(`/v1/w/glow-studio/team/${sent.member.id}`, { method: 'PATCH', body: { hasApp: false } })
    expect(off.json).toMatchObject({ hasApp: false, status: 'active', invite: { state: 'cancelled' } })
    const gozel = await as('+99365333032', 'Gözel')
    expect((await gozel.req('/v1/me/invites')).json.items).toEqual([])
    // someone who had joined loses the workspace, and stays bookable without the app
    await maysa.req('/v1/w/glow-studio/team/invites', { body: { phone: '+99365333033', name: 'Jemal', level: 'specialist' } })
    const jemal = await as('+99365333033', 'Jemal')
    const [card] = (await jemal.req('/v1/me/invites')).json.items
    await jemal.req(`/v1/me/invites/${card.id}/accept`, { method: 'POST' })
    expect((await jemal.req('/v1/me/workspaces')).json.items.map((w: { slug: string }) => w.slug)).toContain('glow-studio')
    const row = await rowOf('+99365333033')
    await maysa.req(`/v1/w/glow-studio/team/${row!.id}`, { method: 'PATCH', body: { hasApp: false } })
    expect(await rowOf('+99365333033')).toMatchObject({ hasApp: false, status: 'active' })
    expect((await jemal.req('/v1/me/workspaces')).json.items.map((w: { slug: string }) => w.slug)).not.toContain('glow-studio')
    // an administrator can't stop using it
    const selbi = await rowOf(SELBI)
    const admin = await maysa.req(`/v1/w/glow-studio/team/${selbi!.id}`, { method: 'PATCH', body: { hasApp: false } })
    expect(admin.json.error.details.issues).toEqual([expect.objectContaining({ path: ['hasApp'] })])
  })

  it('the services someone does: set in one go by the owner or an administrator', async () => {
    const maysa = await as(MAYSA)
    const selbi = await as(SELBI)
    const menu = (await maysa.req('/v1/w/glow-studio/services')).json
    const [first, second] = menu.groups.flatMap((g: { services: { id: string }[] }) => g.services.map((s) => s.id))
    const added = (await maysa.req('/v1/w/glow-studio/team/phone-only', { body: { phone: '+99365333034', name: 'Leýla' } })).json
    expect(added.bookable).toBe(false)
    const set = await selbi.req(`/v1/w/glow-studio/team/${added.id}/services`, { method: 'PUT', body: { serviceIds: [first, second] } })
    expect(set.status).toBe(200)
    expect(set.json.bookable).toBe(true)
    const after = (await maysa.req('/v1/w/glow-studio/services')).json
    const doing = after.groups
      .flatMap((g: { services: { id: string; staffIds: string[] }[] }) => g.services)
      .filter((s: { staffIds: string[] }) => s.staffIds.includes(added.id))
    expect(doing.map((s: { id: string }) => s.id).sort()).toEqual([first, second].sort())
    const none = await maysa.req(`/v1/w/glow-studio/team/${added.id}/services`, { method: 'PUT', body: { serviceIds: [] } })
    expect(none.json.bookable).toBe(false)
    const unknown = await maysa.req(`/v1/w/glow-studio/team/${added.id}/services`, {
      method: 'PUT',
      body: { serviceIds: ['00000000-0000-0000-0000-000000000000'] },
    })
    expect(unknown.status).toBe(400)
    const maral = await as(MARAL)
    expect((await maral.req(`/v1/w/glow-studio/team/${added.id}/services`, { method: 'PUT', body: { serviceIds: [] } })).status).toBe(403)
  })

  it('an empty change is refused, not a server error', async () => {
    const maysa = await as(MAYSA)
    const row = await rowOf(AYNA)
    expect((await maysa.req(`/v1/w/glow-studio/team/${row!.id}`, { method: 'PATCH', body: {} })).status).toBe(400)
  })

  it('someone removed and invited again waits as invited, and the invite can be resent', async () => {
    const maysa = await as(MAYSA)
    const ayna = await as(AYNA)
    const row = await rowOf(AYNA)
    await maysa.req(`/v1/w/glow-studio/team/${row!.id}/remove`, { body: { affected: 'keep' } })
    const sent = await maysa.req('/v1/w/glow-studio/team/invites', { body: { phone: AYNA, name: 'Aýna', level: 'specialist' } })
    // the old row comes back, still linked to her account (her kept bookings keep blocking her elsewhere)
    expect(sent.json.member).toMatchObject({ id: row!.id, status: 'invited', joined: false, invite: { state: 'pending' } })
    expect((await maysa.req(`/v1/w/glow-studio/team/${row!.id}/invite`, { method: 'POST' })).status).toBe(201)
    const [card] = (await ayna.req('/v1/me/invites')).json.items
    expect((await ayna.req(`/v1/me/invites/${card.id}/accept`, { method: 'POST' })).status).toBe(200)
    expect(await rowOf(AYNA)).toMatchObject({ id: row!.id, status: 'active' })
  })

  it('a refused value says which, as everywhere: an unknown service, an invite to a phone that gets no SMS', async () => {
    const maysa = await as(MAYSA)
    const unknown = '00000000-0000-4000-8000-000000000000'
    const bad = await maysa.req('/v1/w/glow-studio/team/invites', {
      body: { phone: '+99365333021', name: 'Bad', level: 'specialist', serviceIds: [unknown] },
    })
    expect(bad.json.error).toMatchObject({
      code: 'validation_error',
      details: { issues: [{ path: ['serviceIds', 0], code: 'not_found' }] },
    })
    const desk = (await maysa.req('/v1/w/glow-studio/team/phone-only', { body: { phone: '+99312345679', name: 'Desk' } })).json
    const resend = await maysa.req(`/v1/w/glow-studio/team/${desk.id}/invite`, { method: 'POST' })
    expect(resend.json.error).toMatchObject({ code: 'validation_error', details: { issues: [{ path: ['phone'], code: 'not_mobile' }] } })
  })

  it('nobody ends up on a team twice', async () => {
    const maysa = await as(MAYSA)
    // a removed specialist without the app, added again later: the old row can't come back beside the new one
    const first = (await maysa.req('/v1/w/glow-studio/team/phone-only', { body: { phone: '+99365333011', name: 'Twice' } })).json
    await maysa.req(`/v1/w/glow-studio/team/${first.id}/remove`, { body: {} })
    await maysa.req('/v1/w/glow-studio/team/phone-only', { body: { phone: '+99365333011', name: 'Twice' } })
    expect((await maysa.req(`/v1/w/glow-studio/team/${first.id}/reactivate`, { method: 'POST' })).json.error.code).toBe('already_on_team')
    // an invite can't be accepted beside another active row of the same phone
    await maysa.req('/v1/w/glow-studio/team/invites', { body: { phone: '+99365333012', name: 'Dup', level: 'specialist' } })
    const [glow] = await db.select().from(businesses).where(eq(businesses.slug, 'glow-studio'))
    await db.insert(staff).values({ businessId: glow!.id, name: 'Dup', phone: '+99365333012', hasApp: false })
    const dup = await as('+99365333012', 'Dup')
    const [card] = (await dup.req('/v1/me/invites')).json.items
    expect((await dup.req(`/v1/me/invites/${card.id}/accept`, { method: 'POST' })).json.error.code).toBe('already_on_team')
  })

  it('team changes reach everyone on the team and the person invited', async () => {
    const ayna = await as(AYNA) // a specialist: hears team changes, not other people's bookings
    const cursor = (await ayna.req('/v1/events')).json.cursor
    const invitee = await as('+99365333013', 'Invitee')
    const inviteeCursor = (await invitee.req('/v1/events')).json.cursor
    const maysa = await as(MAYSA)
    await maysa.req('/v1/w/glow-studio/team/invites', { body: { phone: '+99365333013', name: 'Invitee', level: 'specialist' } })
    const teamChanged = (items: { type: string }[]) => items.some((e) => e.type === 'team.changed')
    const seen = (await eventsAfter(ayna, cursor, teamChanged)).json.items.map((e: { type: string }) => e.type)
    expect(seen).toContain('team.changed')
    const forInvitee = (await eventsAfter(invitee, inviteeCursor, teamChanged)).json.items.map((e: { type: string }) => e.type)
    expect(forInvitee).toContain('team.changed')
  })
})
