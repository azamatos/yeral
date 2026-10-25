/** The services menu the business keeps (book B-38): groups, services, who does each, and the clients' order. */
import { and, eq } from 'drizzle-orm'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { DEMO_NOW, testApp } from '../../../test/app'
import { browser } from '../../../test/client'
import { testDatabase } from '../../../test/db'
import type { Db } from '../../db/client'
import { businesses, rateLimits, serviceGroups, staff, staffServices } from '../../db/schema'
import { seed } from '../../db/seed'
import { runDueJobs } from '../jobs/run'

const MAYSA = '+99365102030' // owner of Glow Studio
const AYNA = '+99365312210' // a specialist there
const MENU = '/v1/w/glow-studio/services'
const FRI = '2026-10-16'

interface MenuService {
  id: string
  groupId: string
  name: Record<string, string>
  priceType: string
  priceAmount: number
  online: boolean
  staffIds: string[]
  futureBookings: number
}
interface MenuGroup {
  id: string
  name: Record<string, string>
  services: MenuService[]
}

describe('the services menu (book B-38)', () => {
  let db: Db
  let t: ReturnType<typeof testApp>
  let aynaId: string
  beforeAll(async () => {
    ;({ db } = await testDatabase())
    await seed(db, { demo: true, now: DEMO_NOW })
    const [glow] = await db.select().from(businesses).where(eq(businesses.slug, 'glow-studio'))
    const [ayna] = await db
      .select()
      .from(staff)
      .where(and(eq(staff.businessId, glow!.id), eq(staff.name, 'Aýna')))
    aynaId = ayna!.id
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
  const menuOf = async (b: ReturnType<typeof browser>) => (await b.req(MENU)).json.groups as MenuGroup[]
  const pageServices = async (b: ReturnType<typeof browser>) =>
    (
      (await b.req('/v1/businesses/glow-studio?lang=en')).json.serviceGroups as {
        name: string
        services: { id: string; name: string; price: unknown }[]
      }[]
    ).flatMap((g) => g.services)

  it('the owner sees all of it: every language, hidden amounts, services not online, who does each; a specialist gets 403', async () => {
    const maysa = await as(MAYSA)
    const groups = await menuOf(maysa)
    expect(groups.length).toBeGreaterThan(1)
    const [first] = groups[0]!.services
    expect(first!.name).toMatchObject({ tk: expect.any(String), ru: expect.any(String), en: expect.any(String) })
    expect(first!.staffIds.length).toBeGreaterThan(0)
    // the client page shows the same services, in the same order, apart from those not online
    const online = groups.flatMap((g) => g.services.filter((s) => s.online).map((s) => s.id))
    expect((await pageServices(maysa)).map((s) => s.id)).toEqual(online)
    const ayna = await as(AYNA)
    expect((await ayna.req(MENU)).status).toBe(403)
  })

  it('a service added, changed and deleted: the client page follows; bookings ahead stay, and the delete can be undone (Q-210)', async () => {
    const maysa = await as(MAYSA)
    const group = await maysa.req(`${MENU}/groups`, { body: { name: { en: 'Nails' } } })
    expect(group.status).toBe(201)
    const made = await maysa.req(MENU, {
      body: {
        groupId: group.json.id,
        name: { en: 'Gel polish' },
        durationMin: 45,
        priceType: 'fixed',
        priceAmount: 80,
        staffIds: [aynaId],
      },
    })
    expect(made.status).toBe(201)
    expect(made.json).toMatchObject({ name: { en: 'Gel polish' }, bufferMin: null, online: true, staffIds: [aynaId], futureBookings: 0 })
    const id = made.json.id as string
    expect((await pageServices(maysa)).map((s) => s.name)).toContain('Gel polish')

    expect((await maysa.req(`${MENU}/${id}`, { method: 'PATCH', body: { online: false } })).json.online).toBe(false)
    expect((await pageServices(maysa)).map((s) => s.id)).not.toContain(id)
    await maysa.req(`${MENU}/${id}`, { method: 'PATCH', body: { online: true, priceType: 'hidden', priceAmount: 90 } })
    expect((await pageServices(maysa)).find((s) => s.id === id)?.price).toEqual({ type: 'hidden', amount: 0 })
    expect((await menuOf(maysa)).flatMap((g) => g.services).find((s) => s.id === id)).toMatchObject({ priceAmount: 90 })

    // a client books it
    const client = await as('+99365700020', 'Client')
    const free = (await client.req(`/v1/businesses/glow-studio/availability?services=${id}&staff=any&date=${FRI}`)).json.slots
    const booked = await client.req('/v1/bookings', {
      body: { type: 'appointment', business: 'glow-studio', serviceIds: [id], staffId: null, date: FRI, start: free.at(-1).start },
    })
    expect(booked.status).toBe(201)
    expect((await menuOf(maysa)).flatMap((g) => g.services).find((s) => s.id === id)?.futureBookings).toBe(1)

    expect((await maysa.req(`${MENU}/${id}`, { method: 'DELETE' })).status).toBe(204)
    expect((await menuOf(maysa)).flatMap((g) => g.services).map((s) => s.id)).not.toContain(id)
    expect((await pageServices(maysa)).map((s) => s.id)).not.toContain(id)
    // the booking keeps its service, archived, by name and id (the catalogue no longer lists it)
    const detail = (await client.req(`/v1/me/bookings/${booked.json.code}?lang=en`)).json
    expect(detail).toMatchObject({ status: 'pending', what: { items: [{ service: 'Gel polish', serviceId: id }] } })
    // "Yzyna al"
    const back = await maysa.req(`${MENU}/${id}/restore`, { method: 'POST' })
    expect(back.json).toMatchObject({ id, futureBookings: 1 })
    expect((await pageServices(maysa)).map((s) => s.id)).toContain(id)
  })

  it('only what the screen offers: each wrong field is named', async () => {
    const maysa = await as(MAYSA)
    const [group] = await menuOf(maysa)
    const base = { groupId: group!.id, name: { en: 'Test' }, durationMin: 30, priceType: 'fixed', priceAmount: 50 }
    const issues = async (body: object) => {
      const res = await maysa.req(MENU, { body })
      expect(res.status).toBe(400)
      return (res.json.error.details.issues as { path: string[] }[]).map((i) => i.path[0])
    }
    expect(await issues({ ...base, durationMin: 62, priceType: 'free', bufferMin: 7 })).toEqual(['durationMin', 'priceAmount', 'bufferMin'])
    expect(await issues({ ...base, name: {} })).toEqual(['name'])
    expect(await issues({ ...base, staffIds: ['00000000-0000-4000-8000-000000000000'] })).toEqual(['staffIds'])
    // a group of another business
    const [barber] = await db.select().from(businesses).where(eq(businesses.slug, 'barber-loft'))
    const [theirs] = await db.select().from(serviceGroups).where(eq(serviceGroups.businessId, barber!.id))
    expect(await issues({ ...base, groupId: theirs!.id })).toEqual(['groupId'])
  })

  it("groups: deleted only when empty; the order is the clients' order", async () => {
    const maysa = await as(MAYSA)
    const groups = await menuOf(maysa)
    const busy = groups.find((g) => g.services.length > 0)!
    const refused = await maysa.req(`${MENU}/groups/${busy.id}`, { method: 'DELETE' })
    expect(refused.status).toBe(409)
    expect(refused.json.error.code).toBe('group_not_empty')

    // reversed: the groups, and the services in each
    const reversed = groups.map((g) => ({ id: g.id, serviceIds: g.services.map((s) => s.id).reverse() })).reverse()
    const ordered = await maysa.req(`${MENU}/order`, { method: 'PUT', body: { groups: reversed } })
    expect(ordered.status).toBe(200)
    expect((ordered.json.groups as MenuGroup[]).map((g) => g.id)).toEqual(reversed.map((g) => g.id))
    const online = (await menuOf(maysa)).flatMap((g) => g.services.filter((s) => s.online).map((s) => s.id))
    expect((await pageServices(maysa)).map((s) => s.id)).toEqual(online)

    // a service moved to another group by the order
    const [from, to] = [reversed[0]!, reversed[1]!]
    const moved = from.serviceIds[0]!
    const shifted = reversed.map((g) =>
      g.id === from.id ? { ...g, serviceIds: g.serviceIds.slice(1) } : g.id === to.id ? { ...g, serviceIds: [moved, ...g.serviceIds] } : g,
    )
    const after = (await maysa.req(`${MENU}/order`, { method: 'PUT', body: { groups: shifted } })).json.groups as MenuGroup[]
    expect(after.find((g) => g.id === to.id)!.services[0]).toMatchObject({ id: moved, groupId: to.id })
    // the order must hold every group and service once
    const missing = { groups: shifted.slice(1) }
    expect((await maysa.req(`${MENU}/order`, { method: 'PUT', body: missing })).status).toBe(400)

    // an empty group goes
    const spare = await maysa.req(`${MENU}/groups`, { body: { name: { en: 'Spare' } } })
    expect((await maysa.req(`${MENU}/groups/${spare.json.id}`, { method: 'DELETE' })).status).toBe(204)
  })

  it('a person picked for a service becomes bookable; someone removed neither shows nor stops a save', async () => {
    const maysa = await as(MAYSA)
    const added = await maysa.req('/v1/w/glow-studio/team/phone-only', { body: { phone: '+99312345678', name: 'Jeren' } })
    expect(added.json).toMatchObject({ bookable: false })
    const jeren = added.json.id as string
    const service = (await menuOf(maysa)).flatMap((g) => g.services)[0]!
    const picked = await maysa.req(`${MENU}/${service.id}`, { method: 'PATCH', body: { staffIds: [...service.staffIds, jeren] } })
    expect(picked.json.staffIds).toContain(jeren)
    const [row] = await db.select().from(staff).where(eq(staff.id, jeren))
    expect(row!.bookable).toBe(true)

    // removed: off the menu's list, and a save of what the screen shows keeps the link for a reactivation
    expect((await maysa.req(`/v1/w/glow-studio/team/${jeren}/remove`, { method: 'POST' })).status).toBeLessThan(300)
    const shown = (await menuOf(maysa)).flatMap((g) => g.services).find((s) => s.id === service.id)!
    expect(shown.staffIds).not.toContain(jeren)
    expect((await maysa.req(`${MENU}/${service.id}`, { method: 'PATCH', body: { staffIds: shown.staffIds } })).status).toBe(200)
    const kept = await db
      .select()
      .from(staffServices)
      .where(and(eq(staffServices.staffId, jeren), eq(staffServices.serviceId, service.id)))
    expect(kept).toHaveLength(1)
    // someone twice is a mistake
    expect((await maysa.req(`${MENU}/${service.id}`, { method: 'PATCH', body: { staffIds: [aynaId, aynaId] } })).status).toBe(400)
  })

  it('a deleted service is not booked again through an offered time: the client is told it can’t be (Q-210)', async () => {
    const maysa = await as(MAYSA)
    const [group] = await menuOf(maysa)
    const made = await maysa.req(MENU, {
      body: { groupId: group!.id, name: { en: 'Brow tint' }, durationMin: 30, priceType: 'fixed', priceAmount: 40, staffIds: [aynaId] },
    })
    const id = made.json.id as string
    const client = await as('+99365700021', 'Client')
    const free = (await client.req(`/v1/businesses/glow-studio/availability?services=${id}&staff=any&date=${FRI}`)).json.slots
    const booked = await client.req('/v1/bookings', {
      body: { type: 'appointment', business: 'glow-studio', serviceIds: [id], staffId: null, date: FRI, start: free[0].start },
    })
    expect(booked.status).toBe(201)
    // nobody answers: the request runs out and gets free times
    t.clock.now += 31 * 60_000
    await runDueJobs(t.deps)
    expect((await client.req(`/v1/me/bookings/${booked.json.code}`)).json.expiredAlternatives.length).toBeGreaterThan(0)
    expect((await maysa.req(`${MENU}/${id}`, { method: 'DELETE' })).status).toBe(204)
    const taken = await client.req(`/v1/me/bookings/${booked.json.code}/accept-alternative`, { body: { source: 'expired', index: 0 } })
    expect(taken.json.error.code).toBe('not_bookable')
  })
})
