/**
 * The services menu the business keeps (book B-38): groups and services in the clients' order, who does each, and
 * deleting with undo. A deleted service is archived: bookings keep their copy of its name and price, and the ones ahead
 * stay as they are (Q-210). Every change tells the team's open screens (`business.updated`).
 */
import type { menuOrderSchema, menuSchema, serviceInputSchema, serviceUpdateSchema } from '@yeral/contract/services'
import { randomUUID } from 'node:crypto'
import type { Localized, PriceType } from '@yeral/domain/model'
import { serviceErrors, type ServiceTerms } from '@yeral/domain/services'
import { localOf } from '@yeral/domain/time'
import { and, asc, countDistinct, eq, gt, inArray, max, ne, notInArray, or, sql } from 'drizzle-orm'
import type { z } from 'zod'
import { all, type Queryable } from '../../db/client'
import { bookingItems, bookings, businesses, serviceGroups, services, staff, staffServices } from '../../db/schema'
import type { Deps } from '../../deps'
import { ApiError, invalid, type Issue } from '../../http/errors'
import { emit } from '../../notify'

type Menu = z.infer<typeof menuSchema>
type MenuGroup = Menu['groups'][number]
type MenuService = MenuGroup['services'][number]
type ServiceInput = z.infer<typeof serviceInputSchema>
type ServiceUpdate = z.infer<typeof serviceUpdateSchema>
type ServiceRow = typeof services.$inferSelect

/** These fields refused by the menu's rules. */
const invalidFields = (fields: string[]) => invalid(...fields.map((f) => ({ path: [f], code: 'invalid' })))

/**
 * Menu changes one at a time per business: places at the end of a group, and a group's existence, hold until the
 * change commits. `no key update` leaves bookings (which only check the business exists) free to go on.
 */
export async function lockMenu(db: Queryable, businessId: string): Promise<void> {
  await db.select({ id: businesses.id }).from(businesses).where(eq(businesses.id, businessId)).for('no key update')
}

/** Bookings ahead that hold each service: waiting or confirmed, not yet over. */
async function futureCounts(db: Queryable, serviceIds: string[], now: number): Promise<Map<string, number>> {
  if (!serviceIds.length) return new Map()
  const { date, min } = localOf(now)
  const rows = await db
    .select({ serviceId: bookingItems.serviceId, n: countDistinct(bookings.id) })
    .from(bookingItems)
    .innerJoin(bookings, eq(bookings.id, bookingItems.bookingId))
    .where(
      and(
        inArray(bookingItems.serviceId, serviceIds),
        eq(bookings.active, true),
        or(gt(bookings.date, date), and(eq(bookings.date, date), gt(bookings.end, min))),
      ),
    )
    .groupBy(bookingItems.serviceId)
  return new Map(rows.flatMap((r) => (r.serviceId ? [[r.serviceId, r.n] as const] : [])))
}

async function viewOf(db: Queryable, rows: ServiceRow[], now: number): Promise<MenuService[]> {
  const ids = rows.map((s) => s.id)
  const [links, future] = await all(db, [
    // a removed person keeps their links for a reactivation, but doesn't do the service now
    async () =>
      ids.length
        ? db
            .select({ serviceId: staffServices.serviceId, staffId: staffServices.staffId })
            .from(staffServices)
            .innerJoin(staff, eq(staff.id, staffServices.staffId))
            .where(and(inArray(staffServices.serviceId, ids), ne(staff.status, 'removed')))
        : [],
    () => futureCounts(db, ids, now),
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

export const onMenu = (businessId: string) => and(eq(services.businessId, businessId), eq(services.archived, false))

export async function menuOf(db: Queryable, businessId: string, now: number): Promise<Menu> {
  const [groups, rows] = await all(db, [
    () => db.select().from(serviceGroups).where(eq(serviceGroups.businessId, businessId)).orderBy(asc(serviceGroups.sort)),
    () => db.select().from(services).where(onMenu(businessId)).orderBy(asc(services.sort)),
  ])
  const listed = await viewOf(db, rows, now)
  return { groups: groups.map((g) => ({ id: g.id, name: g.name, services: listed.filter((s) => s.groupId === g.id) })) }
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

/** The terms pass the screen's limits, the group is this business's, and the people are on its team (not removed). */
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
    if (team.length !== s.staffIds.length) fields.push('staffIds')
  }
  if (fields.length) throw invalidFields(fields)
}

/** Everyone gained a service is bookable now, and everyone who lost the last one isn't (the team screen's rule). */
async function bookableAgain(db: Queryable, staffIds: readonly string[]) {
  if (!staffIds.length) return
  await db
    .update(staff)
    .set({ bookable: sql`exists (select 1 from ${staffServices} where ${staffServices.staffId} = ${staff.id})` })
    .where(inArray(staff.id, [...staffIds]))
}

/**
 * Who does the service, among the team rows not removed (a removed person's links wait for a reactivation). Any service
 * makes a row bookable and none takes it off, as on the team screen, for everyone gained or lost here.
 */
async function setStaff(db: Queryable, serviceId: string, staffIds: readonly string[]) {
  const before = (
    await db
      .select({ staffId: staffServices.staffId })
      .from(staffServices)
      .innerJoin(staff, eq(staff.id, staffServices.staffId))
      .where(and(eq(staffServices.serviceId, serviceId), ne(staff.status, 'removed')))
  ).map((l) => l.staffId)
  if (before.length)
    await db.delete(staffServices).where(and(eq(staffServices.serviceId, serviceId), inArray(staffServices.staffId, before)))
  if (staffIds.length) await db.insert(staffServices).values(staffIds.map((staffId) => ({ staffId, serviceId })))
  await bookableAgain(db, [...new Set([...before, ...staffIds])])
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
    await lockMenu(tx, businessId)
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
    await lockMenu(tx, businessId)
    const row = await serviceRow(tx, businessId, serviceId)
    if (row.archived) throw new ApiError('not_found')
    await check(tx, businessId, { ...row, ...change, staffIds: change.staffIds })
    const { staffIds, ...fields } = change
    const moved = change.groupId && change.groupId !== row.groupId ? { sort: await lastIn(tx, change.groupId) } : {}
    const set = { ...fields, ...moved } as Partial<typeof services.$inferInsert>
    const [saved] = Object.keys(set).length ? await tx.update(services).set(set).where(eq(services.id, serviceId)).returning() : [row]
    if (staffIds) await setStaff(tx, serviceId, staffIds)
    await emit(tx, { type: 'business.updated', businessId })
    return oneService(tx, saved!, deps.now())
  })
}

