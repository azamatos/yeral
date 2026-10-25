/**
 * Loads what `@yeral/domain/availability` needs from the database: the business calendar, rules, team, services and
 * the busy time of active bookings. A pending request counts until the jobs expire it, even when its hold time has
 * just run out: the database's no-overlap constraints still hold its slot until then, so offering it would only end in
 * 409 slot_taken.
 */
import type { dayStateSchema } from '@yeral/contract/availability'
import {
  busyOn,
  nextFreeSlot,
  staffDoingAll,
  type AppointmentContext,
  type BusyInterval,
  type TableContext,
} from '@yeral/domain/availability'
import { businessClosedReason, withinHours, withinStaffDay, type BusinessHours } from '@yeral/domain/hours'
import { overlaps } from '@yeral/domain/model'
import type { BookingRules } from '@yeral/domain/rules'
import { addDays } from '@yeral/domain/time'
import { and, eq, gte, inArray, lte, sql } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import { all, type Queryable } from '../../db/client'
import {
  bookingItems,
  bookingRules,
  bookings,
  businesses,
  diningTables,
  services,
  staff,
  staffBlocks,
  staffServices,
  tableAreas,
} from '../../db/schema'
import { ApiError } from '../../http/errors'
import type { z } from 'zod'

type DayState = z.infer<typeof dayStateSchema>

export type BusinessRow = typeof businesses.$inferSelect
export type RulesRow = typeof bookingRules.$inferSelect
export type StaffRow = typeof staff.$inferSelect & { serviceIds: string[] }
export type ServiceRow = typeof services.$inferSelect

export interface LoadedBusiness {
  business: BusinessRow
  rules: BookingRules
  rulesNote: RulesRow['note']
  /** Active team in display order. */
  staff: StaffRow[]
  /** Not archived, in menu order. */
  services: ServiceRow[]
}

export function toRules(r: RulesRow): BookingRules {
  return {
    onlineEnabled: r.onlineEnabled,
    confirmMode: r.confirmMode,
    requestAnswerers: r.requestAnswerers,
    holdMinutes: r.holdMinutes,
    leadMinutes: r.leadMinutes,
    windowDays: r.windowDays,
    bufferMinutes: r.bufferMinutes,
    slotStep: r.slotStep,
    cancelWindowMinutes: r.cancelWindowMinutes,
    askCancelReason: r.askCancelReason,
    blockAfterNoShows: r.blockAfterNoShows,
  }
}

export async function loadBusinesses(db: Queryable, ids: string[]): Promise<Map<string, LoadedBusiness>> {
  const out = new Map<string, LoadedBusiness>()
  if (!ids.length) return out
  const [bizRows, ruleRows, staffRows, links, serviceRows] = await all(db, [
    () => db.select().from(businesses).where(inArray(businesses.id, ids)),
    () => db.select().from(bookingRules).where(inArray(bookingRules.businessId, ids)),
    () => db.select().from(staff).where(inArray(staff.businessId, ids)).orderBy(staff.sort),
    () =>
      db
        .select({ staffId: staffServices.staffId, serviceId: staffServices.serviceId })
        .from(staffServices)
        .innerJoin(staff, eq(staff.id, staffServices.staffId))
        .where(inArray(staff.businessId, ids)),
    () =>
      db
        .select()
        .from(services)
        .where(and(inArray(services.businessId, ids), eq(services.archived, false)))
        .orderBy(services.sort),
  ])
  for (const b of bizRows) {
    const r = ruleRows.find((x) => x.businessId === b.id)
    if (!r) continue
    out.set(b.id, {
      business: b,
      rules: toRules(r),
      rulesNote: r.note,
      staff: staffRows
        .filter((s) => s.businessId === b.id && s.status === 'active')
        .map((s) => ({ ...s, serviceIds: links.filter((l) => l.staffId === s.id).map((l) => l.serviceId) })),
      services: serviceRows.filter((s) => s.businessId === b.id),
    })
  }
  return out
}

/**
 * Busy time per specialist, buffers included, for active bookings between two dates and the day either side (past
 * midnight), and their blocked time (book B-18).
 */
