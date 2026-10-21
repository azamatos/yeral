/**
 * `seed(db, { demo, now })`: the market's cities and the category catalogue always; with `demo`, the whole design demo (wipes the database
 * first — the CLI allows that only on local and docker databases). One transaction: a seed that fails leaves the
 * database as it was. Demo dates move with "today"; weekly data (opening hours, shifts, breaks, the yoga week) turns with
 * them, so the demo day keeps the design's Wednesday whatever weekday it lands on.
 */
import { MARKET } from '@yeral/domain/market'
import { localized, type BookingStatus } from '@yeral/domain/model'
import { splitName } from '@yeral/domain/names'
import { DEFAULT_RULES } from '@yeral/domain/rules'
import { DEMO_SLUG } from '@yeral/domain/setup'
import { inviteExpiresAt } from '@yeral/domain/team'
import { addDays, diffDays, dow, epochOf, today } from '@yeral/domain/time'
import { and, eq, getTableName, inArray, is, ne, sql } from 'drizzle-orm'
import { PgTable } from 'drizzle-orm/pg-core'
import { randomToken, sha256Hex } from '../../lib/crypto'
import type { Db, Queryable } from '../client'
import * as t from '../schema'
import { CATEGORIES } from './categories'
import { CITIES } from './cities'
import { codeMaker, DEMO_CODES, seededCodes } from './codes'
import {
  AYJEMAL_BOOKINGS,
  BUSINESSES,
  DEMO_CENTER,
  DEMO_DAY,
  DEMO_USER,
  GLOW_BOOKINGS,
  GLOW_CLIENTS,
  GLOW_REVIEWS,
  m,
  PHOTOS,
  PLACES,
  YOGA_TAKEN,
  YOGA_WEEK,
  type DemoBusiness,
  type DemoService,
} from './demo-data'

/** A point `km` away from `from` in direction `bearing` (degrees from north). */
export function offset(from: { lat: number; lng: number }, km: number, bearing: number) {
  const rad = (bearing * Math.PI) / 180
  const dLat = (km / 111.32) * Math.cos(rad)
  const dLng = (km / (111.32 * Math.cos((from.lat * Math.PI) / 180))) * Math.sin(rad)
  return { lat: Number((from.lat + dLat).toFixed(6)), lng: Number((from.lng + dLng).toFixed(6)) }
}

/** Every table of the schema, so a new one can't be missed by `wipe()`. */
export const TABLES: readonly string[] = Object.values(t).flatMap((x) => (is(x, PgTable) ? [getTableName(x)] : []))

export async function wipe(db: Queryable): Promise<void> {
  await db.execute(sql.raw(`truncate table ${TABLES.map((x) => `"${x}"`).join(', ')} restart identity cascade`))
}

/** The market's cities; the demo's businesses and places are in its main city. */
export async function seedCities(db: Queryable): Promise<number> {
  const list = CITIES[MARKET.code] ?? []
  for (const [i, c] of list.entries()) {
    const row = { ...c, sort: i }
    await db.insert(t.cities).values(row).onConflictDoUpdate({ target: t.cities.id, set: row })
  }
  return list.length
}

export async function seedCategories(db: Queryable): Promise<number> {
  for (const [i, c] of CATEGORIES.entries()) {
    const row = { ...c, intro: { tk: '', ru: '', en: '' }, sort: i }
    await db.insert(t.categories).values(row).onConflictDoUpdate({ target: t.categories.id, set: row })
  }
  return CATEGORIES.length
}

interface Ctx {
  db: Queryable
  now: number
  /** Demo day → today. */
  day: (date: string) => string
  /** A design week (0 = Monday) turned with the dates, so a demo date's weekday data lands on the date it moves to. */
  week: <T>(days: readonly T[]) => T[]
  /** The seed's booking codes (`codeMaker`): a demo booking's own, else the next generated one. */
  code: (fixed?: string) => string
  users: Map<string, string>
  clients: Map<string, string>
  /**
   * The first launch's examples (book Q-004): confirming at once, with no team anyone signs in to (so nobody sees a
   * visitor's booking), no invites, no reviews of their own, and only the design's yearly days off.
   */
  example?: boolean
  /** The phone an example shows: the market's support line, or `EXAMPLE_PHONE`. */
  examplePhone?: string
  /** A design number as it's stored: as it is, or in the demo workspace the market's unused range's (`demoPhones`). */
  phone: (designPhone: string) => string
  /** The business app's demo workspace (book F-242): its accounts are demo accounts and its numbers nobody's. */
  sandbox?: boolean
}

/** The demo workspace's page address (book F-242), which no business gets; it's nobody's page: it's never public. */
export const SANDBOX_SLUG = DEMO_SLUG

/**
 * The design's numbers moved to the market's unused range (`MARKET.phone.unusedPrefix`): the design's may be real
 * people's (book F-242). Each keeps its last digits; two that would meet are a mistake in the data.
 */
