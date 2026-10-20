/** "Ýazylyşlar" (book B-30, B-31): the tabs, search and filters, a specialist's own rows, and the CSV export. */
import { addDays, today } from '@yeral/domain/time'
import { and, eq } from 'drizzle-orm'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { DEMO_NOW, testApp } from '../../../test/app'
import { browser } from '../../../test/client'
import { testDatabase } from '../../../test/db'
import type { Db } from '../../db/client'
import { bookingItems, bookings, businesses, clients, rateLimits, services, staff } from '../../db/schema'
import { seed } from '../../db/seed'

const MAYSA = '+99365102030' // owner of Glow Studio
const SELBI = '+99365884102' // administrator
const MARAL = '+99361440819' // specialist: nails
const W = '/v1/w/glow-studio'
const TODAY = today(DEMO_NOW)

interface Row {
  code: string
  date: string
  status: string
  cancelledBy: string | null
  client: { id: string | null; name: string | null; isNew: boolean }
  items: { staffId: string }[]
}

describe('the bookings list (book B-30, B-31)', () => {
  let db: Db
  let t: ReturnType<typeof testApp>
  let glowId: string
  let manicure: string
  let haircut: string
  let maralId: string
  let aynaId: string
  let seq = 0

  /** One of "Zz List" clients' bookings, on a late hour nobody else books. */
  async function booking(x: {
    name: string
    date: string
    status: 'pending' | 'confirmed' | 'completed' | 'cancelled'
    staffId: string
    serviceId: string
    /** null: a request with no answer time (it runs out at its start). */
    holdUntil?: number | null
    clientId?: string
    start?: number
  }) {
    const code = `YR-79${String(++seq).padStart(4, '0')}`
    const start = x.start ?? 1380 - seq * 15
    const [row] = await db
      .insert(bookings)
      .values({
        code,
        businessId: glowId,
        type: 'appointment',
        clientId: x.clientId ?? null,
        clientName: x.name,
        clientPhone: `+9936591${String(seq).padStart(4, '0')}`,
        date: x.date,
        start,
        end: start + 15,
        status: x.status,
        cancelledBy: x.status === 'cancelled' ? 'client' : null,
        source: 'phone',
        priceType: 'fixed',
        priceAmount: 100,
        holdUntil: x.status === 'pending' && x.holdUntil !== null ? new Date(x.holdUntil ?? DEMO_NOW + 3_600_000) : null,
      })
      .returning()
    await db.insert(bookingItems).values({
      bookingId: row!.id,
      serviceId: x.serviceId,
      serviceName: { en: x.serviceId === manicure ? 'Manicure' : "Women's haircut" },
      staffId: x.staffId,
      staffName: x.staffId === maralId ? 'Maral' : 'Aýna',
      date: x.date,
      start,
      end: start + 15,
      priceType: 'fixed',
      priceAmount: 100,
    })
    return code
  }

  const codes: Record<string, string> = {}
  beforeAll(async () => {
    ;({ db } = await testDatabase())
    await seed(db, { demo: true, now: DEMO_NOW })
    const [glow] = await db.select().from(businesses).where(eq(businesses.slug, 'glow-studio'))
    glowId = glow!.id
    const menu = await db.select().from(services).where(eq(services.businessId, glowId))
    manicure = menu.find((s) => s.name.en === 'Manicure')!.id
    haircut = menu.find((s) => s.name.en === "Women's haircut")!.id
    const person = async (name: string) =>
      (
        await db
          .select()
          .from(staff)
          .where(and(eq(staff.businessId, glowId), eq(staff.name, name)))
      )[0]!.id
    ;[maralId, aynaId] = [await person('Maral'), await person('Aýna')]
    const [fresh] = await db.insert(clients).values({ businessId: glowId, phone: '+99365919999', name: 'Zz List New' }).returning()
    codes.firstVisit = await booking({
      name: 'Zz List New',
      date: addDays(TODAY, -5),
      status: 'completed',
      staffId: aynaId,
      serviceId: haircut,
      clientId: fresh!.id,
    })
    codes.today = await booking({
      name: 'Zz List New',
      date: TODAY,
      status: 'confirmed',
      staffId: maralId,
      serviceId: manicure,
      clientId: fresh!.id,
    })
    codes.ahead1 = await booking({
      name: 'Zz List Ahead',
      date: addDays(TODAY, 3),
      status: 'confirmed',
      staffId: aynaId,
      serviceId: haircut,
    })
    codes.ahead2 = await booking({
      name: 'Zz List Ahead',
      date: addDays(TODAY, 1),
      status: 'pending',
      staffId: maralId,
      serviceId: manicure,
    })
    codes.past = await booking({
      name: 'Zz List Before',
      date: addDays(TODAY, -2),
      status: 'completed',
      staffId: maralId,
      serviceId: manicure,
    })
    codes.cancelled = await booking({
      name: 'Zz List Gone',
      date: addDays(TODAY, 2),
      status: 'cancelled',
      staffId: aynaId,
      serviceId: haircut,
    })
    codes.ranOut = await booking({
      name: '=Zz List("x")',
      date: addDays(TODAY, 4),
      status: 'pending',
      staffId: maralId,
      serviceId: manicure,
      holdUntil: DEMO_NOW - 60_000,
    })
    // a request with no answer time, still ahead: waiting, so on the upcoming tab
    codes.noHold = await booking({
      name: 'Zz List NoHold',
      date: addDays(TODAY, 6),
      status: 'pending',
      staffId: aynaId,
      serviceId: haircut,
      holdUntil: null,
    })
    // late at night: a visit that starts after midnight on the business day (book Q-105)
    codes.late = await booking({
      name: 'Zz List Late',
      date: addDays(TODAY, 7),
      status: 'confirmed',
      staffId: maralId,
      serviceId: manicure,
      start: 1450,
    })
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
  const list = async (b: ReturnType<typeof browser>, query: string) =>
    (await b.req(`${W}/bookings?lang=en&${query}`)).json as { items: Row[]; total: number; cursor: string | null }

  it('the tabs: today, ahead the soonest first, before the newest first, cancelled with who, a request run out', async () => {
    const maysa = await as(MAYSA)
    const codesOf = async (tab: string) => (await list(maysa, `tab=${tab}&q=Zz%20List`)).items.map((r) => r.code)
    expect(await codesOf('today')).toEqual([codes.today])
    expect(await codesOf('upcoming')).toEqual([codes.ahead2, codes.ahead1, codes.noHold, codes.late])
    expect(await codesOf('past')).toEqual([codes.past, codes.firstVisit])
    const gone = (await list(maysa, 'tab=cancelled&q=Zz%20List')).items
    expect(gone.map((r) => [r.code, r.status, r.cancelledBy])).toEqual([
      [codes.ranOut, 'cancelled', 'system'],
      [codes.cancelled, 'cancelled', 'client'],
    ])
    // a first visit in the last 30 days
    const [row] = (await list(maysa, 'tab=today&q=Zz%20List')).items
    expect(row!.client).toMatchObject({ name: 'Zz List New', isNew: true })
  })

  it('search by code, name or number; filters by specialist, service and dates; pages', async () => {
    const maysa = await as(MAYSA)
    const found = async (query: string) => (await list(maysa, query)).items.map((r) => r.code)
    expect(await found(`tab=upcoming&q=${codes.ahead1!.slice(3)}`)).toEqual([codes.ahead1])
    expect(await found('tab=upcoming&q=zz%20list%20ahead')).toEqual([codes.ahead2, codes.ahead1])
    // past the end: no rows, the count still right
    expect((await list(maysa, 'tab=upcoming&q=zz%20list%20ahead&cursor=40')).total).toBe(2)
    expect((await maysa.req(`${W}/bookings?lang=en&tab=today&cursor=-1`)).status).toBe(400)
    expect(await found(`tab=past&q=91${codes.past!.slice(-4)}`)).toEqual([codes.past])
    expect(await found(`tab=upcoming&q=Zz%20List&staff=${aynaId}`)).toEqual([codes.ahead1, codes.noHold])
    expect(await found(`tab=upcoming&q=Zz%20List&service=${manicure}`)).toEqual([codes.ahead2, codes.late])
    expect(await found(`tab=upcoming&q=Zz%20List&from=${addDays(TODAY, 2)}&to=${addDays(TODAY, 3)}`)).toEqual([codes.ahead1])
    const first = await list(maysa, 'tab=upcoming&q=Zz%20List&limit=1')
    expect([first.items.length, first.total]).toEqual([1, 4])
    expect((await list(maysa, `tab=upcoming&q=Zz%20List&limit=1&cursor=${first.cursor}`)).items.map((r) => r.code)).toEqual([codes.ahead1])
  })

  it('a specialist sees her own rows; another’s column is refused; no export for her', async () => {
    const maral = await as(MARAL)
    expect((await list(maral, 'tab=upcoming&q=Zz%20List')).items.map((r) => r.code)).toEqual([codes.ahead2, codes.late])
    expect((await maral.req(`${W}/bookings?lang=en&tab=upcoming&staff=${aynaId}`)).status).toBe(403)
    expect((await maral.req(`${W}/bookings/export?lang=en&tab=upcoming`)).status).toBe(403)
  })

  it('the export: the same rows as a CSV in the reader’s language, a formula typed as a name kept as text', async () => {
    const selbi = await as(SELBI)
    const res = await t.app.request(`${W}/bookings/export?lang=en&tab=cancelled&q=Zz%20List`, { headers: { cookie: selbi.cookie } })
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('text/csv')
    expect(res.headers.get('content-disposition')).toMatch(/attachment; filename="bookings-glow-studio-cancelled-\d{4}-\d{2}-\d{2}\.csv"/)
    const bytes = new Uint8Array(await res.arrayBuffer())
    // a byte-order mark first, so spreadsheets read the letters right
    expect([...bytes.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf])
    const lines = new TextDecoder().decode(bytes).trim().split('\r\n')
    expect(lines[0]).toBe('Code,Date,Time,Client,Phone,Services,Specialists,Source,Status,Cancelled by,Price,Amount')
    expect(lines).toHaveLength(3)
    expect(lines[1]).toContain(`${codes.ranOut},${addDays(TODAY, 4)},`)
    expect(lines[1]).toContain(`"'=Zz List(""x"")",993 65 91 `)
    expect(lines[1]).toContain(',Manicure,Maral,Phone,Cancelled,No answer in time,100 TMT,100')
    expect(res.headers.get('x-total-count')).toBe('2')
    // Turkmen and Russian spreadsheets split on semicolons
    const tk = await t.app.request(`${W}/bookings/export?lang=tk&tab=cancelled&q=Zz%20List`, { headers: { cookie: selbi.cookie } })
    expect((await tk.text()).split('\r\n')[0]).toContain('Kod;Sene;Wagt;Müşderi')
    // the rows ticked, a time past midnight as the clock reads it
    const ticked = await t.app.request(`${W}/bookings/export?lang=en&tab=upcoming&codes=${codes.late},${codes.ahead1}`, {
      headers: { cookie: selbi.cookie },
    })
    const rows = (await ticked.text()).trim().split('\r\n').slice(1)
    expect(rows.map((r) => r.split(',')[0])).toEqual([codes.ahead1, codes.late])
    expect(rows[1]).toContain(',00:10–00:25,')
  })
})