export async function loadBusy(db: Queryable, businessIds: string[], from: string, to: string): Promise<BusyInterval[]> {
  if (!businessIds.length) return []
  const days = and(eq(bookingItems.active, true), gte(bookingItems.date, addDays(from, -1)), lte(bookingItems.date, addDays(to, 1)))
  const item = {
    bookingId: bookingItems.bookingId,
    date: bookingItems.date,
    start: bookingItems.start,
    end: bookingItems.end,
    bufferAfter: bookingItems.bufferAfter,
  }
  const [own, elsewhere, blocks] = await all(db, [
    () =>
      db
        .select({ ...item, staffId: bookingItems.staffId })
        .from(bookingItems)
        .innerJoin(bookings, eq(bookings.id, bookingItems.bookingId))
        .where(and(inArray(bookings.businessId, businessIds), days)),
    () => loadElsewhere(db, businessIds, from, to),
    () =>
      db
        .select()
        .from(staffBlocks)
        .where(
          and(
            inArray(staffBlocks.businessId, businessIds),
            gte(staffBlocks.date, addDays(from, -1)),
            lte(staffBlocks.date, addDays(to, 1)),
          ),
        ),
  ])
  return [
    ...own.flatMap((r) =>
      r.staffId
        ? [{ bookingId: r.bookingId, staffId: r.staffId, date: r.date, start: r.start, end: r.end + r.bufferAfter, buffer: r.bufferAfter }]
        : [],
    ),
    ...elsewhere,
    ...blocks.map((b) => ({
      bookingId: `block:${b.id}`,
      staffId: b.staffId,
      date: b.date,
      start: b.start,
      end: b.end,
      blocked: true as const,
    })),
  ]
}

/**
 * Busy elsewhere (book Q-272): a person in several workspaces is taken here by their bookings as a specialist there,
 * waiting or confirmed, with their buffers, by the account each item was booked with, as the database counts them
 * (migration 0020); their own bookings as a client, breaks, days off and blocked time there don't count.
 */
export async function loadElsewhere(
  db: Queryable,
  businessIds: string[],
  from: string,
  to: string,
  staffIds?: readonly string[],
): Promise<BusyInterval[]> {
  if (!businessIds.length || staffIds?.length === 0) return []
  const here = alias(staff, 'here')
  const rows = await db
    .select({
      bookingId: bookingItems.bookingId,
      date: bookingItems.date,
      start: bookingItems.start,
      end: bookingItems.end,
      bufferAfter: bookingItems.bufferAfter,
      staffId: here.id,
    })
    .from(bookingItems)
    .innerJoin(here, and(eq(here.userId, bookingItems.person), sql`${here.id} is distinct from ${bookingItems.staffId}`))
    .where(
      and(
        inArray(here.businessId, businessIds),
        staffIds ? inArray(here.id, [...staffIds]) : undefined,
        eq(bookingItems.active, true),
        gte(bookingItems.date, addDays(from, -1)),
        lte(bookingItems.date, addDays(to, 1)),
      ),
    )
  return rows.map((r) => ({
    bookingId: r.bookingId,
    staffId: r.staffId,
    date: r.date,
    start: r.start,
    end: r.end + r.bufferAfter,
    buffer: r.bufferAfter,
    elsewhere: true as const,
  }))
}

/**
 * A business's week and special days; 404 when it's gone. `lock` holds the row until the transaction ends: `share` as a
 * booking takes it (`lockedHours`), `no key update` as an hours save does.
 */
export async function loadHours(db: Queryable, businessId: string, opts: { lock?: 'share' | 'no key update' } = {}) {
  const q = db
    .select({ hours: businesses.hours, exceptions: businesses.exceptions, closedAt: businesses.closedAt })
    .from(businesses)
    .where(eq(businesses.id, businessId))
  const [b] = opts.lock ? await q.for(opts.lock) : await q
  if (!b) throw new ApiError('not_found')
  // a booking's paths hold the hours (`lockedHours`): a closed business (book Q-213) takes none, read after a close in
  // progress has committed
  if (opts.lock === 'share' && b.closedAt) throw new ApiError('not_found')
  return { hours: b.hours, exceptions: b.exceptions }
}

/**
 * The business's hours as they stand, held until the transaction ends (`for share`): an hours save (`for no key update`)
 * waits for it and it for the save, so a booking and a change of hours never pass each other (book Q-211). Taken before
 * any booking's lock, the order the save takes them in.
 */
export const lockedHours = (db: Queryable, businessId: string) => loadHours(db, businessId, { lock: 'share' })

/**
 * A time the hours, or a specialist's day, as they stand no longer hold (book Q-211, B-47): 409 `slot_taken`, to which
 * `inTransaction` adds the nearest free times as the business stands.
 */