export function demoPhones(): (designPhone: string) => string {
  const { countryCode, unusedPrefix } = MARKET.phone
  const from = new Map<string, string>()
  return (designPhone) => {
    const national = designPhone.slice(countryCode.length + 1)
    const phone = `+${countryCode}${unusedPrefix}${national.slice(unusedPrefix.length)}`
    const before = from.get(phone)
    if (before && before !== designPhone) throw new Error(`${before} and ${designPhone} both become ${phone} in the demo workspace`)
    from.set(phone, designPhone)
    return phone
  }
}

async function user(ctx: Ctx, designPhone: string, name: string | null): Promise<string> {
  const phone = ctx.phone(designPhone)
  const known = ctx.users.get(phone)
  if (known) return known
  // the demo's one-field names, in the account's two (book Q-156)
  const { first, surname } = splitName(name)
  let id: string | undefined
  if (ctx.sandbox) {
    // the demo workspace's accounts outlive its nightly remake, so the visitors' sessions in them go on
    const [held] = await ctx.db.select({ id: t.users.id, demo: t.users.demo }).from(t.users).where(eq(t.users.phone, phone))
    if (held && !held.demo) throw new Error(`the demo workspace's number ${phone} is a real account's`)
    // whatever a visitor changed in it goes back: the name, the photo, the language, the SMS switches
    if (held)
      await ctx.db
        .update(t.users)
        .set({
          name: first,
          surname,
          photo: null,
          lang: MARKET.defaultLanguage,
          notifyConfirmation: true,
          notifyReminderDay: true,
          notifyReminder2h: true,
        })
        .where(eq(t.users.id, held.id))
    id = held?.id
  }
  if (!id) {
    const [row] = await ctx.db
      .insert(t.users)
      .values({ phone, name: first, surname, lang: MARKET.defaultLanguage, demo: !!ctx.sandbox })
      .returning({ id: t.users.id })
    if (!row) throw new Error('user insert failed')
    id = row.id
  }
  ctx.users.set(phone, id)
  return id
}

interface SeededBusiness {
  id: string
  def: DemoBusiness
  services: Map<string, { id: string; def: DemoService }>
  staff: Map<string, { id: string; name: string }>
  areas: Map<string, { id: string; tables: { id: string; seats: number }[] }>
  buffer: number
  holdMinutes: number
  sittingMinutes: number
}

