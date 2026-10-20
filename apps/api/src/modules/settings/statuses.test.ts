/** Internal statuses (book B-29, F-104, F-133): team-only markers on confirmed bookings. */
import { and, eq } from 'drizzle-orm'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { DEMO_NOW, testApp } from '../../../test/app'
import { browser } from '../../../test/client'
import { testDatabase } from '../../../test/db'
import type { Db } from '../../db/client'
import { bookings, businesses, rateLimits, services, staff } from '../../db/schema'
import { seed } from '../../db/seed'

const MAYSA = '+99365102030' // owner of Glow Studio
const AYNA = '+99365312210' // specialist: hair
const MARAL = '+99361440819' // specialist: nails
const W = '/v1/w/glow-studio'
const STATUSES = `${W}/settings/statuses`

describe('internal statuses (book B-29)', () => {
  let db: Db
  let t: ReturnType<typeof testApp>
  let manicure: string
  let maralId: string
  beforeAll(async () => {
    ;({ db } = await testDatabase())
    await seed(db, { demo: true, now: DEMO_NOW })
    const [glow] = await db.select().from(businesses).where(eq(businesses.slug, 'glow-studio'))
    manicure = (await db.select().from(services).where(eq(services.businessId, glow!.id))).find((s) => s.name.en === 'Manicure')!.id
    maralId = (
      await db
        .select()
        .from(staff)
        .where(and(eq(staff.businessId, glow!.id), eq(staff.name, 'Maral')))
    )[0]!.id
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

  it('the presets are there, off; the owner adds up to five with names not taken; the team reads them', async () => {
    const maysa = await as(MAYSA)
    const first = (await maysa.req(STATUSES)).json
    expect(first).toEqual({
      max: 5,
      items: [
        { id: expect.any(String), preset: 'arrived', name: 'Arrived', icon: 'user-check', color: '#066a41', enabled: false },
        { id: expect.any(String), preset: 'started', name: 'Started', icon: 'play', color: '#4429d6', enabled: false },
      ],
    })
    // read twice: no second pair
    expect((await maysa.req(STATUSES)).json.items).toHaveLength(2)
    const added = await maysa.req(STATUSES, { body: { name: 'Preparing', icon: 'hourglass', color: '#93500a' } })
    expect(added.status).toBe(201)
    expect(added.json).toMatchObject({ preset: null, name: 'Preparing', icon: 'hourglass', color: '#93500a', enabled: true })
    // "Bu at eýýäm bar", whatever its case, a preset's included
    for (const name of ['preparing', 'ARRIVED'])
      expect((await maysa.req(STATUSES, { body: { name, icon: 'flag', color: '#41505f' } })).json.error.details.issues).toEqual([
        { path: ['name'], code: 'taken' },
      ])
    expect((await maysa.req(STATUSES, { body: { name: 'Washing', icon: 'sparkles', color: '#101014' } })).status).toBe(201)
    expect((await maysa.req(STATUSES, { body: { name: 'Paid', icon: 'star', color: '#a3251b' } })).status).toBe(201)
    // "Iň köp 5 içerki ýagdaý bolup biler"
    expect((await maysa.req(STATUSES, { body: { name: 'Sixth', icon: 'bell', color: '#41505f' } })).json.error.code).toBe('statuses_full')
    // an icon or a colour off the design's lists
    expect((await maysa.req(STATUSES, { body: { name: 'Odd', icon: 'rocket', color: '#41505f' } })).status).toBe(400)
    // the team reads them for the booking drawer; only those who change settings change them
    const ayna = await as(AYNA)
    expect((await ayna.req(STATUSES)).json.items).toHaveLength(5)
    expect((await ayna.req(STATUSES, { body: { name: 'Mine', icon: 'flag', color: '#41505f' } })).status).toBe(403)
  })

  it('a preset is switched on, keeps its name and can’t be deleted; the business’s own can', async () => {
    const maysa = await as(MAYSA)
    const items = (await maysa.req(STATUSES)).json.items as { id: string; preset: string | null; name: string }[]
    const arrived = items.find((s) => s.preset === 'arrived')!
    const own = items.find((s) => s.name === 'Paid')!
    expect((await maysa.req(`${STATUSES}/${arrived.id}`, { method: 'PATCH', body: { enabled: true } })).json).toMatchObject({
      enabled: true,
    })
    expect((await maysa.req(`${STATUSES}/${arrived.id}`, { method: 'PATCH', body: { name: 'Here' } })).json.error.details.issues).toEqual([
      { path: ['name'], code: 'preset' },
    ])
    expect((await maysa.req(`${STATUSES}/${arrived.id}`, { method: 'DELETE' })).status).toBe(400)
    // a new colour leaves it as it is: off stays off
    const started = items.find((s) => s.preset === 'started')!
    expect((await maysa.req(`${STATUSES}/${started.id}`, { method: 'PATCH', body: { color: '#93500a' } })).json).toMatchObject({
      enabled: false,
      color: '#93500a',
    })
    // a preset's name in another language is taken too
    expect((await maysa.req(`${STATUSES}/${own.id}`, { method: 'PATCH', body: { name: 'Geldi' } })).json.error.details.issues).toEqual([
      { path: ['name'], code: 'taken' },
    ])
    expect((await maysa.req(`${STATUSES}/${own.id}`, { method: 'PATCH', body: { name: 'Prepaid', color: '#066a41' } })).json).toMatchObject(
      {
        name: 'Prepaid',
        color: '#066a41',
      },
    )
    expect((await maysa.req(`${STATUSES}/${own.id}`, { method: 'DELETE' })).status).toBe(204)
    expect((await maysa.req(STATUSES)).json.items).toHaveLength(4)
  })

  it('on a confirmed booking, by whoever sees it; never on a request, never a status that’s off; the client never sees it', async () => {
    const maysa = await as(MAYSA)
    const items = (await maysa.req(STATUSES)).json.items as { id: string; preset: string | null; enabled: boolean }[]
    const arrived = items.find((s) => s.preset === 'arrived')!
    const started = items.find((s) => s.preset === 'started')!
    const made = await maysa.req(`${W}/bookings`, {
      body: {
        source: 'phone',
        phone: '+99365800701',
        serviceIds: [manicure],
        staffId: maralId,
        date: '2026-10-22',
        start: 600,
        notifyClient: false,
      },
    })
    const code = made.json.code as string
    const put = (b: ReturnType<typeof browser>, statusId: string | null) =>
      b.req(`${W}/bookings/${code}/internal-status`, { method: 'PUT', body: { statusId } })
    expect((await put(maysa, arrived.id)).status).toBe(204)
    expect((await db.select().from(bookings).where(eq(bookings.code, code)))[0]!.internalStatusId).toBe(arrived.id)
    // moved to another time, it loses the marker that was about the old one
    t.clock.now += 15_000
    expect((await maysa.req(`${W}/bookings/${code}/move`, { body: { date: '2026-10-22', start: 660 } })).status).toBe(204)
    expect((await db.select().from(bookings).where(eq(bookings.code, code)))[0]!.internalStatusId).toBeNull()
    await put(maysa, arrived.id)
    // Maral sees her own booking and marks it; Aýna doesn't see it
    expect((await put(await as(MARAL), null)).status).toBe(204)
    expect((await put(await as(AYNA), arrived.id)).status).toBe(404)
    // a status that's off
    expect((await put(maysa, started.id)).json.error.details.issues).toEqual([{ path: ['statusId'], code: 'not_found' }])
    // a request waiting for its answer
    const client = await as('+99365800702', 'Client')
    const free = (await client.req(`/v1/businesses/glow-studio/availability?services=${manicure}&staff=${maralId}&date=2026-10-23`)).json
      .slots as { start: number }[]
    const sent = await client.req('/v1/bookings', {
      body: {
        type: 'appointment',
        business: 'glow-studio',
        serviceIds: [manicure],
        staffId: maralId,
        date: '2026-10-23',
        start: free[0]!.start,
      },
    })
    expect(
      (await maysa.req(`${W}/bookings/${sent.json.code}/internal-status`, { method: 'PUT', body: { statusId: arrived.id } })).json.error
        .code,
    ).toBe('invalid_status')
    // the client's view of a booking has nothing of it
    expect(JSON.stringify((await client.req(`/v1/me/bookings/${sent.json.code}`)).json)).not.toMatch(/internal/i)
  })
})