export class OutsideHours extends ApiError {
  /** `staffId`: the specialist whose day no longer holds it, when that's why; `blocked`: their blocked time (B-18). */
  constructor(
    readonly staffId?: string,
    readonly why: 'off' | 'blocked' = 'off',
  ) {
    super('slot_taken', { alternatives: [] })
  }
}

/**
 * A booking about to take its time still falls inside the hours as they stand (`lockedHours`), and its specialists'
 * days (`assertStaffFree`, when `items` are given); else `OutsideHours`. Returns the hours it read.
 */
export async function assertOpenAt(
  db: Queryable,
  businessId: string,
  b: { date: string; start: number; end: number },
  items?: readonly StaffItem[],
): Promise<BusinessHours> {
  const hours = await lockedHours(db, businessId)
  if (!withinHours(hours, b.date, { start: b.start, end: b.end })) throw new OutsideHours()
  if (items) await assertStaffFree(db, hours, b.date, items)
  return hours
}

interface StaffItem {
  staffId: string | null
  start: number
  end: number
}

/**
 * The specialists a booking is about to take still work then (book B-47, B-50): on the team, taking bookings, and each
 * of their items inside their day as their schedule stands (unless `day` is false). A schedule save or a removal holds the business row as an
 * hours save does, so read after `lockedHours` this is how it stands; else `OutsideHours`.
 */
export async function assertStaffFree(
  db: Queryable,
  hours: BusinessHours,
  date: string,
  items: readonly StaffItem[],
  opts: { day?: boolean } = {},
): Promise<void> {
  const ids = [...new Set(items.flatMap((i) => (i.staffId ? [i.staffId] : [])))]
  if (!ids.length) return
  const [rows, blocks] = await all(db, [
    () =>
      db
        .select({
          id: staff.id,
          status: staff.status,
          bookable: staff.bookable,
          shift: staff.shift,
          breaks: staff.breaks,
          daysOff: staff.daysOff,
        })
        .from(staff)
        .where(inArray(staff.id, ids)),
    // their blocked time (B-18), the day before too: it may run past midnight
    () =>
      db
        .select()
        .from(staffBlocks)
        .where(and(inArray(staffBlocks.staffId, ids), gte(staffBlocks.date, addDays(date, -1)), lte(staffBlocks.date, addDays(date, 1)))),
  ])
  for (const it of items) {
    if (!it.staffId) continue
    const s = rows.find((r) => r.id === it.staffId)
    if (!s || s.status !== 'active' || !s.bookable) throw new OutsideHours(it.staffId)
    // blocked time closes it whatever comes back (a block is made only over free time)
    if (busyOn(blocks, date).some((b) => b.staffId === it.staffId && overlaps(b, it))) throw new OutsideHours(it.staffId, 'blocked')
    // `day: false`: on the team is enough (a confirmed booking brought back as it was)
    if (opts.day === false) continue
    if (!withinStaffDay(hours, s, date, { start: it.start, end: it.end })) throw new OutsideHours(it.staffId)
  }
}

/** One business with what free times need; 404 when it's gone. */
export async function loadBusiness(db: Queryable, id: string): Promise<LoadedBusiness> {
  const lb = (await loadBusinesses(db, [id])).get(id)
  if (!lb) throw new ApiError('not_found')
  return lb
}

/**
 * The date strip (client spec §4.4, book B-23): `days` days from `first`; a closed day says why (a special day by its
 * name), an open one is `open` when `free(date)` finds a start, else `full`.
 */
export function dayStrip(business: BusinessHours, first: string, days: number, free: (date: string) => boolean): DayState[] {
  return Array.from({ length: days }, (_, i) => {
    const date = addDays(first, i)
    const closed = businessClosedReason(business, date)
    if (closed) return { date, state: 'closed', closedReason: closed.kind === 'exception' ? closed.name : null }
    return { date, state: free(date) ? 'open' : 'full', closedReason: null }
  })
}

/** The named specialist (if any) still takes bookings and does every one of the services; else 404. */
export function checkStaff(ctx: AppointmentContext, serviceIds: readonly string[], staffId: string | null): void {
  if (staffId && !staffDoingAll(ctx, serviceIds).some((s) => s.id === staffId)) throw new ApiError('not_found', { staffId })
}