async function seedBusiness(ctx: Ctx, def: DemoBusiness): Promise<SeededBusiness> {
  const { db } = ctx
  const geo = offset(DEMO_CENTER, def.distanceKm, def.bearing)
  const [biz] = await db
    .insert(t.businesses)
    .values({
      slug: ctx.sandbox ? SANDBOX_SLUG : def.slug,
      name: def.name,
      categoryId: def.category,
      kind: def.kind,
      bookingTypes: [def.type],
      about: def.about,
      address: def.address,
      cityId: MARKET.mainCity,
      street: def.street,
      entranceNote: def.entranceNote ?? null,
      lat: geo.lat,
      lng: geo.lng,
      // an example shows Ýeral's own line: the design's numbers may be real people's
      phone: ctx.example ? ctx.examplePhone! : ctx.phone(def.phone),
      photos: def.photos.map((name) => {
        const photo = PHOTOS[name]
        if (!photo) throw new Error(`unknown photo ${name}`)
        return {
          key: `demo/${photo.file}`,
          alt: { tk: `${def.name}: ${photo.alt.tk}`, ru: `${def.name}: ${photo.alt.ru}`, en: `${def.name}: ${photo.alt.en}` },
        }
      }),
      amenities: def.amenities,
      hours: ctx.week(def.hours),
      exceptions: (def.exceptions ?? [])
        .filter((e) => e.yearly || !ctx.example)
        .map((e) => (e.yearly ? e : { ...e, from: ctx.day(e.from), to: ctx.day(e.to) })),
      // an example has no reviews of its own: its visitors' are the first
      rating: ctx.example ? null : def.rating,
      reviewsCount: ctx.example ? 0 : def.reviewsCount,
      ratingBreakdown: ctx.example
        ? { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
        : (def.ratingBreakdown ?? {
            5: Math.round(def.reviewsCount * 0.85),
            4: Math.round(def.reviewsCount * 0.12),
            3: 0,
            2: 0,
            1: 0,
          }),
      verification: 'verified',
      tableRequests: def.tableRequests ?? [],
      demo: true,
      sandbox: !!ctx.sandbox,
      // the demo workspace's last remake: the jobs make it again after the next 04:00
      ...(ctx.sandbox ? { createdAt: new Date(ctx.now) } : {}),
    })
    .returning({ id: t.businesses.id, sittingMinutes: t.businesses.tableSittingMinutes })
  if (!biz) throw new Error('business insert failed')

  const { note, ...ruleOverrides } = def.rules ?? {}
  const rules = { ...DEFAULT_RULES, ...ruleOverrides, ...(ctx.example ? { confirmMode: 'instant' as const } : {}) }
  await db.insert(t.bookingRules).values({ businessId: biz.id, ...rules, note: note ?? null })

  const staffIds = new Map<string, { id: string; name: string }>()
  for (const [i, s] of (def.staff ?? []).entries()) {
    // people with a level sign in with their phone: an account now, or an open invite while they're `invited` (ADR 0025)
    const invited = s.status === 'invited'
    const signInPhone = s.level && (s.hasApp ?? true) && !ctx.example ? s.phone : undefined
    const [row] = await db
      .insert(t.staff)
      .values({
        businessId: biz.id,
        userId: signInPhone && !invited ? await user(ctx, signInPhone, s.fullName ?? s.name) : null,
        level: s.level ?? 'specialist',
        name: s.name,
        fullName: s.fullName ?? null,
        specialization: s.specialization ?? null,
        phone: s.phone ? ctx.phone(s.phone) : null,
        gender: s.gender ?? null,
        bookable: s.bookable ?? true,
        // an example's owner keeps the app (a workspace always has one) but no account: nobody signs in to it
        hasApp: ctx.example ? s.level === 'owner' : (s.hasApp ?? true),
        status: ctx.example ? 'active' : (s.status ?? 'active'),
        sort: i,
        shift: s.shift ? ctx.week(s.shift) : null,
        breaks: ctx.week(s.breaks ?? [null, null, null, null, null, null, null]),
        daysOff: (s.daysOff ?? [])
          .filter((e) => e.yearly || !ctx.example)
          .map((e) => (e.yearly ? e : { ...e, from: ctx.day(e.from), to: ctx.day(e.to) })),
        // an example's specialists have no reviews of their own either
        rating: ctx.example ? null : (s.rating ?? null),
      })
      .returning({ id: t.staff.id })
    if (!row) throw new Error('staff insert failed')
    staffIds.set(s.key, { id: row.id, name: s.name })
    if (signInPhone && invited) {
      // in the demo workspace a demo account holds the invited number too, so nobody signs in to its invite (F-242)
      if (ctx.sandbox) await user(ctx, signInPhone, s.fullName ?? s.name)
      // sent two days before the demo day, so it shows as pending with five days left
      const sentAt = ctx.now - 2 * 86_400_000
      await db.insert(t.invites).values({
        businessId: biz.id,
        staffId: row.id,
        phone: ctx.phone(signInPhone),
        tokenHash: await sha256Hex(randomToken()),
        sentAt: new Date(sentAt),
        expiresAt: new Date(inviteExpiresAt(sentAt)),
      })
    }
  }

  const serviceIds = new Map<string, { id: string; def: DemoService }>()
  for (const [gi, g] of (def.groups ?? []).entries()) {
    const [group] = await db
      .insert(t.serviceGroups)
      .values({ businessId: biz.id, name: g.name, sort: gi })
      .returning({ id: t.serviceGroups.id })
    if (!group) throw new Error('group insert failed')
    for (const [si, svc] of g.services.entries()) {
      const [row] = await db
        .insert(t.services)
        .values({
          businessId: biz.id,
          groupId: group.id,
          name: svc.name,
          description: svc.description ?? null,
          durationMin: svc.durationMin,
          priceType: svc.price[0],
          priceAmount: svc.price[1],
          bufferMin: svc.bufferMin ?? null,
          sort: si,
        })
        .returning({ id: t.services.id })
      if (!row) throw new Error('service insert failed')
      serviceIds.set(svc.key, { id: row.id, def: svc })
      const links = svc.staff.map((k) => staffIds.get(k)?.id).filter((id): id is string => !!id)
      if (links.length) await db.insert(t.staffServices).values(links.map((staffId) => ({ staffId, serviceId: row.id })))
    }
  }

  const areas = new Map<string, { id: string; tables: { id: string; seats: number }[] }>()
  for (const [ai, a] of (def.areas ?? []).entries()) {
    const [area] = await db
      .insert(t.tableAreas)
      .values({ businessId: biz.id, name: a.name, note: a.note ?? null, minParty: a.minParty, maxParty: a.maxParty, sort: ai })
      .returning({ id: t.tableAreas.id })
    if (!area) throw new Error('area insert failed')
    const tables = await db
      .insert(t.diningTables)
      .values(a.tables.map((seats, i) => ({ areaId: area.id, seats, label: String(i + 1) })))
      .returning({ id: t.diningTables.id, seats: t.diningTables.seats })
    areas.set(a.key, { id: area.id, tables })
  }

  return {
    id: biz.id,
    def,
    services: serviceIds,
    staff: staffIds,
    areas,
    buffer: rules.bufferMinutes,
    holdMinutes: rules.holdMinutes,
    sittingMinutes: biz.sittingMinutes,
  }
}

/**
 * A seeded booking's lifecycle fields, as the api would have left them: a request holds its slot (`hold` minutes still
 * to go) and isn't confirmed; everything else was confirmed ten minutes after it was made.
 */
function lifecycle(
  ctx: Ctx,
  biz: SeededBusiness,
  b: { date: string; start: number; end: number; status: BookingStatus; hold?: number },
): Pick<typeof t.bookings.$inferInsert, 'holdUntil' | 'createdAt' | 'confirmedAt' | 'answeredAt' | 'cancelledAt' | 'completedAt'> {
  const startEpoch = epochOf(b.date, b.start)
  const createdAt =
    b.status === 'pending'
      ? ctx.now - (biz.holdMinutes - (b.hold ?? biz.holdMinutes)) * 60_000
      : Math.min(ctx.now, startEpoch) - 3 * 86_400_000
  return {
    // the demo shows `hold` minutes still to go, whenever it's seeded; in the demo workspace, made at 04:00, a request
    // waits until its visit, and one whose visit is already past for the hold time, so visitors can answer the
    // design's requests all day (book F-242)
    holdUntil:
      b.status === 'pending'
        ? new Date(
            ctx.sandbox
              ? Math.max(startEpoch, ctx.now + biz.holdMinutes * 60_000)
              : Math.min(ctx.now + (b.hold ?? biz.holdMinutes) * 60_000, startEpoch),
          )
        : null,
    createdAt: new Date(createdAt),
    confirmedAt: b.status === 'pending' ? null : new Date(createdAt + 10 * 60_000),
    // answered by the business ten minutes after it was sent (book Q-113)
    answeredAt: b.status === 'pending' ? null : new Date(createdAt + 10 * 60_000),
    cancelledAt: b.status === 'cancelled' ? new Date(Math.min(ctx.now, startEpoch) - 86_400_000) : null,
    completedAt: b.status === 'completed' || b.status === 'noshow' ? new Date(epochOf(b.date, b.end)) : null,
  }
}

interface AppointmentSeed {
  biz: SeededBusiness
  clientId: string | null
  userId: string | null
  clientName: string
  clientPhone: string
  serviceKey: string
  staffKey: string
  date: string
  start: number
  status: BookingStatus
  cancelledBy?: 'client' | 'business' | 'system'
  cancelReason?: string
  source: 'web' | 'app' | 'phone' | 'walkin'
  /** Minutes the request still holds its slot (pending). */
  hold?: number
  clientNote?: string
  code?: string
}

/** The design's business cancels give their reason in words: "Other reason" (B-27). */
const businessCancelOf = (by: string | undefined, reason: string | undefined) => (by === 'business' && reason ? ('other' as const) : null)

async function seedAppointment(ctx: Ctx, a: AppointmentSeed): Promise<string> {
  const svc = a.biz.services.get(a.serviceKey)
  const who = a.biz.staff.get(a.staffKey)
  if (!svc || !who) throw new Error(`unknown service ${a.serviceKey} or staff ${a.staffKey} in ${a.biz.def.slug}`)
  const end = a.start + svc.def.durationMin
  const times = lifecycle(ctx, a.biz, { date: a.date, start: a.start, end, status: a.status, hold: a.hold })
  const [row] = await ctx.db
    .insert(t.bookings)
    .values({
      code: ctx.code(a.code),
      businessId: a.biz.id,
      type: 'appointment',
      clientId: a.clientId,
      userId: a.userId,
      clientName: a.clientName,
      clientPhone: ctx.phone(a.clientPhone),
      date: a.date,
      start: a.start,
      end,
      status: a.status,
      cancelledBy: a.cancelledBy ?? null,
      cancelReason: a.cancelReason ?? null,
      businessCancelReason: businessCancelOf(a.cancelledBy, a.cancelReason),
      source: a.source,
      clientNote: a.clientNote ?? null,
      priceType: svc.def.price[0],
      priceAmount: svc.def.price[1],
      ...times,
    })
    .returning({ id: t.bookings.id })
  if (!row) throw new Error('booking insert failed')
  await ctx.db.insert(t.bookingItems).values({
    bookingId: row.id,
    serviceId: svc.id,
    staffId: who.id,
    serviceName: svc.def.name,
    staffName: who.name,
    date: a.date,
    start: a.start,
    end,
    bufferAfter: svc.def.bufferMin ?? a.biz.buffer,
    priceType: svc.def.price[0],
    priceAmount: svc.def.price[1],
  })
  return row.id
}

/** A business's client row for a phone, created once. */
async function seedClient(
  ctx: Ctx,
  businessId: string,
  c: { phone: string; name: string; userId?: string | null } & Partial<typeof t.clients.$inferInsert>,
) {
  const phone = ctx.phone(c.phone)
  const key = `${businessId} ${phone}`
  const known = ctx.clients.get(key)
  if (known) return known
  const [row] = await ctx.db
    .insert(t.clients)
    .values({ ...c, phone, businessId })
    .returning({ id: t.clients.id })
  if (!row) throw new Error('client insert failed')
  ctx.clients.set(key, row.id)
  return row.id
}

/**
 * What each client knows of a seeded booking: the booking as seeded, as migration 0024 fills the ones made before it;
 * `businessId` keeps it to one business (the demo workspace's remake in a live database).
 */
const fillTold = (businessId?: string) => sql`UPDATE "bookings" b SET "told" = jsonb_build_object(
  'date', b."date",
  'start', b."start",
  'staff', coalesce((SELECT string_agg(coalesce(i."staff_id"::text, ''), ',' ORDER BY i."sort") FROM "booking_items" i WHERE i."booking_id" = b."id"), '')
) WHERE b."told" IS NULL${businessId ? sql` AND b."business_id" = ${businessId}` : sql``}`

export async function seed(db: Db, opts: { demo: boolean; now: number }): Promise<Record<string, number>> {
  return db.transaction(async (tx) => {
    if (!opts.demo) return seedCatalogue(tx)
    const counts = await seedDemo(tx, opts)
    await tx.execute(fillTold())
    return counts
  })
}

/**
 * The first launch's example businesses (book Q-004, F-200): the design's appointment businesses that aren't there yet
 * (by page address), marked as examples (`demo`), confirming at once, with no team to sign in to and no reviews of their
 * own; nothing else is touched, so production keeps its data and visitors' bookings. Their week is the design's.
 */
export async function seedExamples(db: Db, opts: { now: number; phone: string }): Promise<number> {
  return db.transaction(async (tx) => {
    const ctx: Ctx = {
      db: tx,
      now: opts.now,
      day: (d) => d,
      week: <T>(days: readonly T[]): T[] => [...days],
      code: codeMaker(),
      users: new Map(),
      clients: new Map(),
      example: true,
      examplePhone: opts.phone,
      phone: (p) => p,
    }
    const there = new Set((await tx.select({ slug: t.businesses.slug }).from(t.businesses)).map((b) => b.slug))
    let added = 0
    for (const def of BUSINESSES)
      if (def.type === 'appointment' && !there.has(def.slug)) {
        await seedBusiness(ctx, def)
        added++
      }
    // the phone they show follows the config's (the market's support line or `EXAMPLE_PHONE`), a change of it included
    const examples = BUSINESSES.filter((d) => d.type === 'appointment').map((d) => d.slug)
    await tx
      .update(t.businesses)
      .set({ phone: opts.phone })
      .where(and(eq(t.businesses.demo, true), inArray(t.businesses.slug, examples), ne(t.businesses.phone, opts.phone)))
    return added
  })
}

/** The market's cities and the category catalogue, kept up to date on every setup, a kept demo included. */
export async function seedCatalogue(db: Queryable): Promise<Record<string, number>> {
  return { cities: await seedCities(db), categories: await seedCategories(db) }
}

/** The demo's dates on today (`day`), its weekly data turned with them (`week`), and the days between (`shift`). */
function demoDates(now: number): Pick<Ctx, 'day' | 'week'> & { shift: number } {
  const shift = diffDays(today(now), DEMO_DAY)
  const turn = ((shift % 7) + 7) % 7
  return {
    shift,
    day: (d) => addDays(d, shift),
    week: <T>(days: readonly T[]): T[] => days.map((_, i) => days[(i - turn + 7) % 7] as T),
  }
}

async function seedDemo(db: Queryable, opts: { now: number }): Promise<Record<string, number>> {
  await wipe(db)
  const counts = await seedCatalogue(db)
  const { shift, day, week } = demoDates(opts.now)
  const ctx: Ctx = {
    db,
    now: opts.now,
    day,
    week,
    code: codeMaker(),
    users: new Map(),
    clients: new Map(),
    phone: (p) => p,
  }

  await db
    .insert(t.places)
    .values(PLACES.map((p) => ({ cityId: MARKET.mainCity, label: p.label, ...offset(DEMO_CENTER, p.distanceKm, p.bearing) })))

  const seeded = new Map<string, SeededBusiness>()
  for (const def of BUSINESSES) seeded.set(def.slug, await seedBusiness(ctx, def))
  counts.businesses = seeded.size
  const biz = (slug: string) => {
    const b = seeded.get(slug)
    if (!b) throw new Error(`unknown business ${slug}`)
    return b
  }

  // the demo client
  const ayjemal = await user(ctx, DEMO_USER.phone, DEMO_USER.name)
  await db.insert(t.favorites).values(DEMO_USER.favorites.map((slug) => ({ userId: ayjemal, businessId: biz(slug).id })))

  await seedGlow(ctx, biz('glow-studio'), (phone) => (phone === DEMO_USER.phone ? ayjemal : null))
  await seedAyjemalElsewhere(ctx, biz, ayjemal)
  await seedYogaAndParahat(ctx, biz, ayjemal, shift)

  const [row] = await db.execute<{ n: number }>(sql`select count(*)::int as n from bookings`).then((r) => r.rows)
  counts.bookings = row?.n ?? 0
  counts.users = ctx.users.size
  return counts
}

/**
 * Glow Studio's working data (the business app's demo): the client list and notes, the demo day's bookings and
 * requests, the past visits and the reviews. `holder`: the account a design number's bookings join (Aýjemal's in
 * development; none in the demo workspace).
 */
async function seedGlow(ctx: Ctx, glow: SeededBusiness, holder: (designPhone: string) => string | null): Promise<void> {
  const { db } = ctx
  const clientIds = new Map<string, string>()
  const historyByClient = new Map<string, { id: string; service: string; date: string }[]>()
  for (const c of GLOW_CLIENTS) {
    const id = await seedClient(ctx, glow.id, {
      phone: c.phone,
      name: c.fullName ?? c.name,
      tags: c.tags,
      source: c.source ?? null,
      onlineBlocked: c.onlineBlocked ?? false,
      userId: holder(c.phone),
      createdAt: new Date(epochOf(ctx.day(c.since ?? '2026-01-15'), 600)),
    })
    clientIds.set(c.key, id)
    for (const n of c.notes ?? []) {
      await db.insert(t.clientNotes).values({
        clientId: id,
        text: n.text,
        alert: n.alert,
        authorStaffId: glow.staff.get(n.by)?.id ?? null,
        createdAt: new Date(epochOf(ctx.day(n.at), 600)),
      })
    }
  }

  for (const b of GLOW_BOOKINGS) {
    const c = GLOW_CLIENTS.find((x) => x.key === b.client)
    if (!c) throw new Error(`unknown client ${b.client}`)
    await seedAppointment(ctx, {
      biz: glow,
      clientId: clientIds.get(b.client) ?? null,
      userId: holder(c.phone),
      clientName: c.fullName ?? c.name,
      clientPhone: c.phone,
      serviceKey: b.service,
      staffKey: b.staff,
      date: ctx.day(b.date),
      start: m(b.from),
      status: b.status,
      cancelledBy: b.cancelledBy,
      source: b.source,
      hold: b.hold,
      clientNote: b.clientNote,
      code: b.code,
    })
  }

  // past visits: the explicit history, then generated visits back in time until the counts match the client list
  for (const c of GLOW_CLIENTS) {
    const done = GLOW_BOOKINGS.filter((b) => b.client === c.key && b.status === 'completed').length
    const entries = [...(c.history ?? [])]
    let completed = done + entries.filter((e) => e.status === 'completed').length
    const oldest = [...entries.map((e) => e.date), ...(c.last && c.last !== DEMO_DAY ? [c.last] : [])].sort()[0]
    if (c.last && c.last !== DEMO_DAY && !entries.some((e) => e.date === c.last) && completed < c.visits && c.usual) {
      entries.push({ date: c.last, service: c.usual, status: 'completed' })
      completed++
    }
    let cursor = addDays(oldest ?? (c.last === DEMO_DAY ? DEMO_DAY : (c.last ?? DEMO_DAY)), -21)
    while (completed < c.visits && c.usual) {
      if (dow(cursor) === 6) cursor = addDays(cursor, -1)
      entries.push({ date: cursor, service: c.usual, status: 'completed' })
      completed++
      cursor = addDays(cursor, -21)
    }
    const visits: { id: string; service: string; date: string }[] = []
    for (const [i, e] of entries.entries()) {
      const svc = glow.services.get(e.service)
      if (!svc) continue
      const id = await seedAppointment(ctx, {
        biz: glow,
        clientId: clientIds.get(c.key) ?? null,
        userId: holder(c.phone),
        clientName: c.fullName ?? c.name,
        clientPhone: c.phone,
        serviceKey: e.service,
        staffKey: svc.def.staff[0] ?? '',
        date: ctx.day(e.date),
        start: 600 + ((i * 90) % 420),
        status: e.status,
        source: i % 3 === 0 ? 'phone' : 'web',
      })
      visits.push({ id, service: e.service, date: e.date })
    }
    historyByClient.set(c.key, visits)
  }

  for (const r of GLOW_REVIEWS) {
    const visit = (historyByClient.get(r.client) ?? [])
      .filter((v) => v.service === r.service)
      .sort((a, b) => b.date.localeCompare(a.date))[0]
    const c = GLOW_CLIENTS.find((x) => x.key === r.client)
    const svc = glow.services.get(r.service)
    if (!visit || !c || !svc) throw new Error(`no visit for review ${r.client}/${r.service}`)
    const staffName = glow.staff.get(svc.def.staff[0] ?? '')?.name ?? ''
    const createdAt = epochOf(ctx.day(DEMO_DAY), 600) - r.daysAgo * 86_400_000
    await db.insert(t.reviews).values({
      bookingId: visit.id,
      businessId: glow.id,
      authorName: c.name,
      rating: r.rating,
      text: r.text,
      what: `${localized(svc.def.name, MARKET.defaultLanguage)} · ${staffName}`,
      replyText: r.reply ?? null,
      replyAt: r.reply ? new Date(createdAt + 3_600_000) : null,
      createdAt: new Date(createdAt),
    })
  }
}

/** Aýjemal's bookings at the other demo businesses (development's demo client). */
async function seedAyjemalElsewhere(ctx: Ctx, biz: (slug: string) => SeededBusiness, ayjemal: string): Promise<void> {
  const { db } = ctx
  for (const a of AYJEMAL_BOOKINGS) {
    const b = biz(a.business)
    const clientId = await seedClient(ctx, b.id, { phone: DEMO_USER.phone, name: DEMO_USER.name, userId: ayjemal, source: 'yeral' })
    const date = ctx.day(a.date)
    if (a.type === 'appointment' && a.service && a.staff) {
      const id = await seedAppointment(ctx, {
        biz: b,
        clientId,
        userId: ayjemal,
        clientName: DEMO_USER.name,
        clientPhone: DEMO_USER.phone,
        serviceKey: a.service,
        staffKey: a.staff,
        date,
        start: m(a.from),
        status: a.status,
        cancelledBy: a.cancelledBy,
        cancelReason: a.reason,
        source: 'web',
        code: a.code,
      })
      if (a.review) {
        const svc = b.services.get(a.service)
        await db.insert(t.reviews).values({
          bookingId: id,
          businessId: b.id,
          userId: ayjemal,
          authorName: 'Aýjemal G.',
          rating: a.review,
          what: `${svc ? localized(svc.def.name, MARKET.defaultLanguage) : ''} · ${b.staff.get(a.staff)?.name ?? ''}`,
          createdAt: new Date(epochOf(date, m(a.from)) + 86_400_000),
        })
      }
    } else if (a.type === 'table' && a.partySize && a.area) {
      const area = b.areas.get(a.area)
      const table = area?.tables.filter((x) => x.seats >= (a.partySize ?? 2)).sort((x, y) => x.seats - y.seats)[0]
      const start = m(a.from)
      const end = start + b.sittingMinutes
      await db.insert(t.bookings).values({
        code: ctx.code(a.code),
        businessId: b.id,
        type: 'table',
        clientId,
        userId: ayjemal,
        clientName: DEMO_USER.name,
        clientPhone: DEMO_USER.phone,
        date,
        start,
        end,
        status: a.status,
        cancelledBy: a.cancelledBy ?? null,
        cancelReason: a.reason ?? null,
        businessCancelReason: businessCancelOf(a.cancelledBy, a.reason),
        source: 'web',
        partySize: a.partySize,
        areaId: area?.id ?? null,
        tableId: table?.id ?? null,
        ...lifecycle(ctx, b, { date, start, end, status: a.status }),
      })
    }
  }
}

/** Aýdyň ýoga's classes with Aýjemal's seat, and Glow Studio · Parahat's two waiting requests (development's demo). */
async function seedYogaAndParahat(ctx: Ctx, biz: (slug: string) => SeededBusiness, ayjemal: string, shift: number): Promise<void> {
  const { db } = ctx
  // Aýdyň ýoga: sessions from a week ago to two weeks ahead; the demo day's seats as in the design
  const yoga = biz('aydyn-yoga')
  // the design's weekday of each date: YOGA_WEEK and the seats taken are written for the design's dates
  const sessionRows = Array.from({ length: 22 }, (_, i) => addDays(today(ctx.now), i - 7)).flatMap((date) =>
    YOGA_WEEK.filter((x) => x.dow === dow(addDays(date, -shift))).map((s) => ({
      businessId: yoga.id,
      name: s.name,
      trainerId: yoga.staff.get(s.trainer)?.id ?? null,
      level: s.level,
      date,
      start: m(s.start),
      durationMin: s.durationMin,
      capacity: s.capacity,
      price: s.price,
    })),
  )
  const sessions = await db
    .insert(t.classSessions)
    .values(sessionRows)
    .returning({ id: t.classSessions.id, date: t.classSessions.date, start: t.classSessions.start })
  const sessionIds = new Map(sessions.map((x) => [`${x.date} ${x.start}`, x.id]))
  let anonymous = 0
  for (const [key, taken] of Object.entries(YOGA_TAKEN)) {
    const [date = DEMO_DAY, time = '00:00'] = key.split(' ')
    const sessionId = sessionIds.get(`${ctx.day(date)} ${m(time)}`)
    const s = YOGA_WEEK.find((x) => x.dow === dow(date) && x.start === time)
    if (!sessionId || !s) throw new Error(`no yoga session for ${key}`)
    const people = Array.from({ length: taken }, () => {
      anonymous++
      return { phone: `+99365${String(900000 + anonymous).slice(-6)}`, name: `Müşderi ${anonymous}` }
    })
    const clients = await db
      .insert(t.clients)
      .values(people.map((p) => ({ ...p, businessId: yoga.id, source: 'walkby' as const })))
      .returning({ id: t.clients.id, phone: t.clients.phone, name: t.clients.name })
    // the same cache seedClient() fills, so a later demo row for one of these numbers finds its client
    for (const c of clients) ctx.clients.set(`${yoga.id} ${c.phone}`, c.id)
    await db.insert(t.bookings).values(
      clients.map((c) => ({
        code: ctx.code(),
        businessId: yoga.id,
        type: 'class' as const,
        clientId: c.id,
        clientName: c.name,
        clientPhone: c.phone,
        date: ctx.day(date),
        start: m(time),
        end: m(time) + s.durationMin,
        status: 'confirmed' as const,
        source: 'phone' as const,
        sessionId,
        seats: 1,
        priceType: 'fixed' as const,
        priceAmount: s.price,
        confirmedAt: new Date(ctx.now - 86_400_000),
      })),
    )
  }
  const yogaBooking = AYJEMAL_BOOKINGS.find((a) => a.type === 'class')
  if (yogaBooking?.session) {
    const date = ctx.day(yogaBooking.date)
    const sessionId = sessionIds.get(`${date} ${m(yogaBooking.session.start)}`)
    const s = YOGA_WEEK.find((x) => x.dow === dow(yogaBooking.date) && x.start === yogaBooking.session?.start)
    if (!sessionId || !s) throw new Error(`no yoga session for ${yogaBooking.code}`)
    const clientId = await seedClient(ctx, yoga.id, { phone: DEMO_USER.phone, name: DEMO_USER.name, userId: ayjemal, source: 'yeral' })
    await db.insert(t.bookings).values({
      code: ctx.code(yogaBooking.code),
      businessId: yoga.id,
      type: 'class',
      clientId,
      userId: ayjemal,
      clientName: DEMO_USER.name,
      clientPhone: DEMO_USER.phone,
      date,
      start: m(s.start),
      end: m(s.start) + s.durationMin,
      status: 'confirmed',
      source: 'web',
      sessionId,
      seats: yogaBooking.seats ?? 1,
      priceType: 'fixed',
      priceAmount: s.price,
      createdAt: new Date(ctx.now - 2 * 86_400_000),
      confirmedAt: new Date(ctx.now - 2 * 86_400_000),
    })
  }

  // Glow Studio · Parahat: the branch switcher shows two waiting requests
  const parahat = biz('glow-studio-parahat')
  for (const [i, r] of [
    { name: 'Aýnabat K.', phone: '+99365120401', start: '11:00', hold: 22 },
    { name: 'Gyzlargül T.', phone: '+99365120402', start: '16:00', hold: 9 },
  ].entries()) {
    const clientId = await seedClient(ctx, parahat.id, { phone: r.phone, name: r.name, source: 'yeral' })
    await seedAppointment(ctx, {
      biz: parahat,
      clientId,
      userId: null,
      clientName: r.name,
      clientPhone: r.phone,
      serviceKey: i === 0 ? 'p1' : 'p2',
      staffKey: 'ogulbibi',
      date: addDays(today(ctx.now), 1),
      start: m(r.start),
      status: 'pending',
      source: 'web',
      hold: r.hold,
    })
  }
}

/** Generated codes the demo workspace may take: all looked up in the table before it's made. */
const SANDBOX_CODES = 2000

/**
 * The business app's demo workspace (book F-242), made from scratch: the one there goes first, with everything
 * visitors added to it, then the design's Glow Studio comes back with its team, clients, today's bookings and
 * requests, the past visits and the reviews, its dates on today. Every number is in the market's unused range, and
 * each one a team member signs in or is invited with is a demo account's: kept from night to night (the visitors'
 * sessions in them go on), whatever a visitor changed in it put back. Nothing joins a real account. Booking codes skip
 * those live bookings hold. `uploads`: the photo keys visitors put in it, to drop from the disk once this commits.
 */
export async function seedSandbox(db: Db, opts: { now: number }): Promise<{ businessId: string; uploads: string[] }> {
  return db.transaction(async (tx) => {
    const team = await tx
      .select({ photo: t.staff.photo })
      .from(t.staff)
      .innerJoin(t.businesses, eq(t.businesses.id, t.staff.businessId))
      .where(eq(t.businesses.sandbox, true))
    const accounts = await tx.select({ photo: t.users.photo }).from(t.users).where(eq(t.users.demo, true))
    const gone = await tx
      .delete(t.businesses)
      .where(eq(t.businesses.sandbox, true))
      .returning({ photos: t.businesses.photos, logo: t.businesses.logo })
    const uploads = [
      ...gone.flatMap((b) => [...b.photos, ...(b.logo ? [b.logo] : [])]),
      ...[...team, ...accounts].flatMap((x) => (x.photo ? [x.photo] : [])),
    ].map((p) => p.key)
    // the codes it may take: the demo's own and the first generated ones, less those live bookings hold
    const candidates = [...DEMO_CODES, ...Array.from({ length: SANDBOX_CODES }, seededCodes())]
    const held = await tx.select({ code: t.bookings.code }).from(t.bookings).where(inArray(t.bookings.code, candidates))
    const generated = seededCodes()
    let drawn = 0
    const next = () => {
      if (++drawn > SANDBOX_CODES) throw new Error(`the demo workspace takes more than ${SANDBOX_CODES} generated booking codes`)
      return generated()
    }
    const ctx: Ctx = {
      db: tx,
      now: opts.now,
      ...demoDates(opts.now),
      code: codeMaker(next, new Set(held.map((b) => b.code))),
      users: new Map(),
      clients: new Map(),
      phone: demoPhones(),
      sandbox: true,
    }
    const def = BUSINESSES.find((b) => b.slug === 'glow-studio')
    if (!def) throw new Error('the design has no Glow Studio')
    const glow = await seedBusiness(ctx, def)
    await seedGlow(ctx, glow, () => null)
    await tx.execute(fillTold(glow.id))
    return { businessId: glow.id, uploads }
  })
}
