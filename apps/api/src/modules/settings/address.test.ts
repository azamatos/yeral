/** A business that moves tells the clients with a booking ahead (book Q-215, owner 20.10.2026). */
import { ADDRESS_SMS_AFTER_MS } from '@yeral/domain/lifecycle'
import { epochOf } from '@yeral/domain/time'
import { and, eq, sql } from 'drizzle-orm'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { DEMO_NOW, testApp } from '../../../test/app'
import { browser } from '../../../test/client'
import { testDatabase } from '../../../test/db'
import type { Db } from '../../db/client'
import { bookings, businesses, jobs, rateLimits, services, staff } from '../../db/schema'
import { seed } from '../../db/seed'
import { runDueJobs } from '../jobs/run'

const MAYSA = '+99365102030' // owner of Glow Studio
const W = '/v1/w/glow-studio'
const PROFILE = `${W}/settings/profile`
const FRI = '2026-10-16'
const MON = '2026-10-19'
const TUE = '2026-10-20'

describe('a new address (book Q-215)', () => {
  let db: Db
  let t: ReturnType<typeof testApp>
  let manicure: string
  let maralId: string
  beforeAll(async () => {
    ;({ db } = await testDatabase())
    await seed(db, { demo: true, now: DEMO_NOW })
    const [glow] = await db.select().from(businesses).where(eq(businesses.slug, 'glow-studio'))
    manicure = (await db.select().from(services).where(eq(services.businessId, glow!.id))).find((s) => s.name.en === 'Manicure')!.id
    const [maral] = await db
      .select()
      .from(staff)
      .where(and(eq(staff.businessId, glow!.id), eq(staff.name, 'Maral')))
    maralId = maral!.id
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
  /** A booking the team enters with Maral, quietly, its undo time over. */
  const book = async (maysa: ReturnType<typeof browser>, phone: string, date: string, start: number) => {
    const made = await maysa.req(`${W}/bookings`, {
      body: { source: 'phone', phone, serviceIds: [manicure], staffId: maralId, date, start, notifyClient: false },
    })
    expect(made.status).toBe(201)
    t.clock.now += 15_000
    return made.json.code as string
  }
  /** A client's own request with Maral, waiting for an answer. */
  const request = async (phone: string, date: string, start: number) => {
    const client = await as(phone, 'Client')
    const made = await client.req('/v1/bookings', {
      body: { type: 'appointment', business: 'glow-studio', serviceIds: [manicure], staffId: maralId, date, start },
    })
    expect(made.json.status).toBe('pending')
    return { client, code: made.json.code as string }
  }
  const glow = async () => (await db.select().from(businesses).where(eq(businesses.slug, 'glow-studio')))[0]!
  /** The location as stored, changed by `location`. */
  const moveTo = async (maysa: ReturnType<typeof browser>, location: Record<string, unknown>) => {
    const { cityId, address, street, lat, lng } = await glow()
    return maysa.req(PROFILE, { method: 'PATCH', body: { location: { cityId, address, street, lat, lng, ...location } } })
  }
  const newAddressSms = (phone: string) => t.sms.sent.filter((s) => s.to === phone && /new address/.test(s.text)).map((s) => s.text)
  const waitingFor = async (code: string) =>
    db
      .select()
      .from(jobs)
      .where(
        and(
          sql`${jobs.payload}->>'kind' = 'addressChanged'`,
          sql`${jobs.payload}->>'bookingId' = (select id::text from bookings where code = ${code})`,
          sql`${jobs.doneAt} is null`,
        ),
      )
  const afterTheWait = async () => {
    t.clock.now += ADDRESS_SMS_AFTER_MS
    await runDueJobs(t.deps)
  }

  it('every booking ahead hears the new address once, 10 minutes after the last fix; the booking and the page say so', async () => {
    const maysa = await as(MAYSA)
    const confirmed = await book(maysa, '+99365800401', FRI, 600)
    const { client, code: waiting } = await request('+99365800402', FRI, 720)
    // gone or over: nothing to tell
    const cancelled = await book(maysa, '+99365800403', FRI, 840)
    expect((await maysa.req(`${W}/bookings/${cancelled}/cancel`, { body: { reason: 'staff_away' } })).status).toBe(204)
    // confirmed, with the client's move waiting: the booking hears it, not the move too
    const { client: mover, code: kept } = await request('+99365800410', MON, 840)
    expect((await maysa.req(`${W}/requests/${kept}/confirm`, { body: {} })).status).toBe(204)
    expect((await mover.req(`/v1/me/bookings/${kept}/reschedule`, { body: { date: MON, start: 960 } })).status).toBe(200)

    expect((await moveTo(maysa, { address: 'Oguzhan köçesi 21', street: 'Oguzhan köçesi' })).status).toBe(200)
    await runDueJobs(t.deps)
    expect(newAddressSms('+99365800401')).toEqual([])
    // the typo fixed two minutes later: still one SMS per booking, its time moved on
    t.clock.now += 2 * 60_000
    await moveTo(maysa, { address: 'Oguzhan köçesi 12', street: 'Oguzhan köçesi' })
    expect(await waitingFor(confirmed)).toHaveLength(1)
    expect((await waitingFor(confirmed))[0]!.runAt.getTime()).toBe(t.clock.now + ADDRESS_SMS_AFTER_MS)
    await runDueJobs(t.deps)
    expect(newAddressSms('+99365800401')).toEqual([])

    await afterTheWait()
    expect(newAddressSms('+99365800401')).toEqual([
      expect.stringMatching(
        /^Ýeral: Glow Studio has moved to a new address: Oguzhan köçesi 12\. Your booking: .+, 16 October, 10:00\. .+\/l\//,
      ),
    ])
    expect(newAddressSms('+99365800402')).toEqual([expect.stringMatching(/new address: Oguzhan köçesi 12\. Your booking: .+12:00/)])
    expect(newAddressSms('+99365800403')).toEqual([])
    expect(newAddressSms('+99365800410')).toEqual([expect.stringMatching(/new address: Oguzhan köçesi 12\. Your booking: .+14:00/)])
    // the booking and the business page say "New address"
    const moved = t.clock.now - ADDRESS_SMS_AFTER_MS
    expect((await client.req(`/v1/me/bookings/${waiting}`)).json).toMatchObject({ address: 'Oguzhan köçesi 12', movedAt: moved })
    expect((await client.req('/v1/businesses/glow-studio')).json.movedAt).toBe(moved)
    // a booking made after the move says nothing about it
    const { client: later, code: fresh } = await request('+99365800404', MON, 600)
    expect((await later.req(`/v1/me/bookings/${fresh}`)).json.movedAt).toBeNull()

    // moved again: told again, from the address they heard
    await moveTo(maysa, { address: 'Bitarap Türkmenistan 5', street: 'Bitarap Türkmenistan' })
    await afterTheWait()
    expect(newAddressSms('+99365800401')).toHaveLength(2)
    expect(newAddressSms('+99365800401').at(-1)).toMatch(/new address: Bitarap Türkmenistan 5\./)
  })

  it('a move and back tells nothing; a new pin alone isn’t a move', async () => {
    const maysa = await as(MAYSA)
    const code = await book(maysa, '+99365800405', FRI, 900)
    const { address, street } = await glow()

    await moveTo(maysa, { address: 'Wrong street 1', street: 'Wrong street' })
    t.clock.now += 60_000
    await moveTo(maysa, { address, street })
    await afterTheWait()
    expect(newAddressSms('+99365800405')).toEqual([])
    const [job] = await db
      .select()
      .from(jobs)
      .where(
        and(
          sql`${jobs.payload}->>'kind' = 'addressChanged'`,
          sql`${jobs.payload}->>'bookingId' = (select id::text from bookings where code = ${code})`,
        ),
      )
    expect(job).toMatchObject({ error: 'dropped: the client knows the address as it is', attempts: 0 })

    // the pin moved a little: checked again by the Ýeral team, but no SMS and no "New address"
    t.clock.now += 60_000
    const before = await glow()
    await moveTo(maysa, { lat: before.lat + 0.001 })
    expect(await waitingFor(code)).toHaveLength(0)
    const after = await glow()
    expect(after.addressChangedAt!.getTime()).toBeGreaterThan(before.addressChangedAt!.getTime())
    expect(after.movedAt).toEqual(before.movedAt)
  })

  it('a visit soon hears it at once; one under way hears nothing', async () => {
    const maysa = await as(MAYSA)
    // Maral's first free time on Monday, booked the evening before; then 20 minutes before it
    const free = async () =>
      ((await maysa.req(`${W}/free-times?services=${manicure}&staff=${maralId}&date=${MON}`)).json.slots as { start: number }[]).map(
        (x) => x.start,
      )
    const first = (await free())[0]!
    const soon = await book(maysa, '+99365800406', MON, first)
    const second = (await free()).find((x) => x > first)!
    const started = await book(maysa, '+99365800409', MON, second)
    t.clock.now = epochOf(MON, first - 20)
    await moveTo(maysa, { address: 'Görogly köçesi 3', street: 'Görogly köçesi' })
    await runDueJobs(t.deps)
    expect(newAddressSms('+99365800406')).toEqual([expect.stringMatching(/new address: Görogly köçesi 3\. Your booking: /)])
    expect((await db.select().from(bookings).where(eq(bookings.code, soon)))[0]!.addressTold).toMatchObject({
      address: 'Görogly köçesi 3',
    })
    // the next one starts before its SMS was due: nothing
    t.clock.now = epochOf(MON, second) + 60_000
    await runDueJobs(t.deps)
    expect(newAddressSms('+99365800409')).toEqual([])
    expect(started).toBeTruthy()
  })

  it('a home-based business: a waiting request knows only the street', async () => {
    const maysa = await as(MAYSA)
    await maysa.req(PROFILE, { method: 'PATCH', body: { hideExactAddress: true } })
    const confirmed = await book(maysa, '+99365800407', TUE, 600)
    const { client, code } = await request('+99365800408', TUE, 720)
    // a new house number on the same street: the confirmed booking hears it, the waiting request has nothing new
    await moveTo(maysa, { address: 'Görogly köçesi 7' })
    await afterTheWait()
    expect(newAddressSms('+99365800407')).toEqual([expect.stringMatching(/new address: Görogly köçesi 7\./)])
    expect(newAddressSms('+99365800408')).toEqual([])
    expect((await client.req(`/v1/me/bookings/${code}`)).json.address).toBe('Görogly köçesi')
    // another street: the request hears the street only
    await moveTo(maysa, { address: 'Magtymguly şaýoly 40', street: 'Magtymguly şaýoly' })
    await afterTheWait()
    expect(newAddressSms('+99365800408')).toEqual([expect.stringMatching(/new address: Magtymguly şaýoly\. Your booking/)])
    expect(newAddressSms('+99365800407').at(-1)).toMatch(/new address: Magtymguly şaýoly 40\./)
    expect(confirmed).toBeTruthy()
    await maysa.req(PROFILE, { method: 'PATCH', body: { hideExactAddress: false } })
  })
})
