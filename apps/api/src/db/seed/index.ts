/**
 * `seed(db, { demo, now })`: the category catalogue always; with `demo`, the whole design demo (wipes the database
 * first — the CLI allows that only on local and staging databases). Demo dates move with "today".
 */
import { bookingCode } from '@yeral/domain/id'
import { holdUntil as holdUntilOf } from '@yeral/domain/lifecycle'
import type { BookingStatus } from '@yeral/domain/model'
import { ROLE_TEMPLATES, type RoleTemplate } from '@yeral/domain/permissions'
import { DEFAULT_RULES } from '@yeral/domain/rules'
import { addDays, diffDays, dow, epochOf, today } from '@yeral/domain/time'
import { sql } from 'drizzle-orm'
import type { Db } from '../client'
import * as t from '../schema'
import { CATEGORIES } from './categories'
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

const ROLE_NAMES: Record<RoleTemplate, string> = { owner: 'Eýesi', admin: 'Administrator', specialist: 'Hünärmen' }

/** A point `km` away from `from` in direction `bearing` (degrees from north). */
export function offset(from: { lat: number; lng: number }, km: number, bearing: number) {
  const rad = (bearing * Math.PI) / 180
  const dLat = (km / 111.32) * Math.cos(rad)
  const dLng = (km / (111.32 * Math.cos((from.lat * Math.PI) / 180))) * Math.sin(rad)
  return { lat: Number((from.lat + dLat).toFixed(6)), lng: Number((from.lng + dLng).toFixed(6)) }
}

const ALL_TABLES = [
  'events',
  'jobs',
  'reviews',
  'booking_items',
  'bookings',
  'client_notes',
  'clients',
  'favorites',
  'memberships',
  'roles',
  'staff_services',
  'services',
  'service_groups',
  'staff',
  'dining_tables',
  'table_areas',
  'class_sessions',
  'booking_rules',
  'verification_history',
  'businesses',
  'categories',
  'places',
  'sessions',
  'login_codes',
  'rate_limits',
  'users',
]

export async function wipe(db: Db): Promise<void> {
  await db.execute(sql.raw(`truncate table ${ALL_TABLES.map((x) => `"${x}"`).join(', ')} restart identity cascade`))
}

export async function seedCategories(db: Db): Promise<number> {
  for (const [i, c] of CATEGORIES.entries()) {
    const row = { ...c, intro: { tk: '', ru: '', en: '' }, sort: i }
    await db.insert(t.categories).values(row).onConflictDoUpdate({ target: t.categories.id, set: row })
  }
  return CATEGORIES.length
}

interface Ctx {
  db: Db
  now: number
  /** Demo day → today. */
  day: (date: string) => string
  usedCodes: Set<string>
  users: Map<string, string>
  clients: Map<string, string>
}

function code(ctx: Ctx, fixed?: string): string {
  let c = fixed ?? bookingCode()
  while (ctx.usedCodes.has(c)) c = bookingCode()
  ctx.usedCodes.add(c)
  return c
}

async function user(ctx: Ctx, phone: string, name: string | null): Promise<string> {
  const known = ctx.users.get(phone)
  if (known) return known
  const [row] = await ctx.db.insert(t.users).values({ phone, name }).returning({ id: t.users.id })
  if (!row) throw new Error('user insert failed')
  ctx.users.set(phone, row.id)
  return row.id
}

interface SeededBusiness {
  id: string
  def: DemoBusiness
  services: Map<string, { id: string; def: DemoService }>
  staff: Map<string, { id: string; name: string }>
  areas: Map<string, { id: string; tables: { id: string; seats: number }[] }>
  buffer: number
  holdMinutes: number
}

