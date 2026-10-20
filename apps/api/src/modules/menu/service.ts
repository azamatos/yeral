/**
 * The services menu the business keeps (book B-38): groups and services in the clients' order, who does each, and
 * deleting with undo. A deleted service is archived: bookings keep their copy of its name and price, and the ones ahead
 * stay as they are (Q-210). Every change tells the team's open screens (`business.updated`).
 */
import type { menuOrderSchema, menuSchema, serviceInputSchema, serviceUpdateSchema } from '@yeral/contract/services'
import type { Localized } from '@yeral/domain/model'
import { serviceErrors, type ServiceTerms } from '@yeral/domain/services'
import { today } from '@yeral/domain/time'
import { and, asc, count, eq, gte, inArray, max, ne } from 'drizzle-orm'
import type { z } from 'zod'
import type { Queryable } from '../../db/client'
import { bookingItems, bookings, serviceGroups, services, staff, staffServices } from '../../db/schema'
import type { Deps } from '../../deps'
import { ApiError } from '../../http/errors'
import { emit } from '../../notify'

type Menu = z.infer<typeof menuSchema>
type MenuService = Menu['groups'][number]['services'][number]
type ServiceInput = z.infer<typeof serviceInputSchema>
type ServiceUpdate = z.infer<typeof serviceUpdateSchema>
type ServiceRow = typeof services.$inferSelect

const invalid = (fields: string[]) => new ApiError('validation_error', { issues: fields.map((f) => ({ path: [f], code: 'invalid' })) })

/** Bookings ahead that hold each service (waiting or confirmed, from today on). */
async function futureCounts(db: Queryable, serviceIds: string[], now: number): Promise<Map<string, number>> {
  if (!serviceIds.length) return new Map()
  const rows = await db
    .select({ serviceId: bookingItems.serviceId, n: count() })
    .from(bookingItems)
    .innerJoin(bookings, eq(bookings.id, bookingItems.bookingId))
    .where(and(inArray(bookingItems.serviceId, serviceIds), eq(bookings.active, true), gte(bookings.date, today(now))))
    .groupBy(bookingItems.serviceId)
  return new Map(rows.flatMap((r) => (r.serviceId ? [[r.serviceId, r.n] as const] : [])))
}

async function viewOf(db: Queryable, rows: ServiceRow[], now: number): Promise<MenuService[]> {
  const ids = rows.map((s) => s.id)
  const [links, future] = await Promise.all([
    ids.length ? db.select().from(staffServices).where(inArray(staffServices.serviceId, ids)) : [],
    futureCounts(db, ids, now),
  ])
  return rows.map((s) => ({
    id: s.id,
    groupId: s.groupId,
    name: s.name,
    description: s.description ?? null,
    durationMin: s.durationMin,
    priceType: s.priceType,
    priceAmount: s.priceAmount,
    bufferMin: s.bufferMin,
    online: s.online,
    staffIds: links.filter((l) => l.serviceId === s.id).map((l) => l.staffId),
    futureBookings: future.get(s.id) ?? 0,
  }))
}

export async function menuOf(db: Queryable, businessId: string, now: number): Promise<Menu> {
  const [groups, rows] = await Promise.all([
    db.select().from(serviceGroups).where(eq(serviceGroups.businessId, businessId)).orderBy(asc(serviceGroups.sort)),
    db
      .select()
      .from(services)
      .where(and(eq(services.businessId, businessId), eq(services.archived, false)))
      .orderBy(asc(services.sort)),
  ])
  const all = await viewOf(db, rows, now)
  return { groups: groups.map((g) => ({ id: g.id, name: g.name, services: all.filter((s) => s.groupId === g.id) })) }
}

async function serviceRow(db: Queryable, businessId: string, serviceId: string): Promise<ServiceRow> {
  const [row] = await db
    .select()
    .from(services)
    .where(and(eq(services.id, serviceId), eq(services.businessId, businessId)))
  if (!row) throw new ApiError('not_found')
  return row
}

