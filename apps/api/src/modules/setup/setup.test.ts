/** Setting a business up (book B-02–B-06, Q-200): the draft, its step at sign-in, filling it in, finishing. */
import { and, eq } from 'drizzle-orm'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { DEMO_NOW, testApp } from '../../../test/app'
import { browser } from '../../../test/client'
import { testDatabase } from '../../../test/db'
import type { Db } from '../../db/client'
import { businesses, invites, rateLimits, staff, staffServices } from '../../db/schema'
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
    // the sign-in's card: the category, no logo yet, no address before the address step (the draft sits at the centre)
    expect((await owner.req('/v1/me/setup')).json).toEqual({
      setup: {
        slug: 'ayna-beauty',
        name: 'Aýna Beauty',
        step: 'address',
        category: 'Beauty',
        categoryId: 'beauty',
        logo: null,
        address: null,
      },
    })
    const again = await owner.req('/v1/setup', { body: { name: 'Second', categoryId: 'beauty' } })
    expect(again.json.error).toMatchObject({ code: 'setup_in_progress', details: { slug: 'ayna-beauty' } })
    // not in the switcher, no "Biznes" link, not public
    expect((await owner.req('/v1/me/workspaces')).json.items).toEqual([])
    expect((await owner.req('/v1/me')).json.hasBusiness).toBe(false)
    expect((await browser(t.app).req('/v1/businesses/ayna-beauty')).status).toBe(404)
    // the wizard moves on, and reopens there
    // past the address step with none saved (the address didn't go through): still none on the card
    expect((await owner.req('/v1/w/ayna-beauty/setup', { method: 'PUT', body: { step: 'hours' } })).status).toBe(204)
    expect((await owner.req('/v1/me/setup')).json.setup).toMatchObject({ step: 'hours', address: null })
    const location = {
      cityId: 'ashgabat',
      address: '247 Bitarap Türkmenistan Avenue',
      street: 'Bitarap Türkmenistan Avenue',
      lat: 37.95,
      lng: 58.38,
    }
    expect((await owner.req('/v1/w/ayna-beauty/settings/profile', { method: 'PATCH', body: { location } })).status).toBe(200)
    const address = { line: '247 Bitarap Türkmenistan Avenue', city: { id: 'ashgabat', name: 'Ashgabat' } }
    expect((await owner.req('/v1/me/setup')).json.setup).toMatchObject({ step: 'hours', address })
    // back at the address step it keeps the one saved
    expect((await owner.req('/v1/w/ayna-beauty/setup', { method: 'PUT', body: { step: 'address' } })).status).toBe(204)
    expect((await owner.req('/v1/me/setup')).json.setup).toMatchObject({ step: 'address', address })
    // back at the business step another category: the wizard picks it again by its id
    expect((await owner.req('/v1/w/ayna-beauty/settings/profile', { method: 'PATCH', body: { categoryId: 'nails' } })).status).toBe(200)
    expect((await owner.req('/v1/me/setup')).json.setup).toMatchObject({ category: 'Nails', categoryId: 'nails' })
    // and the logo once there is one
    const form = new FormData()
    form.set('file', new File([new Uint8Array([0xff, 0xd8, 0xff, 0xda, 0, 3, 1, 0x12, 0xff, 0xd9])], 'logo.jpg', { type: 'image/jpeg' }))
    const set = await t.app.request('/v1/w/ayna-beauty/settings/logo', { method: 'PUT', body: form, headers: { cookie: owner.cookie } })
    expect(set.status).toBe(200)
    const { logo } = (await set.json()) as { logo: { url: string } }
    expect((await owner.req('/v1/me/setup')).json.setup.logo).toEqual({ url: logo.url, alt: 'Aýna Beauty' })
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

  it('the services step makes the menu in one go: starters in every language, own services, saved again by id', async () => {
    const owner = await as('+99365930040', 'Ogulgerek')
    const { slug } = (await owner.req('/v1/setup', { body: { name: 'Ogulgerek Beauty', categoryId: 'beauty' } })).json as { slug: string }
    const W = `/v1/w/${slug}`
    const put = (body: unknown) => owner.req(`${W}/setup/services`, { method: 'PUT', body })
    const body = {
      groups: [
        {
          // sent back as shown: still the starter's names
          starter: 'hair',
          name: { en: 'Hair' },
          services: [
            { starter: 'womens-haircut', name: { en: 'Women’s haircut' }, durationMin: 60, priceType: 'fixed', priceAmount: 90 },
            // renamed by the owner: as written
            { starter: 'hair-styling', name: { en: 'Blow-dry' }, durationMin: 45, priceType: 'fixed', priceAmount: 60 },
          ],
        },
        { name: { en: 'New services' }, services: [{ name: { en: 'Henna' }, durationMin: 90, priceType: 'from', priceAmount: 100 }] },
      ],
    }
    const saved = await put(body)
    expect(saved.status).toBe(200)
    const [me] = await db
      .select({ id: staff.id })
      .from(staff)
      .innerJoin(businesses, eq(businesses.id, staff.businessId))
      .where(and(eq(businesses.slug, slug), eq(staff.level, 'owner')))
    const menu = saved.json as {
      groups: { id: string; name: object; services: { id: string; name: object; staffIds: string[] }[] }[]
    }
    expect(menu.groups).toMatchObject([
      {
        name: { tk: 'Saç', ru: 'Волосы', en: 'Hair' },
        services: [
          {
            name: { tk: 'Aýal saç kesimi', ru: 'Женская стрижка', en: 'Women’s haircut' },
            durationMin: 60,
            priceAmount: 90,
            staffIds: [me!.id],
          },
          { name: { en: 'Blow-dry' }, durationMin: 45, priceAmount: 60, staffIds: [me!.id] },
        ],
      },
      { name: { en: 'New services' }, services: [{ name: { en: 'Henna' }, priceType: 'from', priceAmount: 100, staffIds: [me!.id] }] },
    ])
    // Settings adds a description; back at the step the menu comes by id: kept, the haircut's price changed, the
    // blow-dry left out goes, and nothing twice
    const [hair, own] = menu.groups
    const [haircut, blowDry] = hair!.services
    await owner.req(`${W}/services/${haircut!.id}`, { method: 'PATCH', body: { description: { en: 'Wash and cut' } } })
    const again = await put({
      groups: [
        { id: hair!.id, services: [{ id: haircut!.id, durationMin: 60, priceType: 'fixed', priceAmount: 100 }] },
        { id: own!.id, services: [{ id: own!.services[0]!.id, durationMin: 90, priceType: 'from', priceAmount: 100 }] },
      ],
    })
    expect(again.status).toBe(200)
    expect(again.json.groups).toMatchObject([
      {
        id: hair!.id,
        name: { tk: 'Saç', en: 'Hair' },
        services: [{ id: haircut!.id, description: { en: 'Wash and cut' }, priceAmount: 100, name: { tk: 'Aýal saç kesimi' } }],
      },
      { id: own!.id, services: [{ name: { en: 'Henna' } }] },
    ])
    expect(again.json.groups[0].services.map((x: { id: string }) => x.id)).not.toContain(blowDry!.id)
    // not on the menu or twice, a starter of another category or used twice, a nameless new row, terms out of limits
    const wrong = await put({
      groups: [
        {
          starter: 'beard',
          services: [
            { id: blowDry!.id, durationMin: 45, priceType: 'fixed', priceAmount: 50 },
            { starter: 'manicure', durationMin: 45, priceType: 'fixed', priceAmount: 50 },
            { starter: 'manicure', durationMin: 45, priceType: 'fixed', priceAmount: 50 },
            { durationMin: 7, priceType: 'fixed', priceAmount: 0 },
          ],
        },
        { starter: 'nails', services: [{ id: haircut!.id, durationMin: 60, priceType: 'fixed', priceAmount: 90 }] },
        { starter: 'nails', services: [{ id: haircut!.id, durationMin: 60, priceType: 'fixed', priceAmount: 90 }] },
      ],
    })
    expect(wrong.status).toBe(400)
    expect(wrong.json.error.details.issues).toEqual([
      { path: ['groups', 0, 'starter'], code: 'invalid' },
      { path: ['groups', 0, 'services', 2, 'starter'], code: 'invalid' },
      { path: ['groups', 0, 'services', 3, 'durationMin'], code: 'invalid' },
      { path: ['groups', 0, 'services', 3, 'priceAmount'], code: 'invalid' },
      { path: ['groups', 0, 'services', 3, 'name'], code: 'invalid' },
      { path: ['groups', 2, 'starter'], code: 'invalid' },
    ])
    // the ids are checked against the menu once the starters pass
    const stale = await put({
      groups: [{ name: { en: 'X' }, services: [{ id: blowDry!.id, durationMin: 45, priceType: 'fixed', priceAmount: 50 }] }],
    })
    expect(stale.json.error.details.issues).toEqual([{ path: ['groups', 0, 'services', 0, 'id'], code: 'invalid' }])
    const tooMany = await put({
      groups: [
        {
          name: { en: 'A' },
          services: Array.from({ length: 101 }, () => ({ name: { en: 'S' }, durationMin: 30, priceType: 'fixed', priceAmount: 10 })),
        },
      ],
    })
    expect(tooMany.status).toBe(400)
    expect((await owner.req(`${W}/services`)).json.groups).toHaveLength(2)
    // the owner taken off every service in Settings still does the new ones: «I work alone»
    await owner.req(`${W}/services/${haircut!.id}`, { method: 'PATCH', body: { staffIds: [] } })
    await owner.req(`${W}/services/${own!.services[0]!.id}`, { method: 'PATCH', body: { staffIds: [] } })
    const alone = await put({
      groups: [{ starter: 'nails', services: [{ starter: 'manicure', durationMin: 45, priceType: 'fixed', priceAmount: 50 }] }],
    })
    expect(alone.json.groups).toMatchObject([{ name: { en: 'Nails' }, services: [{ staffIds: [me!.id] }] }])
    expect((await db.select({ bookable: staff.bookable }).from(staff).where(eq(staff.id, me!.id)))[0]!.bookable).toBe(true)
    // only the draft's owner, only while it's a draft
    expect((await (await as('+99365930041')).req(`${W}/setup/services`, { method: 'PUT', body })).status).toBe(404)
    const location = { cityId: 'ashgabat', address: 'Görogly köçesi 1', street: 'Görogly köçesi', lat: 37.94, lng: 58.38 }
    await owner.req(`${W}/settings/profile`, { method: 'PATCH', body: { location } })
    const day = { open: 600, close: 1140, break: null }
    await owner.req(`${W}/settings/hours`, { method: 'PUT', body: { hours: [day, day, day, day, day, null, null], specialDays: [] } })
    expect((await owner.req(`${W}/setup/finish`, { method: 'POST' })).status).toBe(204)
    expect((await put(body)).json.error.code).toBe('invalid_status')
  })

  it('the team step saves the people in one go; their invites go out at the finish', async () => {
    const owner = await as('+99365930050', 'Bahar')
    const { slug } = (await owner.req('/v1/setup', { body: { name: 'Bahar Barber', categoryId: 'barbershop' } })).json as { slug: string }
    const W = `/v1/w/${slug}`
    const put = (members: unknown[]) => owner.req(`${W}/setup/team`, { method: 'PUT', body: { members } })
    const [draft] = await db.select().from(businesses).where(eq(businesses.slug, slug))
    const [me] = await db
      .select()
      .from(staff)
      .where(and(eq(staff.businessId, draft!.id), eq(staff.level, 'owner')))
    const group = await owner.req(`${W}/services/groups`, { body: { name: { en: 'Hair' } } })
    const haircut = await owner.req(`${W}/services`, {
      body: { groupId: group.json.id, name: { en: 'Haircut' }, durationMin: 30, priceType: 'fixed', priceAmount: 40, staffIds: [me!.id] },
    })
    expect(haircut.status).toBe(201)
    // a mobile number for everyone, with the app or not
    const landline = await put([{ name: 'Myrat', phone: '+99312345678', level: 'specialist', hasApp: false }])
    expect(landline.status).toBe(400)
    // an administrator always with the app, nobody twice and not the owner's own number
    const wrong = await put([
      { name: 'Jeren', phone: '+99365930051', level: 'admin', hasApp: false },
      { name: 'Twice', phone: '+99365930051', level: 'specialist', hasApp: true },
      { name: 'Me', phone: '+99365930050', level: 'specialist', hasApp: true },
    ])
    expect(wrong.status).toBe(400)
    expect(wrong.json.error.details.issues).toEqual([
      { path: ['members', 0, 'hasApp'], code: 'invalid' },
      { path: ['members', 1, 'phone'], code: 'taken' },
      { path: ['members', 2, 'phone'], code: 'taken' },
    ])
    // only the draft's owner: a stranger doesn't learn it exists
    const stranger = await as('+99365930059')
    expect((await stranger.req(`${W}/setup/team`, { method: 'PUT', body: { members: [] } })).status).toBe(404)
    expect((await stranger.req(`${W}/team`)).status).toBe(404)
    const saved = await put([
      { name: 'Arslan', phone: '+99365930052', level: 'specialist', hasApp: true },
      { name: 'Jeren', phone: '+99365930053', level: 'admin', hasApp: true },
      { name: 'Myrat', phone: '+99365930054', level: 'specialist', hasApp: false },
    ])
    expect(saved.status).toBe(200)
    type Row = { id: string; name: string; level: string; status: string; hasApp: boolean; bookable: boolean; invite: unknown }
    const view = (items: Row[]) =>
      items.map(({ name, level, status, hasApp, bookable, invite }) => ({ name, level, status, hasApp, bookable, invite }))
    expect(view(saved.json.items)).toEqual([
      { name: 'Bahar', level: 'owner', status: 'active', hasApp: true, bookable: true, invite: null },
      { name: 'Arslan', level: 'specialist', status: 'invited', hasApp: true, bookable: true, invite: null },
      { name: 'Jeren', level: 'admin', status: 'invited', hasApp: true, bookable: false, invite: null },
      { name: 'Myrat', level: 'specialist', status: 'active', hasApp: false, bookable: true, invite: null },
    ])
    // the step reopens with them; no invite exists before the finish
    expect(view((await owner.req(`${W}/team`)).json.items)).toEqual(view(saved.json.items))
    expect(await db.select().from(invites).where(eq(invites.businessId, draft!.id))).toEqual([])
    // the specialists do the menu's services, an administrator none
    const byName = (name: string) => (saved.json.items as Row[]).find((m) => m.name === name)!
    const arslan = byName('Arslan')
    expect(await db.select().from(staffServices).where(eq(staffServices.staffId, arslan.id))).toHaveLength(1)
    expect(
      await db
        .select()
        .from(staffServices)
        .where(eq(staffServices.staffId, byName('Jeren').id)),
    ).toEqual([])
    // what a kept specialist does stays as it was (Settings may narrow it)
    await db.delete(staffServices).where(eq(staffServices.staffId, arslan.id))
    // saved again: a kept person keeps their row, someone left out goes
    const again = await put([{ name: 'Arslan B.', phone: '+99365930052', level: 'specialist', hasApp: true }])
    expect((again.json.items as Row[]).map((m) => [m.name, m.id === arslan.id || m.level === 'owner'])).toEqual([
      ['Bahar', true],
      ['Arslan B.', true],
    ])
    expect(await db.select().from(staffServices).where(eq(staffServices.staffId, arslan.id))).toEqual([])
    // "I work alone": only the owner
    expect((await put([])).json.items.map((m: Row) => m.level)).toEqual(['owner'])
    await put([
      { name: 'Arslan', phone: '+99365930052', level: 'specialist', hasApp: true },
      { name: 'Myrat', phone: '+99365930054', level: 'specialist', hasApp: false },
    ])
    // finished with an address, an open day and a service
    const location = { cityId: 'ashgabat', address: 'Magtymguly şaýoly 7', street: 'Magtymguly şaýoly', lat: 37.95, lng: 58.37 }
    await owner.req(`${W}/settings/profile`, { method: 'PATCH', body: { location } })
    const day = { open: 600, close: 1140, break: null }
    await owner.req(`${W}/settings/hours`, { method: 'PUT', body: { hours: [day, day, day, day, day, null, null], specialDays: [] } })
    expect((await owner.req(`${W}/setup/finish`, { method: 'POST' })).status).toBe(204)
    // the finish sends the invite to the one with the app, who sees it at sign-in
    const sent = await db.select().from(invites).where(eq(invites.businessId, draft!.id))
    expect(sent.map((i) => [i.phone, i.status])).toEqual([['+99365930052', 'pending']])
    const invitee = await as('+99365930052', 'Arslan')
    expect((await invitee.req('/v1/me/invites')).json.items).toHaveLength(1)
    expect((await put([])).json.error.code).toBe('invalid_status')
  })

  it('a draft is only for the wizard: no calendar, clients or invites yet; its account deleted takes it along', async () => {
    const owner = await as('+99365930020', 'Läle')
    const { slug } = (await owner.req('/v1/setup', { body: { name: 'Läle Spa', categoryId: 'spa' } })).json as { slug: string }
    expect((await owner.req(`/v1/w/${slug}/settings/profile`)).status).toBe(200)
    expect((await owner.req(`/v1/w/${slug}/calendar?date=2026-10-15`)).status).toBe(404)
    expect((await owner.req(`/v1/w/${slug}/clients`)).status).toBe(404)
    // its team is read (the wizard's team step), but nobody is invited through the settings while it's a draft
    expect((await owner.req(`/v1/w/${slug}/team`)).json.items.map((m: { level: string }) => m.level)).toEqual(['owner'])
    const invite = { name: 'Aýgül', phone: '+99365930022', level: 'specialist' }
    expect((await owner.req(`/v1/w/${slug}/team/invites`, { body: invite })).status).toBe(404)
    // a stranger signed in doesn't learn it exists
    expect((await (await as('+99365930021')).req(`/v1/businesses/${slug}`)).status).toBe(404)
    expect((await owner.req('/v1/me', { method: 'DELETE' })).status).toBe(204)
    expect(await db.select().from(businesses).where(eq(businesses.slug, slug))).toEqual([])
  })

  it('long names get page addresses that work; a nameless account and a double tap are refused', async () => {
    const name = 'Glamour Beauty Salon and Spa for Women in Ashgabat City Centre'
    const slugs: string[] = []
    for (const phone of ['+99365930030', '+99365930031', '+99365930032']) {
      const res = await (await as(phone)).req('/v1/setup', { body: { name, categoryId: 'beauty' } })
      expect(res.status).toBe(201)
      slugs.push(res.json.slug as string)
    }
    expect(new Set(slugs).size).toBe(3)
    for (const slug of slugs) expect((await browser(t.app).req(`/v1/businesses/${slug}`)).json.error.code).toBe('not_found')
    // the sign-up's name step comes first
    const nameless = browser(t.app)
    await nameless.login('+99365930033')
    expect((await nameless.req('/v1/setup', { body: { name: 'X', categoryId: 'beauty' } })).json.error.details.issues).toEqual([
      { path: ['name'], code: 'account_name_required' },
    ])
    const tapper = await as('+99365930034')
    const both = await Promise.all([1, 2].map(() => tapper.req('/v1/setup', { body: { name: 'Twice', categoryId: 'beauty' } })))
    expect(both.map((r) => r.status).sort()).toEqual([201, 409])
  })
})
