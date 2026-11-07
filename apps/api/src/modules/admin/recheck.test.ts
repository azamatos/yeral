/**
 * What a verified business changes after its check (book Q-275 as changed 07.11.2026, Q-215): a new name waits for the
 * Ýeral team, who approve it or turn it down with a reason; a new About, photo or logo, like a move, is live at once and
 * puts the business on the team's «check again» list with what changed.
 */
import { and, eq, sql } from 'drizzle-orm'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { signedInAdmin } from '../../../test/admin'
import { DEMO_NOW, site, testApp } from '../../../test/app'
import { browser } from '../../../test/client'
import { testDatabase } from '../../../test/db'
import type { Db } from '../../db/client'
import { businesses, jobs, rateLimits } from '../../db/schema'
import { seed } from '../../db/seed'

const MAYSA = '+99365102030' // owner of Glow Studio
const MARAL = '+99361440819' // a specialist there
const ADMIN = '/v1/admin/businesses'
const W = '/v1/w/glow-studio'
const PROFILE = `${W}/settings/profile`
const bare = (url: string) => url.replace(/^https?:\/\//, '')
const jpeg = (n = 0) =>
  new File([new Uint8Array([0xff, 0xd8, 0xff, 0xda, 0x00, 0x03, n, 0x12, 0xff, 0xd9])], 'p.jpg', { type: 'image/jpeg' })

type Item = {
  slug: string
  name: string
  pendingName: { name: string; at: number } | null
  recheck: { at: number; what: string[] } | null
  addressChangedAt: number | null
}

describe('a verified business’s changes, checked again (book Q-275, Q-215)', () => {
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
    // each test starts from the verified, live business with nothing waiting
    await db
      .update(businesses)
      .set({
        name: 'Glow Studio',
        verification: 'verified',
        hiddenAt: null,
        pendingName: null,
        pendingNameAt: null,
        rejectedName: null,
        rejectedNameReason: null,
        recheckAt: null,
        recheck: [],
      })
      .where(eq(businesses.id, glowId))
  })
  const as = async (phone: string, name?: string) => {
    const b = browser(t.app)
    await b.login(phone, name)
    return b
  }
  const rename = async (b: ReturnType<typeof browser>, name: string, path = PROFILE) =>
    (await b.req(path, { method: 'PATCH', body: { name } })).json
  const page = async () => (await browser(t.app).req('/v1/businesses/glow-studio?lang=en')).json
  const found = async (q: string) =>
    ((await browser(t.app).req(`/v1/search?q=${encodeURIComponent(q)}&week=true&lang=en`)).json.items as { slug: string }[]).map(
      (b) => b.slug,
    )
  const glow = async () => (await db.select().from(businesses).where(eq(businesses.id, glowId)))[0]!
  const checkAgain = async (team: Awaited<ReturnType<typeof signedInAdmin>>) =>
    ((await team.req(`${ADMIN}?view=moved&lang=en`)).json.items as Item[]).find((b) => b.slug === 'glow-studio')
  const smsTo = async (phone: string) =>
    (
      await db
        .select()
        .from(jobs)
        .where(and(eq(jobs.kind, 'sms'), sql`${jobs.payload}->>'to' = ${phone}`))
    )
      .sort((x, y) => y.id - x.id)
      .map((j) => (j.payload as { text: string }).text)
  let uploads = 0
  const upload = async (b: ReturnType<typeof browser>, method: 'PUT' | 'POST', path: string) => {
    const form = new FormData()
    form.set('file', jpeg(++uploads))
    return (await t.app.request(path, { method, body: form, headers: { cookie: b.cookie } })).status
  }

  it('a new name waits: clients, the page and search keep the approved one; renamed again it’s replaced, back to it it goes', async () => {
    const maysa = await as(MAYSA)
    const team = await signedInAdmin(t, 'renames')
    expect(await rename(maysa, 'Glow Beauty')).toMatchObject({ name: 'Glow Studio', pendingName: 'Glow Beauty', nameRejected: null })
    expect((await page()).name).toBe('Glow Studio')
    expect(await found('Glow Beauty')).not.toContain('glow-studio')
    expect(await found('Glow Studio')).toContain('glow-studio')
    // the team's «check again» list shows old → new
    expect(await checkAgain(team)).toMatchObject({
      name: 'Glow Studio',
      pendingName: { name: 'Glow Beauty', at: t.clock.now },
      recheck: null,
    })
    // renamed again: the new name replaces the one waiting, from now
    t.clock.now += 60_000
    expect((await rename(maysa, 'Glow Lounge')).pendingName).toBe('Glow Lounge')
    expect((await checkAgain(team))!.pendingName).toEqual({ name: 'Glow Lounge', at: t.clock.now })
    // the same name again changes nothing
    const since = t.clock.now
    t.clock.now += 60_000
    await rename(maysa, 'Glow Lounge')
    expect((await glow()).pendingNameAt!.getTime()).toBe(since)
    // back to the approved name: nothing waits, and it leaves the list
    expect(await rename(maysa, 'Glow Studio')).toMatchObject({ name: 'Glow Studio', pendingName: null })
    expect(await checkAgain(team)).toBeUndefined()
    // only the owner and administrators rename it
    expect((await (await as(MARAL)).req(PROFILE, { method: 'PATCH', body: { name: 'Mine' } })).status).toBe(403)
  })

  it('hidden by the team, a new name waits too: shown again, the page must not carry a name nobody checked', async () => {
    await db
      .update(businesses)
      .set({ hiddenAt: new Date(DEMO_NOW), hiddenReason: 'Checking' })
      .where(eq(businesses.id, glowId))
    expect(await rename(await as(MAYSA), 'Glow Beauty')).toMatchObject({ name: 'Glow Studio', pendingName: 'Glow Beauty' })
  })

  it('approved: clients, the page and search take it, and the owner hears it; only the name the team looked at', async () => {
    const maysa = await as(MAYSA)
    const team = await signedInAdmin(t, 'approves', 'Approver')
    await rename(maysa, 'Glow Beauty')
    const approve = (name: string) => team.req(`${ADMIN}/${glowId}/name/approve`, { body: { name } })
    // a newer name came meanwhile: not approved by mistake
    expect((await approve('Glow Lounge')).json.error.code).toBe('invalid_status')
    expect((await approve('Glow Beauty')).status).toBe(204)
    expect((await page()).name).toBe('Glow Beauty')
    expect(await found('Glow Beauty')).toContain('glow-studio')
    expect((await maysa.req(PROFILE)).json).toMatchObject({ name: 'Glow Beauty', pendingName: null, nameRejected: null })
    expect((await smsTo(MAYSA))[0]).toBe('Ýeral: your new name, Glow Beauty, is approved.')
    expect((await team.req(`${ADMIN}/${glowId}?lang=en`)).json.actions[0]).toMatchObject({
      action: 'business.name_approved',
      by: 'Approver',
    })
    expect(await checkAgain(team)).toBeUndefined()
    // nothing waits now
    expect((await approve('Glow Beauty')).json.error.code).toBe('invalid_status')
  })

  it('turned down with a reason: the name stays, the owner reads why in the workspace and by SMS until renaming again', async () => {
    const maysa = await as(MAYSA)
    const team = await signedInAdmin(t, 'turns.down')
    await rename(maysa, 'Glow Joke')
    const turnDown = (body: object) => team.req(`${ADMIN}/${glowId}/name/reject`, { body })
    expect((await turnDown({ name: 'Glow Joke', reason: ' ' })).status).toBe(400)
    expect((await turnDown({ name: 'Glow Other', reason: 'Not a business name' })).json.error.code).toBe('invalid_status')
    expect((await turnDown({ name: 'Glow Joke', reason: 'Not a business name' })).status).toBe(204)
    expect((await page()).name).toBe('Glow Studio')
    expect((await maysa.req(PROFILE)).json).toMatchObject({
      name: 'Glow Studio',
      pendingName: null,
      nameRejected: { name: 'Glow Joke', reason: 'Not a business name' },
    })
    expect((await smsTo(MAYSA))[0]).toBe(
      `Ýeral: the new name Glow Joke isn't approved: Not a business name. Clients still see Glow Studio. Change it in your workspace: ${bare(site.urls.business)}`,
    )
    expect((await team.req(`${ADMIN}/${glowId}?lang=en`)).json.actions[0]).toMatchObject({
      action: 'business.name_rejected',
      reason: 'Not a business name',
    })
    expect(await checkAgain(team)).toBeUndefined()
    // renamed again: the turn-down goes, the new name waits
    expect(await rename(maysa, 'Glow Beauty')).toMatchObject({ pendingName: 'Glow Beauty', nameRejected: null })
  })

  it('not verified yet, or still being set up, the name is saved at once: nothing of it is public', async () => {
    const maysa = await as(MAYSA)
    for (const verification of ['pending', 'rejected'] as const) {
      await db.update(businesses).set({ verification }).where(eq(businesses.id, glowId))
      const name = `Glow ${verification}`
      expect(await rename(maysa, name)).toMatchObject({ name, pendingName: null })
    }
    const drafter = await as('+99365930021', 'Draft')
    await drafter.req('/v1/setup', { body: { name: 'Half Done', categoryId: 'beauty' } })
    expect(await rename(drafter, 'Fully Done', '/v1/w/half-done/settings/profile')).toMatchObject({ name: 'Fully Done', pendingName: null })
  })

  it('a new About, photo or logo is live at once and goes on the «check again» list with what changed, as a move does', async () => {
    const maysa = await as(MAYSA)
    const team = await signedInAdmin(t, 'rechecks')
    await maysa.req(PROFILE, { method: 'PATCH', body: { about: { en: 'Hair, nails and a quiet hour.' } } })
    expect((await page()).about).toBe('Hair, nails and a quiet hour.')
    expect(await checkAgain(team)).toMatchObject({ recheck: { at: t.clock.now, what: ['about'] }, addressChangedAt: null })
    t.clock.now += 60_000
    expect(await upload(maysa, 'POST', `${W}/settings/photos`)).toBe(201)
    expect((await checkAgain(team))!.recheck).toEqual({ at: t.clock.now, what: ['about', 'photos'] })
    t.clock.now += 60_000
    expect(await upload(maysa, 'PUT', `${W}/settings/logo`)).toBe(200)
    expect((await checkAgain(team))!.recheck).toEqual({ at: t.clock.now, what: ['about', 'photos', 'logo'] })
    // taking a picture or a language away, or a new order, shows nothing new
    const since = t.clock.now
    t.clock.now += 60_000
    await maysa.req(`${W}/settings/logo`, { method: 'DELETE' })
    const photos = (await maysa.req(`${W}/settings/photos`)).json.items as { id: string }[]
    await maysa.req(`${W}/settings/photos/order`, { method: 'PUT', body: { ids: photos.map((p) => p.id).reverse() } })
    await maysa.req(PROFILE, { method: 'PATCH', body: { about: { ru: '' } } })
    expect((await checkAgain(team))!.recheck!.at).toBe(since)
    // a move joins them
    t.clock.now += 60_000
    const { location } = (await maysa.req(PROFILE)).json as { location: Record<string, unknown> }
    await maysa.req(PROFILE, {
      method: 'PATCH',
      body: { location: { ...location, address: 'Oguzhan köçesi 12', street: 'Oguzhan köçesi' } },
    })
    const item = (await checkAgain(team))!
    expect(item).toMatchObject({
      recheck: { at: t.clock.now, what: ['address', 'about', 'photos', 'logo'] },
      addressChangedAt: t.clock.now,
    })
    const detail = (await team.req(`${ADMIN}/${glowId}?lang=en`)).json
    expect(detail.recheck).toEqual(item.recheck)
    // the check the team looked at, not an older one; checked, it leaves the list, and nobody is told
    const sent = (await smsTo(MAYSA)).length
    expect((await team.req(`${ADMIN}/${glowId}/verify?moved=${since}`, { method: 'POST' })).json.error.code).toBe('invalid_status')
    expect((await team.req(`${ADMIN}/${glowId}/verify?moved=${item.recheck!.at}`, { method: 'POST' })).status).toBe(204)
    expect(await checkAgain(team)).toBeUndefined()
    expect((await glow()).recheck).toEqual([])
    expect((await team.req(`${ADMIN}/${glowId}?lang=en`)).json.actions[0]).toMatchObject({ action: 'business.rechecked' })
    expect(await smsTo(MAYSA)).toHaveLength(sent)
  })

  it('a new name waiting stays on the list after what changed is checked; not verified, nothing is marked', async () => {
    const maysa = await as(MAYSA)
    const team = await signedInAdmin(t, 'both')
    await maysa.req(PROFILE, { method: 'PATCH', body: { name: 'Glow Beauty', about: { en: 'New words.' } } })
    const item = (await checkAgain(team))!
    expect(item).toMatchObject({ pendingName: { name: 'Glow Beauty' }, recheck: { what: ['about'] } })
    await team.req(`${ADMIN}/${glowId}/verify?moved=${item.recheck!.at}`, { method: 'POST' })
    expect(await checkAgain(team)).toMatchObject({ pendingName: { name: 'Glow Beauty' }, recheck: null })
    // the team finds it by the new name too
    const search = (await team.req(`${ADMIN}?view=all&q=beauty&lang=en`)).json.items as Item[]
    expect(search.map((b) => b.slug)).toContain('glow-studio')
    // in review, its whole page is checked anyway
    await db.update(businesses).set({ verification: 'pending' }).where(eq(businesses.id, glowId))
    await maysa.req(PROFILE, { method: 'PATCH', body: { about: { en: 'Other words.' } } })
    expect(await upload(maysa, 'POST', `${W}/settings/photos`)).toBe(201)
    expect(await glow()).toMatchObject({ recheckAt: null, recheck: [] })
  })
})