async function oneService(db: Queryable, row: ServiceRow, now: number): Promise<MenuService> {
  const [view] = await viewOf(db, [row], now)
  return view!
}

/** The terms pass the screen's limits, the group is this business's, and the people are on its team. */
async function check(db: Queryable, businessId: string, s: ServiceTerms & { groupId: string; staffIds?: readonly string[] }) {
  const fields: string[] = Object.keys(serviceErrors(s))
  const [group] = await db
    .select({ id: serviceGroups.id })
    .from(serviceGroups)
    .where(and(eq(serviceGroups.id, s.groupId), eq(serviceGroups.businessId, businessId)))
  if (!group) fields.push('groupId')
  if (s.staffIds?.length) {
    const team = await db
      .select({ id: staff.id })
      .from(staff)
      .where(and(eq(staff.businessId, businessId), inArray(staff.id, [...s.staffIds]), ne(staff.status, 'removed')))
    if (team.length !== new Set(s.staffIds).size) fields.push('staffIds')
  }
  if (fields.length) throw invalid(fields)
}

async function setStaff(db: Queryable, serviceId: string, staffIds: readonly string[]) {
  await db.delete(staffServices).where(eq(staffServices.serviceId, serviceId))
  const unique = [...new Set(staffIds)]
  if (unique.length) await db.insert(staffServices).values(unique.map((staffId) => ({ staffId, serviceId })))
}

/** The next place at the end of a group. */
async function lastIn(db: Queryable, groupId: string): Promise<number> {
  const [row] = await db
    .select({ top: max(services.sort) })
    .from(services)
    .where(eq(services.groupId, groupId))
  return (row?.top ?? -1) + 1
}

export async function addService(deps: Deps, businessId: string, input: ServiceInput): Promise<MenuService> {
  const s = { ...input, bufferMin: input.bufferMin ?? null, online: input.online ?? true, staffIds: input.staffIds ?? [] }
  return deps.db.transaction(async (tx) => {
    await check(tx, businessId, s)
    const [row] = await tx
      .insert(services)
      .values({
        businessId,
        groupId: s.groupId,
        name: s.name,
        description: s.description ?? null,
        durationMin: s.durationMin,
        priceType: s.priceType,
        priceAmount: s.priceAmount,
        bufferMin: s.bufferMin,
        online: s.online,
        sort: await lastIn(tx, s.groupId),
      })
      .returning()
    await setStaff(tx, row!.id, s.staffIds)
    await emit(tx, { type: 'business.updated', businessId })
    return oneService(tx, row!, deps.now())
  })
}

export async function updateService(deps: Deps, businessId: string, serviceId: string, change: ServiceUpdate): Promise<MenuService> {
  return deps.db.transaction(async (tx) => {
    const row = await serviceRow(tx, businessId, serviceId)
    if (row.archived) throw new ApiError('not_found')
    const next = { ...row, ...change }
    await check(tx, businessId, { ...next, staffIds: change.staffIds })
    const { staffIds, ...fields } = change
    const moved = change.groupId && change.groupId !== row.groupId ? { sort: await lastIn(tx, change.groupId) } : {}
    const set = { ...fields, ...moved } as Partial<typeof services.$inferInsert>
    const [saved] = Object.keys(set).length ? await tx.update(services).set(set).where(eq(services.id, serviceId)).returning() : [row]
    if (staffIds) await setStaff(tx, serviceId, staffIds)
    await emit(tx, { type: 'business.updated', businessId })
    return oneService(tx, saved!, deps.now())
  })
}

/** "Hyzmaty poz": off the menu and the client page; bookings keep their copy, the ones ahead stay (book Q-210). */
export async function archiveService(deps: Deps, businessId: string, serviceId: string, archived: boolean): Promise<MenuService> {
  return deps.db.transaction(async (tx) => {
    const row = await serviceRow(tx, businessId, serviceId)
    if (row.archived === archived) throw new ApiError('invalid_status')
    // an undo puts it back in its place
    const [saved] = await tx.update(services).set({ archived }).where(eq(services.id, serviceId)).returning()
    await emit(tx, { type: 'business.updated', businessId })
    return oneService(tx, saved!, deps.now())
  })
}

