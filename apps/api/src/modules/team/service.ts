/**
 * The team behind the routes (book chapter 3; ADR 0025): workspace access, invites, rows on the team and the
 * switcher's request counts.
 */
import type { InviteCard, TeamMember, Workspace } from '@yeral/contract/team'
import type { Locale } from '@yeral/domain/model'
import { canAnswerRequest, type Actor } from '@yeral/domain/permissions'
import { inviteExpiresAt, inviteState } from '@yeral/domain/team'
import type { SiteConfig } from '@yeral/lib/site'
import { and, asc, desc, eq, inArray, or } from 'drizzle-orm'
import type { Context } from 'hono'
import type { Queryable } from '../../db/client'
import { bookingRules, bookings, businesses, invites, services, staff, staffServices, users } from '../../db/schema'
import type { Deps } from '../../deps'
import { ApiError, invalid } from '../../http/errors'
import type { AppEnv, User } from '../../http/env'
import { randomToken, sha256Hex } from '../../lib/crypto'
import { emit } from '../../notify'
import { requireUser } from '../auth/session'
import { cityRefOf, loadCities } from '../catalog/cities'
import { photoOf, text } from '../catalog/map'
import { signsIn } from './members'
import { awaitingAnswer } from '../bookings/repo'
import { answerFacts, requestItems } from '../requests/service'

export type StaffRow = typeof staff.$inferSelect
export type BusinessRow = typeof businesses.$inferSelect
export type InviteRow = typeof invites.$inferSelect

export const actorOf = (row: StaffRow): Actor => ({ level: row.level, staffId: row.id, canAnswerOwn: row.canAnswerOwn })

/** The signed-in person's row on this workspace's team; a workspace they aren't on is "not found". */
export async function requireMember(c: Context<AppEnv>, slug: string) {
  const user = requireUser(c)
  const [row] = await c.var.deps.db
    .select({ business: businesses, member: staff })
    .from(staff)
    .innerJoin(businesses, eq(businesses.id, staff.businessId))
    .where(and(eq(businesses.slug, slug), eq(staff.userId, user.id), signsIn))
  if (!row) throw new ApiError('not_found')
  return { user, business: row.business, member: row.member, actor: actorOf(row.member) }
}

/** A row on this workspace's team, by id. */
export async function teamRow(db: Queryable, businessId: string, staffId: string): Promise<StaffRow> {
  const [row] = await db
    .select()
    .from(staff)
    .where(and(eq(staff.id, staffId), eq(staff.businessId, businessId)))
  if (!row) throw new ApiError('not_found')
  return row
}

/**
 * Tells the team's open screens, and the person concerned (an invitee, someone removed), that the team changed: the
 * events feed gives `team.changed` to everyone on the team and to that account.
 */
export async function teamChanged(db: Queryable, businessId: string, person?: { userId?: string | null; phone?: string | null }) {
  let userId = person?.userId ?? null
  if (!userId && person?.phone)
    [{ id: userId } = { id: null }] = await db.select({ id: users.id }).from(users).where(eq(users.phone, person.phone))
  await emit(db, { type: 'team.changed', businessId, userId })
}

/** The invite's link for the owner to copy: the business app's invite page. */
export const inviteLink = (site: SiteConfig, token: string) => `${site.urls.business}/invite/${token}`

/**
 * A new invite for a row: any open one for this phone is cancelled first (an expired invite is still `pending`), so
 * resending gives a new link and a new 7 days.
 */
export async function issueInvite(
  db: Queryable,
  now: number,
  x: { businessId: string; staffId: string; phone: string; invitedBy: string },
): Promise<{ invite: InviteRow; token: string }> {
  await db
    .update(invites)
    .set({ status: 'cancelled', answeredAt: new Date(now) })
    .where(and(eq(invites.businessId, x.businessId), eq(invites.phone, x.phone), eq(invites.status, 'pending')))
  const token = randomToken()
  const [invite] = await db
    .insert(invites)
    .values({
      ...x,
      tokenHash: await sha256Hex(token),
      sentAt: new Date(now),
      expiresAt: new Date(inviteExpiresAt(now)),
    })
    .returning()
  if (!invite) throw new Error('invite insert failed')
  return { invite, token }
}

