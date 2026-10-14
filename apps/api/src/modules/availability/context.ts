/**
 * Loads what `@yeral/domain/availability` needs from the database: the business calendar, rules, team, services and
 * the busy time of active bookings (pending requests count until they expire).
 */
import type { AppointmentContext, BusyInterval, TableContext } from '@yeral/domain/availability'
import type { BookingRules } from '@yeral/domain/rules'
import { and, eq, gt, gte, inArray, lte, or } from 'drizzle-orm'
import type { Queryable } from '../../db/client'
import { bookingItems, bookingRules, bookings, businesses, diningTables, services, staff, staffServices, tableAreas } from '../../db/schema'

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
    holdMinutes: r.holdMinutes,
    leadMinutes: r.leadMinutes,
    windowDays: r.windowDays,
    bufferMinutes: r.bufferMinutes,
    slotStep: r.slotStep,
    cancelWindowMinutes: r.cancelWindowMinutes,
    askCancelReason: r.askCancelReason,
    blockAfterNoShows: r.blockAfterNoShows,
    lateToleranceMinutes: r.lateToleranceMinutes,
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
        .filter((s) => s.businessId === b.id && s.status !== 'disabled')
        .map((s) => ({ ...s, serviceIds: links.filter((l) => l.staffId === s.id).map((l) => l.serviceId) })),
      services: serviceRows.filter((s) => s.businessId === b.id),
    })
  }
  return out
}

/** Busy time per specialist, buffers included, for active bookings between two dates. */
export async function loadBusy(db: Queryable, businessIds: string[], from: string, to: string, now: number): Promise<BusyInterval[]> {
  if (!businessIds.length) return []
  const rows = await db
    .select({
      bookingId: bookingItems.bookingId,
      staffId: bookingItems.staffId,
      date: bookingItems.date,
      start: bookingItems.start,
      end: bookingItems.end,
      bufferAfter: bookingItems.bufferAfter,
    })
    .from(bookingItems)
    .innerJoin(bookings, eq(bookings.id, bookingItems.bookingId))
    .where(
      and(
        inArray(bookings.businessId, businessIds),
        eq(bookingItems.active, true),
        gte(bookingItems.date, from),
        lte(bookingItems.date, to),
        or(eq(bookings.status, 'confirmed'), and(eq(bookings.status, 'pending'), gt(bookings.holdUntil, new Date(now)))),
      ),
    )
  return rows.flatMap((r) =>
    r.staffId ? [{ bookingId: r.bookingId, staffId: r.staffId, date: r.date, start: r.start, end: r.end + r.bufferAfter }] : [],
  )
}

export function appointmentContext(lb: LoadedBusiness, busy: BusyInterval[], now: number): AppointmentContext {
  return {
    business: { hours: lb.business.hours, exceptions: lb.business.exceptions },
    rules: lb.rules,
    staff: lb.staff.map((s) => ({
      id: s.id,
      serviceIds: s.serviceIds,
      bookable: s.bookable,
      active: s.status !== 'disabled',
      shift: s.shift,
      breaks: s.breaks,
      daysOff: s.daysOff,
    })),
    services: lb.services.map((s) => ({ id: s.id, durationMin: s.durationMin, bufferMin: s.bufferMin, online: s.online })),
    busy: busy.filter((b) => lb.staff.some((s) => s.id === b.staffId)),
    now,
  }
}

export async function loadTableContext(
  db: Queryable,
  lb: LoadedBusiness,
  from: string,
  to: string,
  now: number,
): Promise<TableContext & { areaRows: (typeof tableAreas.$inferSelect)[] }> {
  const areaRows = await db.select().from(tableAreas).where(eq(tableAreas.businessId, lb.business.id)).orderBy(tableAreas.sort)
  const tables = areaRows.length
    ? await db
        .select()
        .from(diningTables)
        .where(
          inArray(
            diningTables.areaId,
            areaRows.map((a) => a.id),
          ),
        )
    : []
  const busy = await db
    .select({ tableId: bookings.tableId, date: bookings.date, start: bookings.start, end: bookings.end, bookingId: bookings.id })
    .from(bookings)
    .where(
      and(
        eq(bookings.businessId, lb.business.id),
        eq(bookings.active, true),
        gte(bookings.date, from),
        lte(bookings.date, to),
        or(eq(bookings.status, 'confirmed'), and(eq(bookings.status, 'pending'), gt(bookings.holdUntil, new Date(now)))),
      ),
    )
  return {
    business: { hours: lb.business.hours, exceptions: lb.business.exceptions },
    rules: lb.rules,
    areas: areaRows.map((a) => ({ id: a.id, minParty: a.minParty, maxParty: a.maxParty, tables: tables.filter((t) => t.areaId === a.id) })),
    sittingMinutes: lb.business.tableSittingMinutes,
    busy: busy.flatMap((b) => (b.tableId ? [{ ...b, tableId: b.tableId }] : [])),
    now,
    areaRows,
  }
}
