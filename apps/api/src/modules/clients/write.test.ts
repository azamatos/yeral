/** Keeping clients (book B-33–B-36): add, edit and switches, notes, delete; who may do which. */
import { addDays, today } from '@yeral/domain/time'
import { and, eq } from 'drizzle-orm'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { DEMO_NOW, testApp } from '../../../test/app'
import { browser } from '../../../test/client'
import { testDatabase } from '../../../test/db'
import type { Db } from '../../db/client'
import { bookingItems, bookings, businesses, clientNotes, clients, rateLimits, services, staff, users } from '../../db/schema'
import { seed } from '../../db/seed'

const MAYSA = '+99365102030' // owner of Glow Studio
const SELBI = '+99365884102' // administrator
const MARAL = '+99361440819' // specialist: nails
const W = '/v1/w/glow-studio'
const TODAY = today(DEMO_NOW)

describe('keeping clients (book B-33–B-36)', () => {
  let db: Db
  let t: ReturnType<typeof testApp>
  let glowId: string
  let manicure: string
  let maralId: string
  let seq = 0

  /** A booking the team made for the client with Maral, on a late hour nobody else books. */
  async function booking(clientId: string, date: string, status: 'completed' | 'confirmed' | 'pending' | 'cancelled') {
    const code = `YR-78${String(++seq).padStart(4, '0')}`
    const [row] = await db
      .insert(bookings)
      .values({
        code,
        businessId: glowId,
        type: 'appointment',
        clientId,
        clientName: 'Old name',
        clientPhone: '+99365910000',
        date,
        start: 1380 - seq * 30,
        end: 1410 - seq * 30,
        status,
        source: 'phone',
        priceType: 'fixed',
        priceAmount: 100,
        holdUntil: status === 'pending' ? new Date(DEMO_NOW + 3_600_000) : null,
      })
      .returning()
    await db.insert(bookingItems).values({
      bookingId: row!.id,
      serviceId: manicure,
      serviceName: { en: 'Manicure' },
      staffId: maralId,
      date,
      start: 1380 - seq * 30,
      end: 1410 - seq * 30,
      priceType: 'fixed',
      priceAmount: 100,
    })
    return row!
  }

  beforeAll(async () => {
    ;({ db } = await testDatabase())
    await seed(db, { demo: true, now: DEMO_NOW })
    const [glow] = await db.select().from(businesses).where(eq(businesses.slug, 'glow-studio'))
    glowId = glow!.id
    manicure = (await db.select().from(services).where(eq(services.businessId, glowId))).find((s) => s.name.en === 'Manicure')!.id
    maralId = (
      await db
        .select()
        .from(staff)
        .where(and(eq(staff.businessId, glowId), eq(staff.name, 'Maral')))
    )[0]!.id
  })
  beforeEach(async () => {
    await db.delete(rateLimits)
    t = testApp(db)
  })
  const as = async (phone: string) => {
    const b = browser(t.app)
    await b.login(phone)
    return b
  }
  const card = async (b: ReturnType<typeof browser>, id: string) => (await b.req(`${W}/clients/${id}?lang=en`)).json

  it('adding by the number: one client per number, the first note, only the owner and administrators', async () => {
    const selbi = await as(SELBI)
    const body = {
      phone: '+993 65 91 00 01',
      name: 'Aýgözel',
      birthday: '1995-04-02',
      source: 'instagram',
      tags: ['VIP', 'vip', 'Child'],
      note: 'Evenings only',
    }
    const added = await selbi.req(`${W}/clients`, { body })
    expect(added.status).toBe(201)
    expect(await card(selbi, added.json.id)).toMatchObject({
      name: 'Aýgözel',
      phone: '+99365910001',
      birthday: '1995-04-02',
      source: 'instagram',
      tags: ['VIP', 'Child'],
      segments: [],
      notes: [{ text: 'Evenings only', alert: false, by: 'Selbi' }],
    })
    const again = await selbi.req(`${W}/clients`, { body: { phone: '+99365910001' } })
    expect(again.status).toBe(409)
    expect(again.json.error).toMatchObject({ code: 'client_exists', details: { id: added.json.id, name: 'Aýgözel' } })
    // only the number is needed
    expect((await selbi.req(`${W}/clients`, { body: { phone: '+99365910002' } })).status).toBe(201)
    const ahead = await selbi.req(`${W}/clients`, { body: { phone: '+99365910009', birthday: addDays(TODAY, 1) } })
    expect(ahead.json.error.details.issues).toEqual([{ path: ['birthday'], code: 'in_future' }])
    expect((await (await as(MARAL)).req(`${W}/clients`, { body: { phone: '+99365910008' } })).status).toBe(403)
  })

  it('the edit: a new name and number go on the bookings ahead made without an account; an account’s number is locked', async () => {
    const maysa = await as(MAYSA)
    const id = (await maysa.req(`${W}/clients`, { body: { phone: '+99365910010', name: 'Before' } })).json.id as string
    const past = await booking(id, addDays(TODAY, -3), 'completed')
    const ahead = await booking(id, addDays(TODAY, 3), 'confirmed')
    expect((await maysa.req(`${W}/clients/${id}`, { method: 'PATCH', body: { name: 'After', phone: '+99365910011' } })).status).toBe(204)
    const rows = await db.select().from(bookings).where(eq(bookings.clientId, id))
    expect(rows.find((r) => r.id === ahead.id)).toMatchObject({ clientName: 'After', clientPhone: '+99365910011' })
    expect(rows.find((r) => r.id === past.id)).toMatchObject({ clientName: 'Old name', clientPhone: '+99365910000' })
    // another client's number
    const taken = await maysa.req(`${W}/clients/${id}`, { method: 'PATCH', body: { phone: '+99365910001' } })
    expect(taken.json.error.code).toBe('client_exists')
    // the switches
    await maysa.req(`${W}/clients/${id}`, { method: 'PATCH', body: { phoneOnly: true, noReminders: true, tags: ['VIP'] } })
    expect(await card(maysa, id)).toMatchObject({
      tags: ['VIP'],
      settings: { phoneOnly: true, phoneOnlyByCount: false, noReminders: true },
    })
    await maysa.req(`${W}/clients/${id}`, { method: 'PATCH', body: { phoneOnly: false, birthday: null, name: null } })
    expect(await card(maysa, id)).toMatchObject({ name: null, settings: { phoneOnly: false } })
    // the number follows a Ýeral account
    const [account] = await db.insert(users).values({ phone: '+99365910011', name: 'Ogul', lang: 'en' }).returning()
    await db.update(clients).set({ userId: account!.id }).where(eq(clients.id, id))
    const locked = await maysa.req(`${W}/clients/${id}`, { method: 'PATCH', body: { phone: '+99365910012' } })
    expect(locked.json.error.code).toBe('client_phone_locked')
    expect((await maysa.req(`${W}/clients/${id}`, { method: 'PATCH', body: { name: 'Ogul A.' } })).status).toBe(204)
    expect((await (await as(MARAL)).req(`${W}/clients/${id}`, { method: 'PATCH', body: { name: 'X' } })).status).toBe(403)
  })

  it('notes: anyone who sees the client, a specialist on her own; an alert note reaches the lookup', async () => {
    const maysa = await as(MAYSA)
    const maral = await as(MARAL)
    const mine = (await maysa.req(`${W}/clients`, { body: { phone: '+99365910020', name: 'Hers' } })).json.id as string
    const other = (await maysa.req(`${W}/clients`, { body: { phone: '+99365910021', name: 'Not hers' } })).json.id as string
    await booking(mine, addDays(TODAY, -2), 'completed')
    expect((await maral.req(`${W}/clients/${mine}/notes`, { body: { text: 'Likes pastel colours' } })).status).toBe(201)
    expect((await maral.req(`${W}/clients/${other}/notes`, { body: { text: 'x' } })).status).toBe(404)
    await maysa.req(`${W}/clients/${mine}/notes`, { body: { text: 'Allergic to latex', alert: true } })
    expect((await card(maysa, mine)).notes).toMatchObject([
      { text: 'Allergic to latex', alert: true, by: 'Maýsa' },
      { text: 'Likes pastel colours', alert: false, by: 'Maral' },
    ])
    const found = (await maysa.req(`${W}/clients/lookup?phone=65910020`)).json.items
    expect(found).toMatchObject([{ id: mine, alerts: ['Allergic to latex'] }])
  })

  it('deleting: not with bookings ahead or a waiting request; past bookings stay without the name or the number', async () => {
    const maysa = await as(MAYSA)
    const id = (await maysa.req(`${W}/clients`, { body: { phone: '+99365910030', name: 'Leaving', note: 'n' } })).json.id as string
    const past = await booking(id, addDays(TODAY, -5), 'completed')
    const ahead = await booking(id, addDays(TODAY, 2), 'confirmed')
    const request = await booking(id, addDays(TODAY, 4), 'pending')
    expect((await (await as(MARAL)).req(`${W}/clients/${id}`, { method: 'DELETE' })).status).toBe(403)
    const blocked = await maysa.req(`${W}/clients/${id}`, { method: 'DELETE' })
    expect(blocked.status).toBe(409)
    expect(blocked.json.error).toMatchObject({
      code: 'client_has_bookings',
      details: {
        bookings: [
          { code: ahead.code, status: 'confirmed' },
          { code: request.code, status: 'pending' },
        ],
      },
    })
    await db.update(bookings).set({ status: 'cancelled', cancelledBy: 'business' }).where(eq(bookings.clientId, id))
    await db.update(bookings).set({ status: 'completed' }).where(eq(bookings.id, past.id))
    expect((await maysa.req(`${W}/clients/${id}`, { method: 'DELETE' })).status).toBe(204)
    const [kept] = await db.select().from(bookings).where(eq(bookings.id, past.id))
    expect(kept).toMatchObject({ clientId: null, clientName: null, clientPhone: null, priceAmount: 100 })
    expect(await db.select().from(clientNotes).where(eq(clientNotes.clientId, id))).toEqual([])
    expect((await maysa.req(`${W}/clients/${id}?lang=en`)).status).toBe(404)
  })
})