/** Is this phone (or the account behind it) already on the team, or invited? A removed row can be reused. */
export async function rowsForPhone(
  db: Queryable,
  businessId: string,
  phone: string,
): Promise<{ rows: StaffRow[]; accountId: string | null }> {
  const [account] = await db.select({ id: users.id }).from(users).where(eq(users.phone, phone))
  const rows = await db
    .select()
    .from(staff)
    .where(
      and(eq(staff.businessId, businessId), account ? or(eq(staff.phone, phone), eq(staff.userId, account.id)) : eq(staff.phone, phone)),
    )
  return { rows, accountId: account?.id ?? null }
}

/**
 * The removed row an invite to this phone can bring back: the one of the account behind the phone, or one without an
 * account. A row linked to another account (a number that changed hands) stays theirs: it keeps blocking their time.
 */
export const reusableRow = (rows: StaffRow[], accountId: string | null): StaffRow | undefined =>
  rows.find((r) => r.status === 'removed' && accountId !== null && r.userId === accountId) ??
  rows.find((r) => r.status === 'removed' && r.userId === null)

/** Has the person behind this row joined (accepted, with the app)? An invited row hasn't, whatever it's linked to. */
export const hasJoined = (row: StaffRow) => row.status !== 'invited' && !!row.userId && row.hasApp

/** Links a row to the services it does (all of them this business's); any makes the row bookable. */
export async function setServices(db: Queryable, businessId: string, staffId: string, serviceIds: readonly string[]): Promise<void> {
  if (serviceIds.length) {
    const own = await db
      .select({ id: services.id })
      .from(services)
      .where(and(eq(services.businessId, businessId), inArray(services.id, [...serviceIds])))
    if (own.length !== serviceIds.length)
      throw invalid(
        ...serviceIds.flatMap((id, i) => (own.some((s) => s.id === id) ? [] : [{ path: ['serviceIds', i], code: 'not_found' }])),
      )
  }
  await db.delete(staffServices).where(eq(staffServices.staffId, staffId))
  if (serviceIds.length) await db.insert(staffServices).values(serviceIds.map((serviceId) => ({ staffId, serviceId })))
}

export async function hasServices(db: Queryable, staffId: string): Promise<boolean> {
  const [row] = await db.select({ id: staffServices.serviceId }).from(staffServices).where(eq(staffServices.staffId, staffId)).limit(1)
  return !!row
}

/** The latest invite of each row (to show "pending until …", "expired", "declined" on the team list). */
async function latestInvites(db: Queryable, staffIds: string[]): Promise<Map<string, InviteRow>> {
  if (!staffIds.length) return new Map()
  const rows = await db
    .selectDistinctOn([invites.staffId])
    .from(invites)
    .where(inArray(invites.staffId, staffIds))
    .orderBy(invites.staffId, desc(invites.sentAt))
  return new Map(rows.map((r) => [r.staffId, r]))
}

const inviteSummary = (i: InviteRow | undefined, now: number) =>
  i
    ? {
        id: i.id,
        state: inviteState({ status: i.status, expiresAt: i.expiresAt.getTime() }, now),
        sentAt: i.sentAt.getTime(),
        expiresAt: i.expiresAt.getTime(),
      }
    : null

export function toMember(row: StaffRow, invite: InviteRow | undefined, lang: Locale, now: number): TeamMember {
  const joined = hasJoined(row)
  return {
    id: row.id,
    name: row.name,
    fullName: row.fullName,
    specialization: row.specialization ? text(row.specialization, lang) || null : null,
    phone: row.phone,
    level: row.level,
    status: row.status,
    hasApp: row.hasApp,
    bookable: row.bookable,
    canAnswerOwn: row.canAnswerOwn,
    joined,
    // once someone has joined, their old invite is history
    invite: joined ? null : inviteSummary(invite, now),
  }
}

export async function members(db: Queryable, businessId: string, lang: Locale, now: number): Promise<TeamMember[]> {
  const rows = await db.select().from(staff).where(eq(staff.businessId, businessId)).orderBy(asc(staff.sort), asc(staff.createdAt))
  const latest = await latestInvites(
    db,
    rows.map((r) => r.id),
  )
  return rows.map((r) => toMember(r, latest.get(r.id), lang, now))
}

export async function member(db: Queryable, row: StaffRow, lang: Locale, now: number): Promise<TeamMember> {
  return toMember(row, (await latestInvites(db, [row.id])).get(row.id), lang, now)
}

