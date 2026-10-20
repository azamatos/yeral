/** "Arz et" (book B-28, Q-206, Q-207, Q-254): no-shows, late, rude, other; taken back within 7 days. */
import { epochOf } from '@yeral/domain/time'
import { and, eq } from 'drizzle-orm'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { DEMO_NOW, testApp } from '../../../test/app'
import { browser } from '../../../test/client'
import { testDatabase } from '../../../test/db'
import type { Db } from '../../db/client'
import { bookings, businesses, rateLimits, services, staff } from '../../db/schema'
import { seed } from '../../db/seed'

const MAYSA = '+99365102030' // owner of Glow Studio
const MARAL = '+99361440819' // specialist: nails
const AYNA = '+99365312210' // specialist: hair
const W = '/v1/w/glow-studio'
const DAY = '2026-10-22' // a Thursday

describe('"Arz et" (book B-28)', () => {
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
  /** A booking the team enters with Maral for a client who has an account, its undo time over. */
  const book = async (maysa: ReturnType<typeof browser>, phone: string, date: string, start: number) => {
    const made = await maysa.req(`${W}/bookings`, {
      body: { source: 'phone', phone, serviceIds: [manicure], staffId: maralId, date, start, notifyClient: false },
    })
    expect(made.status).toBe(201)
    t.clock.now += 15_000
    return made.json.code as string
  }
  const complain = (b: ReturnType<typeof browser>, code: string, body: Record<string, unknown>) =>
    b.req(`${W}/bookings/${code}/complaint`, { body })
  const rowOf = async (code: string) => (await db.select().from(bookings).where(eq(bookings.code, code)))[0]!

  it('before the visit only rude or other; from its start a no-show the client sees, in place of the earlier one', async () => {
    const maysa = await as(MAYSA)
    const client = await as('+99365800901', 'Jeren')
    const code = await book(maysa, '+99365800901', DAY, 600)
    expect((await complain(maysa, code, { type: 'noshow' })).json.error.code).toBe('not_started')
    expect((await complain(maysa, code, { type: 'late' })).json.error.code).toBe('not_started')
    expect((await complain(maysa, code, { type: 'other' })).status).toBe(400)
    expect((await complain(maysa, code, { type: 'rude', text: 'Shouted on the phone' })).status).toBe(204)
    expect(await rowOf(code)).toMatchObject({ status: 'confirmed', complaintType: 'rude', complaintText: 'Shouted on the phone' })
    // the team's only
    expect(JSON.stringify((await client.req(`/v1/me/bookings/${code}`)).json)).not.toMatch(/Shouted|rude/)
    expect((await complain(maysa, code, { type: 'rude' })).json.error.code).toBe('already_reported')

    t.clock.now = epochOf(DAY, 620)
    expect((await complain(maysa, code, { type: 'noshow' })).status).toBe(204)
    expect(await rowOf(code)).toMatchObject({ status: 'noshow', complaintType: 'noshow' })
    expect((await client.req(`/v1/me/bookings/${code}`)).json.status).toBe('noshow')
    // the calendar shows it on the block
    const day = (await maysa.req(`${W}/calendar?date=${DAY}&cancelled=true`)).json.bookings as { code: string; complaint: unknown }[]
    expect(day.find((b) => b.code === code)!.complaint).toMatchObject({ type: 'noshow' })
  })

  it('a no-show up to a day after the visit; taken back within 7 days, the visit as it was', async () => {
    const maysa = await as(MAYSA)
    const late = await book(maysa, '+99365800902', DAY, 720)
    const code = await book(maysa, '+99365800903', '2026-10-30', 600)
    t.clock.now = epochOf(DAY, 780) + 25 * 3_600_000
    expect((await complain(maysa, late, { type: 'noshow' })).json.error.code).toBe('noshow_window_passed')

    t.clock.now = epochOf('2026-10-30', 610)
    expect((await complain(maysa, code, { type: 'noshow' })).status).toBe(204)
    // taken back while the visit runs: confirmed again
    expect((await maysa.req(`${W}/bookings/${code}/complaint`, { method: 'DELETE' })).status).toBe(204)
    expect(await rowOf(code)).toMatchObject({ status: 'confirmed', complaintType: null, complaintBy: null, completedAt: null })
    // marked again after the visit, taken back after it ended: completed
    t.clock.now = epochOf('2026-10-30', 700)
    expect((await complain(maysa, code, { type: 'noshow' })).status).toBe(204)
    expect((await maysa.req(`${W}/bookings/${code}/complaint`, { method: 'DELETE' })).status).toBe(204)
    expect((await rowOf(code)).status).toBe('completed')
    // a complaint 7 days old stays
    expect((await complain(maysa, code, { type: 'late' })).status).toBe(204)
    t.clock.now += 7 * 86_400_000
    expect((await maysa.req(`${W}/bookings/${code}/complaint`, { method: 'DELETE' })).json.error.code).toBe('complaint_locked')
  })

  it('a specialist marks their own; two no-shows make the client phone-only, one taken back lifts it', async () => {
    const maysa = await as(MAYSA)
    const maral = await as(MARAL)
    const client = await as('+99365800904', 'Ogul')
    const first = await book(maysa, '+99365800904', '2026-10-27', 600)
    const second = await book(maysa, '+99365800904', '2026-10-27', 720)
    t.clock.now = epochOf('2026-10-27', 800)
    expect((await complain(await as(AYNA), first, { type: 'noshow' })).status).toBe(404)
    expect((await complain(maral, first, { type: 'noshow' })).status).toBe(204)
    // who filed it, for the client card
    expect((await rowOf(first)).complaintBy).toBe(maralId)
    expect((await complain(maral, second, { type: 'noshow' })).status).toBe(204)
    const tryOnline = async () => {
      const free = (await client.req(`/v1/businesses/glow-studio/availability?services=${manicure}&staff=${maralId}&date=2026-10-29`)).json
        .slots as { start: number }[]
      return client.req('/v1/bookings', {
        body: {
          type: 'appointment',
          business: 'glow-studio',
          serviceIds: [manicure],
          staffId: maralId,
          date: '2026-10-29',
          start: free[0]!.start,
        },
      })
    }
    expect((await tryOnline()).json.error.code).toBe('online_blocked')
    expect((await maral.req(`${W}/bookings/${second}/complaint`, { method: 'DELETE' })).status).toBe(204)
    expect((await tryOnline()).status).toBe(201)
  })
})
