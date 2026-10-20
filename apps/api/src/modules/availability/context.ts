/**
 * Loads what `@yeral/domain/availability` needs from the database: the business calendar, rules, team, services and
 * the busy time of active bookings. A pending request counts until the jobs expire it, even when its hold time has
 * just run out: the database's no-overlap constraints still hold its slot until then, so offering it would only end in
 * 409 slot_taken.
 */
import { staffDoingAll, type AppointmentContext, type BusyInterval, type TableContext } from '@yeral/domain/availability'
import type { BookingRules } from '@yeral/domain/rules'
import { addDays } from '@yeral/domain/time'
import { and, eq, gte, inArray, lte, ne } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import type { Queryable } from '../../db/client'
import { bookingItems, bookingRules, bookings, businesses, diningTables, services, staff, staffServices, tableAreas } from '../../db/schema'
import { ApiError } from '../../http/errors'

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
  const [bizRows, ruleRows, staffRows, links, serviceRows] = await Promise.all([
    db.select().from(businesses).where(inArray(businesses.id, ids)),
    db.select().from(bookingRules).where(inArray(bookingRules.businessId, ids)),
    db.select().from(staff).where(inArray(staff.businessId, ids)).orderBy(staff.sort),
    db
      .select({ staffId: staffServices.staffId, serviceId: staffServices.serviceId })
      .from(staffServices)
      .innerJoin(staff, eq(staff.id, staffServices.staffId))
      .where(inArray(staff.businessId, ids)),
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

/** Busy time per specialist, buffers included, for active bookings between two dates and the day either side (past midnight). */
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
  // busy elsewhere (book Q-272): a person in several workspaces is taken here by their bookings as a specialist there,
  // waiting or confirmed, with their buffers; their own bookings as a client, breaks and days off don't count
  const here = alias(staff, 'here')
  const there = alias(staff, 'there')
  const [own, elsewhere] = await Promise.all([
    db
      .select({ ...item, staffId: bookingItems.staffId })
      .from(bookingItems)
      .innerJoin(bookings, eq(bookings.id, bookingItems.bookingId))
      .where(and(inArray(bookings.businessId, businessIds), days)),
    db
      .select({ ...item, staffId: here.id })
      .from(bookingItems)
      .innerJoin(there, eq(there.id, bookingItems.staffId))
      .innerJoin(here, and(eq(here.userId, there.userId), ne(here.id, there.id)))
      .where(and(inArray(here.businessId, businessIds), days)),
  ])
  return [
    ...own.flatMap((r) =>
      r.staffId ? [{ bookingId: r.bookingId, staffId: r.staffId, date: r.date, start: r.start, end: r.end + r.bufferAfter }] : [],
    ),
    ...elsewhere.map((r) => ({
      bookingId: r.bookingId,
      staffId: r.staffId,
      date: r.date,
      start: r.start,
      end: r.end + r.bufferAfter,
      elsewhere: true as const,
    })),
  ]
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
  const [tables, busy] = await Promise.all([
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