/** The switcher: every workspace this account works in, with the requests it may answer there. */
export async function workspacesOf(deps: Deps, user: User): Promise<{ items: Workspace[]; current: string | null }> {
  const now = deps.now()
  const rows = await deps.db
    .select({ business: businesses, member: staff })
    .from(staff)
    .innerJoin(businesses, eq(businesses.id, staff.businessId))
    .where(and(eq(staff.userId, user.id), signsIn))
    .orderBy(asc(businesses.name))
  const [counts, cities] = await Promise.all([
    requestCounts(
      deps.db,
      rows.map((r) => ({ businessId: r.business.id, actor: actorOf(r.member) })),
      now,
    ),
    loadCities(deps.db),
  ])
  const items = rows.map(({ business, member }) => ({
    slug: business.slug,
    name: business.name,
    address: business.address,
    city: cityRefOf(cities, business.cityId, user.lang),
    photo: business.photos[0] ? photoOf(deps, business.photos[0], user.lang) : null,
    level: member.level,
    requestsToAnswer: counts.get(business.id) ?? 0,
    lastOpenedAt: member.lastOpenedAt?.getTime() ?? null,
  }))
  const current = [...items].sort((a, b) => (b.lastOpenedAt ?? 0) - (a.lastOpenedAt ?? 0))[0]
  return { items, current: current?.lastOpenedAt ? current.slug : null }
}

/** Requests still waiting (not past their hold) that each actor may answer (book chapter 3, "Who answers"). */
async function requestCounts(db: Queryable, teams: { businessId: string; actor: Actor }[], now: number): Promise<Map<string, number>> {
  const out = new Map<string, number>()
  const ids = teams.map((t) => t.businessId)
  if (!ids.length) return out
  const waiting = await db
    .select({ id: bookings.id, businessId: bookings.businessId })
    .from(bookings)
    .where(and(inArray(bookings.businessId, ids), awaitingAnswer(now)))
  if (!waiting.length) return out
  const items = await requestItems(
    db,
    waiting.map((w) => w.id),
  )
  const rules = await db
    .select({ businessId: bookingRules.businessId, answerers: bookingRules.requestAnswerers })
    .from(bookingRules)
    .where(inArray(bookingRules.businessId, ids))
  const answerersOf = new Map(rules.map((r) => [r.businessId, r.answerers]))
  // each waiting request once, grouped by its business, by the same facts the requests list reads
  const byBusiness = new Map<string, ReturnType<typeof answerFacts>[]>()
  for (const w of waiting)
    byBusiness.set(w.businessId, [...(byBusiness.get(w.businessId) ?? []), answerFacts(items.filter((i) => i.item.bookingId === w.id))])
  for (const { businessId, actor } of teams) {
    const answerers = answerersOf.get(businessId) ?? 'both'
    out.set(businessId, (byBusiness.get(businessId) ?? []).filter((r) => canAnswerRequest(actor, answerers, r)).length)
  }
  return out
}

/** An invite as the invited person sees it. */
export async function inviteCards(deps: Deps, rows: InviteRow[], lang: Locale): Promise<InviteCard[]> {
  if (!rows.length) return []
  const now = deps.now()
  const bizRows = await deps.db
    .select()
    .from(businesses)
    .where(
      inArray(
        businesses.id,
        rows.map((r) => r.businessId),
      ),
    )
  const staffRows = await deps.db
    .select()
    .from(staff)
    .where(
      inArray(
        staff.id,
        rows.map((r) => r.staffId),
      ),
    )
  const cities = await loadCities(deps.db)
  // the sender's name as their team knows it
  const senders = rows.flatMap((r) => (r.invitedBy ? [r.invitedBy] : []))
  const senderRows = senders.length
    ? await deps.db
        .select({ userId: staff.userId, businessId: staff.businessId, name: staff.name })
        .from(staff)
        .where(inArray(staff.userId, senders))
    : []
  return rows.flatMap((r) => {
    const b = bizRows.find((x) => x.id === r.businessId)
    const s = staffRows.find((x) => x.id === r.staffId)
    if (!b || !s) return []
    return [
      {
        id: r.id,
        business: {
          slug: b.slug,
          name: b.name,
          category: text(b.kind, lang),
          address: b.address,
          city: cityRefOf(cities, b.cityId, lang),
          photo: b.photos[0] ? photoOf(deps, b.photos[0], lang) : null,
        },
        invitedBy: senderRows.find((x) => x.userId === r.invitedBy && x.businessId === r.businessId)?.name ?? null,
        level: s.level === 'admin' ? 'admin' : 'specialist',
        state: inviteState({ status: r.status, expiresAt: r.expiresAt.getTime() }, now),
        sentAt: r.sentAt.getTime(),
        expiresAt: r.expiresAt.getTime(),
      },
    ]
  })
}