async function seedBusiness(ctx: Ctx, def: DemoBusiness): Promise<SeededBusiness> {
  const { db } = ctx
  const geo = offset(DEMO_CENTER, def.distanceKm, def.bearing)
  const [biz] = await db
    .insert(t.businesses)
    .values({
      slug: def.slug,
      name: def.name,
      categoryId: def.category,
      kind: def.kind,
      bookingTypes: [def.type],
      about: def.about,
      address: def.address,
      street: def.street,
      entranceNote: def.entranceNote ?? null,
      lat: geo.lat,
      lng: geo.lng,
      phone: def.phone,
      photos: def.photos.map((name) => {
        const photo = PHOTOS[name]
        if (!photo) throw new Error(`unknown photo ${name}`)
        return {
          key: `demo/${photo.file}`,
          alt: { tk: `${def.name}: ${photo.alt.tk}`, ru: `${def.name}: ${photo.alt.ru}`, en: `${def.name}: ${photo.alt.en}` },
        }
      }),
      amenities: def.amenities,
      hours: def.hours,
      exceptions: (def.exceptions ?? []).map((e) => (e.yearly ? e : { ...e, from: ctx.day(e.from), to: ctx.day(e.to) })),
      avgBill: def.avgBill ?? null,
      rating: def.rating,
      reviewsCount: def.reviewsCount,
      ratingBreakdown: def.ratingBreakdown ?? {
        5: Math.round(def.reviewsCount * 0.85),
        4: Math.round(def.reviewsCount * 0.12),
        3: 0,
        2: 0,
        1: 0,
      },
      typicalConfirmMinutes: def.typicalConfirmMinutes ?? 20,
      verification: 'verified',
      tableRequests: def.tableRequests ?? [],
      demo: true,
    })
    .returning({ id: t.businesses.id })
  if (!biz) throw new Error('business insert failed')

  const { note, ...ruleOverrides } = def.rules ?? {}
  const rules = { ...DEFAULT_RULES, ...ruleOverrides }
  await db.insert(t.bookingRules).values({ businessId: biz.id, ...rules, note: note ?? null })

  const roleIds = new Map<RoleTemplate, string>()
  for (const template of ['owner', 'admin', 'specialist'] as const) {
    const grant = ROLE_TEMPLATES[template]
    const [role] = await db
      .insert(t.roles)
      .values({
        businessId: biz.id,
        name: ROLE_NAMES[template],
        template,
        system: grant.system,
        visibility: grant.visibility,
        permissions: [...grant.permissions],
      })
      .returning({ id: t.roles.id })
    if (role) roleIds.set(template, role.id)
  }

  const staffIds = new Map<string, { id: string; name: string }>()
  for (const [i, s] of (def.staff ?? []).entries()) {
    const [row] = await db
      .insert(t.staff)
      .values({
        businessId: biz.id,
        name: s.name,
        fullName: s.fullName ?? null,
        specialization: s.specialization ?? null,
        phone: s.phone ?? null,
        gender: s.gender ?? null,
        bookable: s.bookable ?? true,
        hasApp: s.hasApp ?? true,
        status: s.status ?? 'active',
        sort: i,
        shift: s.shift ?? null,
        breaks: s.breaks ?? [null, null, null, null, null, null, null],
        daysOff: (s.daysOff ?? []).map((e) => (e.yearly ? e : { ...e, from: ctx.day(e.from), to: ctx.day(e.to) })),
        rating: s.rating ?? null,
      })
      .returning({ id: t.staff.id })
    if (!row) throw new Error('staff insert failed')
    staffIds.set(s.key, { id: row.id, name: s.name })
    if (s.role && s.phone && (s.hasApp ?? true)) {
      const invited = s.status === 'invited'
      await db.insert(t.memberships).values({
        businessId: biz.id,
        phone: s.phone,
        userId: invited ? null : await user(ctx, s.phone, s.fullName ?? s.name),
        roleId: roleIds.get(s.role) ?? '',
        staffId: row.id,
        status: invited ? 'invited' : 'active',
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

  return { id: biz.id, def, services: serviceIds, staff: staffIds, areas, buffer: rules.bufferMinutes, holdMinutes: rules.holdMinutes }
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

async function seedAppointment(ctx: Ctx, a: AppointmentSeed): Promise<string> {
  const svc = a.biz.services.get(a.serviceKey)
  const who = a.biz.staff.get(a.staffKey)
  if (!svc || !who) throw new Error(`unknown service ${a.serviceKey} or staff ${a.staffKey} in ${a.biz.def.slug}`)
  const end = a.start + svc.def.durationMin
  const active = a.status === 'pending' || a.status === 'confirmed'
  const startEpoch = epochOf(a.date, a.start)
  const createdAt =
    a.status === 'pending'
      ? ctx.now - (a.biz.holdMinutes - (a.hold ?? a.biz.holdMinutes)) * 60_000
      : Math.min(ctx.now, startEpoch) - 3 * 86_400_000
  const [row] = await ctx.db
    .insert(t.bookings)
    .values({
      code: code(ctx, a.code),
      businessId: a.biz.id,
      type: 'appointment',
      clientId: a.clientId,
      userId: a.userId,
      clientName: a.clientName,
      clientPhone: a.clientPhone,
      date: a.date,
      start: a.start,
      end,
      status: a.status,
      active,
      cancelledBy: a.cancelledBy ?? null,
      cancelReason: a.cancelReason ?? null,
      source: a.source,
      clientNote: a.clientNote ?? null,
      priceType: svc.def.price[0],
      priceAmount: svc.def.price[1],
      holdUntil: a.status === 'pending' ? new Date(holdUntilOf(createdAt, { date: a.date, start: a.start }, a.biz.holdMinutes)) : null,
      createdAt: new Date(createdAt),
      confirmedAt: a.status === 'pending' ? null : new Date(createdAt + 10 * 60_000),
      cancelledAt: a.status === 'cancelled' ? new Date(Math.min(ctx.now, startEpoch) - 86_400_000) : null,
      completedAt: a.status === 'completed' || a.status === 'noshow' ? new Date(epochOf(a.date, end)) : null,
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
    active,
  })
  return row.id
}

/** A business's client row for a phone, created once. */
async function seedClient(
  ctx: Ctx,
  businessId: string,
  c: { phone: string; name: string; userId?: string | null } & Partial<typeof t.clients.$inferInsert>,
) {
  const key = `${businessId} ${c.phone}`
  const known = ctx.clients.get(key)
  if (known) return known
  const [row] = await ctx.db
    .insert(t.clients)
    .values({ ...c, businessId })
    .returning({ id: t.clients.id })
  if (!row) throw new Error('client insert failed')
  ctx.clients.set(key, row.id)
  return row.id
}

export async function seed(db: Db, opts: { demo: boolean; now: number }): Promise<Record<string, number>> {
  if (!opts.demo) return { categories: await seedCategories(db) }

  await wipe(db)
  const counts: Record<string, number> = { categories: await seedCategories(db) }
  const shift = diffDays(today(opts.now), DEMO_DAY)
  const ctx: Ctx = { db, now: opts.now, day: (d) => addDays(d, shift), usedCodes: new Set(), users: new Map(), clients: new Map() }

  await db.insert(t.places).values(PLACES.map((p) => ({ label: p.label, ...offset(DEMO_CENTER, p.distanceKm, p.bearing) })))

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

  // Glow Studio: client list, notes, history, the demo day, requests, reviews
  const glow = biz('glow-studio')
  const clientIds = new Map<string, string>()
  const historyByClient = new Map<string, { id: string; service: string; date: string }[]>()
  for (const c of GLOW_CLIENTS) {
    const id = await seedClient(ctx, glow.id, {
      phone: c.phone,
      name: c.fullName ?? c.name,
      tags: c.tags,
      source: c.source ?? null,
      onlineBlocked: c.onlineBlocked ?? false,
      userId: c.phone === DEMO_USER.phone ? ayjemal : null,
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
      userId: c.phone === DEMO_USER.phone ? ayjemal : null,
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
        userId: c.phone === DEMO_USER.phone ? ayjemal : null,
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
      what: `${svc.def.name.tk} · ${staffName}`,
      replyText: r.reply ?? null,
      replyAt: r.reply ? new Date(createdAt + 3_600_000) : null,
      createdAt: new Date(createdAt),
    })
  }

  // Aýjemal's bookings elsewhere
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
          what: `${svc?.def.name.tk ?? ''} · ${b.staff.get(a.staff)?.name ?? ''}`,
          createdAt: new Date(epochOf(date, m(a.from)) + 86_400_000),
        })
      }
    } else if (a.type === 'table' && a.partySize && a.area) {
      const area = b.areas.get(a.area)
      const table = area?.tables.filter((x) => x.seats >= (a.partySize ?? 2)).sort((x, y) => x.seats - y.seats)[0]
      const start = m(a.from)
      await db.insert(t.bookings).values({
        code: code(ctx, a.code),
        businessId: b.id,
        type: 'table',
        clientId,
        userId: ayjemal,
        clientName: DEMO_USER.name,
        clientPhone: DEMO_USER.phone,
        date,
        start,
        end: Math.min(1440, start + 120),
        status: a.status,
        active: a.status === 'pending' || a.status === 'confirmed',
        cancelledBy: a.cancelledBy ?? null,
        cancelReason: a.reason ?? null,
        source: 'web',
        partySize: a.partySize,
        areaId: area?.id ?? null,
        tableId: table?.id ?? null,
        createdAt: new Date(Math.min(opts.now, epochOf(date, start)) - 3 * 86_400_000),
        confirmedAt: new Date(Math.min(opts.now, epochOf(date, start)) - 3 * 86_400_000 + 600_000),
        cancelledAt: a.status === 'cancelled' ? new Date(epochOf(date, start) - 86_400_000) : null,
      })
    }
  }

  // Aýdyň ýoga: sessions from a week ago to two weeks ahead; the demo day's seats as in the design
  const yoga = biz('aydyn-yoga')
  const sessionIds = new Map<string, string>()
  for (let i = -7; i <= 14; i++) {
    const date = addDays(today(opts.now), i)
    for (const s of YOGA_WEEK.filter((x) => x.dow === dow(date))) {
      const [row] = await db
        .insert(t.classSessions)
        .values({
          businessId: yoga.id,
          name: s.name,
          trainerId: yoga.staff.get(s.trainer)?.id ?? null,
          level: s.level,
          date,
          start: m(s.start),
          durationMin: s.durationMin,
          capacity: s.capacity,
          price: s.price,
        })
        .returning({ id: t.classSessions.id })
      if (row) sessionIds.set(`${date} ${s.start}`, row.id)
    }
  }
  let anonymous = 0
  for (const [key, taken] of Object.entries(YOGA_TAKEN)) {
    const [date = DEMO_DAY, time = '00:00'] = key.split(' ')
    const sessionId = sessionIds.get(`${ctx.day(date)} ${time}`)
    const s = YOGA_WEEK.find((x) => x.dow === dow(ctx.day(date)) && x.start === time)
    if (!sessionId || !s) continue
    for (let i = 0; i < taken; i++) {
      anonymous++
      const phone = `+99365${String(900000 + anonymous).slice(-6)}`
      const clientId = await seedClient(ctx, yoga.id, { phone, name: `Müşderi ${anonymous}`, source: 'walkby' })
      await db.insert(t.bookings).values({
        code: code(ctx),
        businessId: yoga.id,
        type: 'class',
        clientId,
        clientName: `Müşderi ${anonymous}`,
        clientPhone: phone,
        date: ctx.day(date),
        start: m(time),
        end: m(time) + s.durationMin,
        status: 'confirmed',
        active: true,
        source: 'phone',
        sessionId,
        seats: 1,
        priceType: 'fixed',
        priceAmount: s.price,
        confirmedAt: new Date(opts.now - 86_400_000),
      })
    }
  }
  const yogaBooking = AYJEMAL_BOOKINGS.find((a) => a.type === 'class')
  if (yogaBooking?.session) {
    const date = ctx.day(yogaBooking.date)
    const sessionId = sessionIds.get(`${date} ${yogaBooking.session.start}`)
    const s = YOGA_WEEK.find((x) => x.dow === dow(date) && x.start === yogaBooking.session?.start)
    if (sessionId && s) {
      const clientId = await seedClient(ctx, yoga.id, { phone: DEMO_USER.phone, name: DEMO_USER.name, userId: ayjemal, source: 'yeral' })
      await db.insert(t.bookings).values({
        code: code(ctx, yogaBooking.code),
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
        active: true,
        source: 'web',
        sessionId,
        seats: yogaBooking.seats ?? 1,
        priceType: 'fixed',
        priceAmount: s.price,
        createdAt: new Date(opts.now - 2 * 86_400_000),
        confirmedAt: new Date(opts.now - 2 * 86_400_000),
      })
    }
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
      date: addDays(today(opts.now), 1),
      start: m(r.start),
      status: 'pending',
      source: 'web',
      hold: r.hold,
    })
  }

  const [row] = await db.execute<{ n: number }>(sql`select count(*)::int as n from bookings`).then((r) => r.rows)
  counts.bookings = row?.n ?? 0
  counts.users = ctx.users.size
  return counts
}
