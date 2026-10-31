/**
 * One booking by its code, the team's note on it, and who filed its complaint (slice 4's gaps 1, 2 and 5; book B-16
 * step 5, B-28, B-30).
 */
import { TEAM_NOTE_MAX } from '@yeral/domain/clients'
import { epochOf } from '@yeral/domain/time'
import { and, eq } from 'drizzle-orm'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { DEMO_NOW, testApp } from '../../../test/app'
import { browser, eventsAfter } from '../../../test/client'
import { testDatabase } from '../../../test/db'
import type { Db } from '../../db/client'
import { bookings, businesses, rateLimits, services, staff } from '../../db/schema'
import { seed } from '../../db/seed'

const MAYSA = '+99365102030' // owner of Glow Studio
const MARAL = '+99361440819' // specialist: nails
const AYNA = '+99365312210' // specialist: hair
const W = '/v1/w/glow-studio'
const DAY = '2026-10-22' // a Thursday

describe('one booking by its code, its note and its complaint’s author', () => {
  let db: Db
  let t: ReturnType<typeof testApp>
  let manicure: string
  let maralId: string
  let maysaId: string
  beforeAll(async () => {
    ;({ db } = await testDatabase())
    await seed(db, { demo: true, now: DEMO_NOW })
    const [glow] = await db.select().from(businesses).where(eq(businesses.slug, 'glow-studio'))
    manicure = (await db.select().from(services).where(eq(services.businessId, glow!.id))).find((s) => s.name.en === 'Manicure')!.id
    const person = async (name: string) =>
      (
        await db
          .select()
          .from(staff)
          .where(and(eq(staff.businessId, glow!.id), eq(staff.name, name)))
      )[0]!.id
    maralId = await person('Maral')
    maysaId = await person('Maýsa')
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
  /** A booking the team enters with Maral, its undo time over. */
  const book = async (maysa: ReturnType<typeof browser>, phone: string, date: string, start: number, note?: string) => {
    const made = await maysa.req(`${W}/bookings`, {
      body: { source: 'phone', phone, serviceIds: [manicure], staffId: maralId, date, start, notifyClient: false, note },
    })
    expect(made.status).toBe(201)
    t.clock.now += 15_000
    return made.json.code as string
  }
  const one = (b: ReturnType<typeof browser>, code: string) => b.req(`${W}/bookings/${code}?lang=en`)
  const note = (b: ReturnType<typeof browser>, code: string, text: string | null) =>
    b.req(`${W}/bookings/${code}/note`, { method: 'PUT', body: { note: text } })

  it('by its code: the calendar’s block on its own, whatever its status; a specialist sees only their own', async () => {
    const maysa = await as(MAYSA)
    const code = await book(maysa, '+99365801001', DAY, 600, 'Prefers the window seat')
    const got = await one(maysa, code)
    expect(got.status).toBe(200)
    expect(got.json).toMatchObject({
      code,
      type: 'appointment',
      date: DAY,
      start: 600,
      end: 660,
      status: 'confirmed',
      source: 'phone',
      client: { phone: '+99365801001' },
      items: [expect.objectContaining({ service: 'Manicure', staffId: maralId, bufferAfter: expect.any(Number) })],
      internalStatusId: null,
      internalNote: 'Prefers the window seat',
      complaint: null,
      move: null,
    })
    // the same block as the day view's
    const day = (await maysa.req(`${W}/calendar?date=${DAY}&lang=en`)).json.bookings as { code: string }[]
    expect(day.find((b) => b.code === code)).toEqual(got.json)
    // a cancelled one still answers, as the list's drawer opens it
    expect((await maysa.req(`${W}/bookings/${code}/cancel`, { body: { reason: 'staff_away' } })).status).toBe(204)
    expect((await one(maysa, code)).json).toMatchObject({ status: 'cancelled', cancelledBy: 'business' })
    // Maral's own, not Aýna's
    expect((await one(await as(MARAL), code)).status).toBe(200)
    expect((await one(await as(AYNA), code)).status).toBe(404)
    expect((await one(maysa, 'YR-99530302')).status).toBe(404)
    expect((await one(maysa, 'export')).status).toBe(400)
    expect((await browser(t.app).req(`${W}/bookings/${code}`)).status).toBe(401)
  })

  it('the note: written whole by whoever sees the booking, cleared with null, the team hears it, the client never', async () => {
    const maysa = await as(MAYSA)
    const client = await as('+99365801002', 'Jeren')
    const code = await book(maysa, '+99365801002', DAY, 720)
    const cursor = (await maysa.req('/v1/events?after=0')).json.cursor as string
    expect((await note(maysa, code, '  Allergic to acetone  ')).status).toBe(204)
    expect((await one(maysa, code)).json.internalNote).toBe('Allergic to acetone')
    // the team's screens refresh; the client's don't hear it (the booking's own creation event may settle after the
    // cursor was taken when other test files hold older transactions open, so the note's event is picked, not counted)
    const updated = (items: { type: string; bookingCode: string | null }[]) =>
      items.some((e) => e.type === 'booking.updated' && e.bookingCode === code)
    expect((await eventsAfter(maysa, cursor, updated)).json.items).toContainEqual(
      expect.objectContaining({ type: 'booking.updated', bookingCode: code }),
    )
    expect(JSON.stringify((await client.req(`/v1/me/bookings/${code}`)).json)).not.toMatch(/acetone/)
    // Maral writes on her own booking; Aýna can't find it
    const maral = await as(MARAL)
    expect((await note(maral, code, 'Bring the red polish')).status).toBe(204)
    expect((await one(maral, code)).json.internalNote).toBe('Bring the red polish')
    expect((await note(await as(AYNA), code, 'x')).status).toBe(404)
    // cleared with null or an empty text; too long is refused
    expect((await note(maysa, code, null)).status).toBe(204)
    expect((await one(maysa, code)).json.internalNote).toBeNull()
    expect((await note(maysa, code, 'Back again')).status).toBe(204)
    // the same text again writes nothing (the drawer autosaves on every pause)
    const [before] = await db.select({ updatedAt: bookings.updatedAt }).from(bookings).where(eq(bookings.code, code))
    t.clock.now += 1_000
    expect((await note(maysa, code, 'Back again')).status).toBe(204)
    const [after] = await db.select({ updatedAt: bookings.updatedAt }).from(bookings).where(eq(bookings.code, code))
    expect(after!.updatedAt).toEqual(before!.updatedAt)
    expect((await note(maysa, code, '   ')).status).toBe(204)
    expect((await one(maysa, code)).json.internalNote).toBeNull()
    expect((await note(maysa, code, 'x'.repeat(TEAM_NOTE_MAX + 1))).status).toBe(400)
    expect((await note(maysa, 'YR-99530302', 'x')).status).toBe(404)
  })

  it('a move request’s own code takes no note: 404, as the calendar never opens it; the original still does', async () => {
    const maysa = await as(MAYSA)
    const client = await as('+99365801003', 'Mover')
    const free = (await client.req(`/v1/businesses/glow-studio/availability?services=${manicure}&staff=${maralId}&date=${DAY}`)).json
      .slots as { start: number }[]
    const sent = (
      await client.req('/v1/bookings', {
        body: { type: 'appointment', business: 'glow-studio', serviceIds: [manicure], staffId: maralId, date: DAY, start: free[0]!.start },
      })
    ).json.code as string
    expect((await maysa.req(`${W}/requests/${sent}/confirm`, { body: {} })).status).toBe(204)
    expect((await client.req(`/v1/me/bookings/${sent}/reschedule`, { body: { date: DAY, start: free.at(-1)!.start } })).status).toBe(200)
    const [original] = await db.select().from(bookings).where(eq(bookings.code, sent))
    const [move] = await db.select().from(bookings).where(eq(bookings.rescheduleOf, original!.id))
    expect(move).toBeDefined()
    expect((await one(maysa, move!.code)).status).toBe(404)
    expect((await note(maysa, move!.code, 'Lost note')).status).toBe(404)
    expect((await note(maysa, sent, 'Kept note')).status).toBe(204)
    expect((await one(maysa, sent)).json).toMatchObject({ internalNote: 'Kept note', move: { date: DAY } })
  })

  it('a complaint says who filed it, by id and name, on the block and the client card alike', async () => {
    const maysa = await as(MAYSA)
    const code = await book(maysa, '+99365801003', DAY, 840)
    t.clock.now = epochOf(DAY, 850)
    expect((await maysa.req(`${W}/bookings/${code}/complaint`, { body: { type: 'late' } })).status).toBe(204)
    const by = { staffId: maysaId, name: 'Maýsa' }
    const got = (await one(maysa, code)).json
    expect(got.complaint).toEqual({ type: 'late', text: null, by, at: t.clock.now })
    const day = (await maysa.req(`${W}/calendar?date=${DAY}`)).json.bookings as { code: string; complaint: unknown }[]
    expect(day.find((b) => b.code === code)!.complaint).toEqual(got.complaint)
    const card = (await maysa.req(`${W}/clients/${got.client.id}?lang=en`)).json
    expect(card.reports).toEqual([{ code, date: DAY, type: 'late', text: null, by, at: t.clock.now }])
    // a specialist's own is hers by id
    const maral = await as(MARAL)
    expect((await maral.req(`${W}/bookings/${code}/complaint`, { method: 'DELETE' })).status).toBe(403)
    expect((await maysa.req(`${W}/bookings/${code}/complaint`, { method: 'DELETE' })).status).toBe(204)
    expect((await maral.req(`${W}/bookings/${code}/complaint`, { body: { type: 'rude', text: 'Shouted' } })).status).toBe(204)
    expect((await one(maysa, code)).json.complaint).toMatchObject({ type: 'rude', by: { staffId: maralId, name: 'Maral' } })
    expect((await maral.req(`${W}/bookings/${code}/complaint`, { method: 'DELETE' })).status).toBe(204)
  })
})