/** The services are booked online here, and the named specialist (if any) does them all; else 404. */
export function checkQuery(ctx: AppointmentContext, serviceIds: readonly string[], staffId: string | null): void {
  for (const id of serviceIds) if (!ctx.services.some((s) => s.id === id && s.online)) throw new ApiError('not_found', { serviceId: id })
  checkStaff(ctx, serviceIds, staffId)
}

export function appointmentContext(lb: LoadedBusiness, busy: BusyInterval[], now: number): AppointmentContext {
  return {
    business: { hours: lb.business.hours, exceptions: lb.business.exceptions },
    rules: lb.rules,
    staff: lb.staff.map((s) => ({
      id: s.id,
      serviceIds: s.serviceIds,
      bookable: s.bookable,
      active: s.status === 'active',
      shift: s.shift,
      breaks: s.breaks,
      daysOff: s.daysOff,
    })),
    services: lb.services.map((s) => ({ id: s.id, durationMin: s.durationMin, bufferMin: s.bufferMin, online: s.online })),
    busy: busy.filter((b) => lb.staff.some((s) => s.id === b.staffId)),
    now,
  }
}

/**
 * The next free start a client may book for the services, with that specialist or anyone (`null`), in the booking
 * window from today («Indiki boş wagt»: the business page's card and specialists, the booking's specialist step). For
 * one specialist only their own busy times are read: a day's free times with them depend on nothing else.
 */
export function nextFreeFor(
  ctx: AppointmentContext,
  serviceIds: string[],
  staffId: string | null,
  excludeBookingIds: readonly string[] = [],
): { date: string; start: number } | null {
  const scoped = staffId ? { ...ctx, busy: ctx.busy.filter((b) => b.staffId === staffId) } : ctx
  const found = nextFreeSlot(scoped, { serviceIds, staffId, by: 'client', excludeBookingIds })
  return found ? { date: found.date, start: found.slot.start } : null
}

export type LoadedTableContext = TableContext & { areaRows: (typeof tableAreas.$inferSelect)[] }

export async function loadTableContext(
  db: Queryable,
  lb: LoadedBusiness,
  from: string,
  to: string,
  now: number,
): Promise<LoadedTableContext> {
  const ctx = (await loadTableContexts(db, [lb], from, to, now)).get(lb.business.id)
  if (!ctx) throw new Error('table context missing')
  return ctx
}

/** Areas, tables and busy tables of several restaurants in three queries (search cards). */
export async function loadTableContexts(
  db: Queryable,
  lbs: LoadedBusiness[],
  from: string,
  to: string,
  now: number,
): Promise<Map<string, LoadedTableContext>> {
  const out = new Map<string, LoadedTableContext>()
  if (!lbs.length) return out
  const ids = lbs.map((lb) => lb.business.id)
  const areaRows = await db.select().from(tableAreas).where(inArray(tableAreas.businessId, ids)).orderBy(tableAreas.sort)
  const [tables, busy] = await all(db, [
    async () =>
      areaRows.length
        ? db
            .select()
            .from(diningTables)
            .where(
              inArray(
                diningTables.areaId,
                areaRows.map((a) => a.id),
              ),
            )
        : [],
    () =>
      db
        .select({
          businessId: bookings.businessId,
          tableId: bookings.tableId,
          date: bookings.date,
          start: bookings.start,
          end: bookings.end,
          bookingId: bookings.id,
        })
        .from(bookings)
        // a day before and after too: a day may run past midnight (busyOn)
        .where(
          and(
            inArray(bookings.businessId, ids),
            eq(bookings.active, true),
            gte(bookings.date, addDays(from, -1)),
            lte(bookings.date, addDays(to, 1)),
          ),
        ),
  ])
  for (const lb of lbs) {
    const areas = areaRows.filter((a) => a.businessId === lb.business.id)
    out.set(lb.business.id, {
      business: { hours: lb.business.hours, exceptions: lb.business.exceptions },
      rules: lb.rules,
      areas: areas.map((a) => ({ id: a.id, minParty: a.minParty, maxParty: a.maxParty, tables: tables.filter((t) => t.areaId === a.id) })),
      sittingMinutes: lb.business.tableSittingMinutes,
      busy: busy.flatMap(({ businessId, ...b }) => (b.tableId && businessId === lb.business.id ? [{ ...b, tableId: b.tableId }] : [])),
      now,
      areaRows: areas,
    })
  }
  return out
}