/**
 * "Hyzmaty poz": off the menu and the client page; bookings keep their copy, the ones ahead stay (book Q-210). The undo
 * puts it back last in its group: the order may have changed since.
 */
export async function archiveService(deps: Deps, businessId: string, serviceId: string, archived: boolean): Promise<MenuService> {
  return deps.db.transaction(async (tx) => {
    await lockMenu(tx, businessId)
    const row = await serviceRow(tx, businessId, serviceId)
    if (row.archived === archived) throw new ApiError('invalid_status')
    const place = archived ? {} : { sort: await lastIn(tx, row.groupId) }
    const [saved] = await tx
      .update(services)
      .set({ archived, ...place })
      .where(eq(services.id, serviceId))
      .returning()
    await emit(tx, { type: 'business.updated', businessId })
    return oneService(tx, saved!, deps.now())
  })
}

export async function addGroup(deps: Deps, businessId: string, name: Localized): Promise<MenuGroup> {
  return deps.db.transaction(async (tx) => {
    await lockMenu(tx, businessId)
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

export async function renameGroup(deps: Deps, businessId: string, groupId: string, name: Localized): Promise<MenuGroup> {
  return deps.db.transaction(async (tx) => {
    const [row] = await tx
      .update(serviceGroups)
      .set({ name })
      .where(and(eq(serviceGroups.id, groupId), eq(serviceGroups.businessId, businessId)))
      .returning()
    if (!row) throw new ApiError('not_found')
    await emit(tx, { type: 'business.updated', businessId })
    const rows = await tx
      .select()
      .from(services)
      .where(and(onMenu(businessId), eq(services.groupId, groupId)))
      .orderBy(asc(services.sort))
    return { id: row.id, name: row.name, services: await viewOf(tx, rows, deps.now()) }
  })
}

/**
 * A group goes only when it holds no service ("Ilki hyzmatlary başga topara geçiriň ýa-da pozuň"); services deleted
 * before go with it (their bookings keep their copies), so no undo brings them back.
 */
export async function deleteGroup(deps: Deps, businessId: string, groupId: string): Promise<void> {
  await deps.db.transaction(async (tx) => {
    await lockMenu(tx, businessId)
    const [group] = await tx
      .select()
      .from(serviceGroups)
      .where(and(eq(serviceGroups.id, groupId), eq(serviceGroups.businessId, businessId)))
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
    await lockMenu(tx, businessId)
    const [groups, rows] = await all(tx, [
      () => tx.select({ id: serviceGroups.id }).from(serviceGroups).where(eq(serviceGroups.businessId, businessId)),
      () => tx.select({ id: services.id }).from(services).where(onMenu(businessId)),
    ])
    const sameSet = (a: string[], b: string[]) => a.length === b.length && new Set(a).size === a.length && a.every((x) => b.includes(x))
    const fields: string[] = []
    const groupIds = order.groups.map((g) => g.id)
    const serviceIds = order.groups.flatMap((g) => g.serviceIds)
    if (
      !sameSet(
        groupIds,
        groups.map((g) => g.id),
      )
    )
      fields.push('groups')
    if (
      !sameSet(
        serviceIds,
        rows.map((s) => s.id),
      )
    )
      fields.push('serviceIds')
    if (fields.length) throw invalidFields(fields)
    // two statements, whatever the menu's size
    if (groupIds.length) {
      const groupPlaces = sql.join(
        order.groups.map((g, i) => sql`(${g.id}::uuid, ${i}::int)`),
        sql`, `,
      )
      await tx.execute(
        sql`update ${serviceGroups} set sort = v.sort from (values ${groupPlaces}) as v(id, sort) where ${serviceGroups.id} = v.id`,
      )
    }
    if (serviceIds.length) {
      const servicePlaces = sql.join(
        order.groups.flatMap((g) => g.serviceIds.map((id, j) => sql`(${id}::uuid, ${g.id}::uuid, ${j}::int)`)),
        sql`, `,
      )
      await tx.execute(
        sql`update ${services} set group_id = v.group_id, sort = v.sort from (values ${servicePlaces}) as v(id, group_id, sort) where ${services.id} = v.id`,
      )
    }
    await emit(tx, { type: 'business.updated', businessId })
    return menuOf(tx, businessId, deps.now())
  })
}

/** A service of a whole menu given at once (`setMenu`): one already on it by `id`, or a new one. */
export type PlannedService = { id?: string; name?: Localized; durationMin: number; priceType: PriceType; priceAmount: number }
export type PlannedGroup = { id?: string; name?: Localized; services: PlannedService[] }

/**
 * The whole menu as given, in its order (the setup wizard's services step, B-04): a group or service given by `id`
 * stays itself, keeping what the step doesn't show (a description, its own buffer, online, who does it) and its name
 * unless one comes; a new one needs its name, and a new service is done by `doers`; what isn't given goes, its
 * bookings keeping their copies. `invalid` with the given places for an id that isn't on the menu or comes twice.
 */
export async function setMenu(
  db: Queryable,
  businessId: string,
  plan: PlannedGroup[],
  doers: readonly string[],
  now: number,
): Promise<Menu> {
  await lockMenu(db, businessId)
  const [groups, rows] = await all(db, [
    () => db.select({ id: serviceGroups.id }).from(serviceGroups).where(eq(serviceGroups.businessId, businessId)),
    () => db.select({ id: services.id }).from(services).where(onMenu(businessId)),
  ])
  const issues: Issue[] = []
  const known = (on: { id: string }[]) => {
    const ids = new Set(on.map((r) => r.id))
    const seen = new Set<string>()
    return (id: string | undefined, path: (string | number)[]) => {
      if (id === undefined) return
      if (!ids.has(id) || seen.has(id)) issues.push({ path: [...path, 'id'], code: 'invalid' })
      seen.add(id)
    }
  }
  const groupKnown = known(groups)
  const serviceKnown = known(rows)
  plan.forEach((g, gi) => {
    groupKnown(g.id, ['groups', gi])
    g.services.forEach((s, si) => serviceKnown(s.id, ['groups', gi, 'services', si]))
  })
  if (issues.length) throw invalid(...issues)

  // what isn't given goes: the services first (a group holds them), then the groups
  const keptServices = plan.flatMap((g) => g.services.flatMap((s) => (s.id ? [s.id] : [])))
  const keptGroups = plan.flatMap((g) => (g.id ? [g.id] : []))
  await db
    .delete(services)
    .where(and(eq(services.businessId, businessId), keptServices.length ? notInArray(services.id, keptServices) : undefined))
  await db
    .delete(serviceGroups)
    .where(and(eq(serviceGroups.businessId, businessId), keptGroups.length ? notInArray(serviceGroups.id, keptGroups) : undefined))

  const placed = plan.map((g) => ({ ...g, id: g.id ?? randomUUID(), fresh: !g.id }))
  const fresh = placed.filter((g) => g.fresh)
  if (fresh.length)
    await db.insert(serviceGroups).values(fresh.map((g) => ({ id: g.id, businessId, name: g.name ?? {}, sort: placed.indexOf(g) })))
  for (const [sort, g] of placed.entries())
    if (!g.fresh)
      await db
        .update(serviceGroups)
        .set({ sort, ...(g.name && { name: g.name }) })
        .where(eq(serviceGroups.id, g.id))

  const made: string[] = []
  const newRows = placed.flatMap((g) =>
    g.services.flatMap((s, i) => {
      if (s.id) return []
      const id = randomUUID()
      made.push(id)
      const { durationMin, priceType, priceAmount } = s
      return [{ id, businessId, groupId: g.id, name: s.name ?? {}, durationMin, priceType, priceAmount, sort: i }]
    }),
  )
  if (newRows.length) await db.insert(services).values(newRows)
  for (const g of placed)
    for (const [sort, s] of g.services.entries()) {
      if (!s.id) continue
      const { durationMin, priceType, priceAmount } = s
      await db
        .update(services)
        .set({ groupId: g.id, sort, durationMin, priceType, priceAmount, ...(s.name && { name: s.name }) })
        .where(eq(services.id, s.id))
    }
  if (made.length && doers.length) {
    await db.insert(staffServices).values(doers.flatMap((staffId) => made.map((serviceId) => ({ staffId, serviceId }))))
    await bookableAgain(db, doers)
  }
  await emit(db, { type: 'business.updated', businessId })
  return menuOf(db, businessId, now)
}