export async function addGroup(deps: Deps, businessId: string, name: Localized) {
  return deps.db.transaction(async (tx) => {
    const [top] = await tx
      .select({ top: max(serviceGroups.sort) })
      .from(serviceGroups)
      .where(eq(serviceGroups.businessId, businessId))
    const [row] = await tx
      .insert(serviceGroups)
      .values({ businessId, name, sort: (top?.top ?? -1) + 1 })
      .returning()
    await emit(tx, { type: 'business.updated', businessId })
    return { id: row!.id, name: row!.name, services: [] }
  })
}

export async function renameGroup(deps: Deps, businessId: string, groupId: string, name: Localized) {
  return deps.db.transaction(async (tx) => {
    const [row] = await tx
      .update(serviceGroups)
      .set({ name })
      .where(and(eq(serviceGroups.id, groupId), eq(serviceGroups.businessId, businessId)))
      .returning()
    if (!row) throw new ApiError('not_found')
    await emit(tx, { type: 'business.updated', businessId })
    const menu = await menuOf(tx, businessId, deps.now())
    return menu.groups.find((g) => g.id === groupId)!
  })
}

/**
 * A group goes only when it holds no service ("Ilki hyzmatlary başga topara geçiriň ýa-da pozuň"); services deleted
 * before go with it (their bookings keep their copies), so no undo brings them back.
 */
export async function deleteGroup(deps: Deps, businessId: string, groupId: string): Promise<void> {
  await deps.db.transaction(async (tx) => {
    const [group] = await tx
      .select()
      .from(serviceGroups)
      .where(and(eq(serviceGroups.id, groupId), eq(serviceGroups.businessId, businessId)))
      .for('update')
    if (!group) throw new ApiError('not_found')
    const [held] = await tx
      .select({ id: services.id })
      .from(services)
      .where(and(eq(services.groupId, groupId), eq(services.archived, false)))
      .limit(1)
    if (held) throw new ApiError('group_not_empty')
    await tx.delete(services).where(eq(services.groupId, groupId))
    await tx.delete(serviceGroups).where(eq(serviceGroups.id, groupId))
    await emit(tx, { type: 'business.updated', businessId })
  })
}

/** "Müşderiler şu tertipde görýär": the whole menu's order, every group and service once; a service may change group. */
export async function orderMenu(deps: Deps, businessId: string, order: z.infer<typeof menuOrderSchema>): Promise<Menu> {
  return deps.db.transaction(async (tx) => {
    const [groups, rows] = await Promise.all([
      tx.select({ id: serviceGroups.id }).from(serviceGroups).where(eq(serviceGroups.businessId, businessId)).for('update'),
      tx
        .select({ id: services.id })
        .from(services)
        .where(and(eq(services.businessId, businessId), eq(services.archived, false))),
    ])
    const sameSet = (a: string[], b: string[]) => a.length === b.length && new Set(a).size === a.length && a.every((x) => b.includes(x))
    const fields: string[] = []
    if (
      !sameSet(
        order.groups.map((g) => g.id),
        groups.map((g) => g.id),
      )
    )
      fields.push('groups')
    if (
      !sameSet(
        order.groups.flatMap((g) => g.serviceIds),
        rows.map((s) => s.id),
      )
    )
      fields.push('serviceIds')
    if (fields.length) throw invalid(fields)
    for (const [i, g] of order.groups.entries()) {
      await tx.update(serviceGroups).set({ sort: i }).where(eq(serviceGroups.id, g.id))
      for (const [j, id] of g.serviceIds.entries()) await tx.update(services).set({ groupId: g.id, sort: j }).where(eq(services.id, id))
    }
    await emit(tx, { type: 'business.updated', businessId })
    return menuOf(tx, businessId, deps.now())
  })
}
