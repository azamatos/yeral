/**
 * The admin tool's businesses (book F-179, S-17, B-11; Q-274, Q-275, Q-276, Q-012, Q-215): the queue to review, a
 * business to check, verified or sent back with a reason (a live one too: that un-verifies it), hidden from visitors
 * with a reason and shown again, a move checked. Each change is written down (`admin_actions`) and the owner hears it:
 * the workspace's screens at once, and a Ýeral SMS that never goes at night.
 */
import type { AdminBusiness, AdminBusinessItem, AdminBusinessView } from '@yeral/contract/admin'
import { businessSmsAt } from '@yeral/domain/lifecycle'
import type { Locale } from '@yeral/domain/model'
import { createT } from '@yeral/i18n/fmt'
import { addDays, epochOf, today } from '@yeral/domain/time'
import { and, asc, count, desc, eq, gte, ilike, inArray, isNotNull, isNull, lte, or, sql, type SQL } from 'drizzle-orm'
import type { Queryable } from '../../db/client'
import {
  adminActions,
  admins,
  bookings,
  businesses,
  categories,
  invites,
  jobs,
  services,
  staff,
  users,
  verificationHistory,
} from '../../db/schema'
import type { Deps } from '../../deps'
import type { Admin } from '../../http/env'
import { ApiError } from '../../http/errors'
import { emit, queueSms } from '../../notify'
import { cancelForBusiness, dropPendingMove } from '../bookings/engine'
import { lockBooking, StaleBooking } from '../bookings/repo'
import { teamChanged } from '../team/service'
import { cityRefOf, loadCities } from '../catalog/cities'
import { isPublic, photoOf, publicRow, text } from '../catalog/map'
import { likeOf } from '../catalog/search'
import { holdActor, recordAction } from './accounts'

/** A list holds this many at most: the newest, or the longest waiting. */
export const ADMIN_LIST_MAX = 200

type BusinessRow = typeof businesses.$inferSelect

const finished = isNull(businesses.setupStep)
const open = isNull(businesses.closedAt)
const VIEWS: Record<AdminBusinessView, { where: SQL; order: SQL[] }> = {
  // finished and waiting, the longest waiting first
  review: {
    where: and(finished, open, eq(businesses.verification, 'pending'))!,
    order: [asc(sql`coalesce(${businesses.sentForReviewAt}, ${businesses.createdAt})`)],
  },
  // a verified business that moved, to check again (Q-215)
  moved: {
    where: and(open, eq(businesses.verification, 'verified'), isNotNull(businesses.addressChangedAt))!,
    order: [asc(businesses.addressChangedAt)],
  },
  rejected: { where: and(finished, open, eq(businesses.verification, 'rejected'))!, order: [desc(businesses.createdAt)] },
  hidden: { where: and(open, isNotNull(businesses.hiddenAt))!, order: [desc(businesses.hiddenAt)] },
  verified: { where: isPublic(), order: [desc(businesses.createdAt)] },
  closed: { where: isNotNull(businesses.closedAt), order: [desc(businesses.closedAt)] },
  // every finished business: a search across them
  all: { where: finished, order: [desc(businesses.createdAt)] },
}

/** The owner as the team reaches them: the account's phone. */
const ownerOf = (db: Queryable, ids: string[]) =>
  ids.length
    ? db
        .select({ businessId: staff.businessId, name: users.name, surname: users.surname, phone: users.phone, lang: users.lang })
        .from(staff)
        .innerJoin(users, eq(users.id, staff.userId))
        .where(and(inArray(staff.businessId, ids), eq(staff.level, 'owner'), eq(staff.status, 'active')))
    : Promise.resolve([])

async function itemsOf(db: Queryable, rows: BusinessRow[], lang: Locale): Promise<AdminBusinessItem[]> {
  const [owners, cityRows, kinds] = [
    await ownerOf(
      db,
      rows.map((r) => r.id),
    ),
    await loadCities(db),
    await db.select().from(categories),
  ]
  return rows.map((b) => {
    const owner = owners.find((o) => o.businessId === b.id)
    return {
      id: b.id,
      slug: b.slug,
      name: b.name,
      category: { id: b.categoryId, name: text(kinds.find((k) => k.id === b.categoryId)?.name, lang) },
      city: cityRefOf(cityRows, b.cityId, lang),
      address: b.address,
      phone: b.phone,
      owner: owner ? { name: [owner.name, owner.surname].filter(Boolean).join(' ') || null, phone: owner.phone } : null,
      verification: b.verification,
      reason: b.verificationReason,
      hidden: b.hiddenAt ? { at: b.hiddenAt.getTime(), reason: b.hiddenReason ?? '' } : null,
      closed: b.closedAt ? { at: b.closedAt.getTime(), reason: b.closedReason ?? '' } : null,
      addressChangedAt: b.addressChangedAt?.getTime() ?? null,
      sentForReviewAt: (b.sentForReviewAt ?? b.createdAt).getTime(),
      createdAt: b.createdAt.getTime(),
    }
  })
}

/** A list of the admin tool: the queue to review, moves to check, the sent back, the hidden, the live, all; `q` searches. */
export async function adminBusinesses(db: Queryable, query: { view: AdminBusinessView; q?: string; lang: Locale }) {
  const view = VIEWS[query.view]
  const q = query.q?.trim()
  const rows = await db
    .select()
    .from(businesses)
    .where(
      and(
        view.where,
        q ? or(ilike(businesses.name, likeOf(q)), ilike(businesses.slug, likeOf(q)), ilike(businesses.phone, likeOf(q))) : undefined,
      ),
    )
    .orderBy(...view.order, asc(businesses.id))
    .limit(ADMIN_LIST_MAX)
  return itemsOf(db, rows, query.lang)
}

async function rowOf(db: Queryable, id: string, lock = false, opts: { closed?: boolean } = {}): Promise<BusinessRow> {
  const found = db.select().from(businesses).where(eq(businesses.id, id))
  const [row] = await (lock ? found.for('no key update') : found)
  // a draft isn't the team's to check until it's finished (book Q-200)
  if (!row || row.setupStep) throw new ApiError('not_found')
  // a closed business is only to look at, or to open again
  if (lock && row.closedAt && !opts.closed) throw new ApiError('invalid_status')
  return row
}

/** What the team checks before verifying (Q-276): the phone to call, the name, the address on the map, the category, the photos. */
export async function adminBusiness(deps: Deps, id: string, lang: Locale): Promise<AdminBusiness> {
  const { db } = deps
  const b = await rowOf(db, id)
  const [item] = await itemsOf(db, [b], lang)
  const [[menu], [team], history, actions] = [
    await db
      .select({ n: count() })
      .from(services)
      .where(and(eq(services.businessId, b.id), eq(services.archived, false))),
    await db
      .select({ n: count() })
      .from(staff)
      .where(and(eq(staff.businessId, b.id), eq(staff.status, 'active'))),
    await db.select().from(verificationHistory).where(eq(verificationHistory.businessId, b.id)).orderBy(desc(verificationHistory.at)),
    await db
      .select({ action: adminActions.action, by: admins.name, reason: adminActions.reason, at: adminActions.at })
      .from(adminActions)
      .leftJoin(admins, eq(admins.id, adminActions.adminId))
      .where(eq(adminActions.businessId, b.id))
      .orderBy(desc(adminActions.at)),
  ]
  return {
    ...item!,
    about: b.about,
    location: { lat: b.lat, lng: b.lng },
    floor: b.floor,
    entranceNote: b.entranceNote,
    hideExactAddress: b.hideExactAddress,
    photos: b.photos.map((p) => photoOf(deps, p, lang, b.name)),
    services: menu?.n ?? 0,
    team: team?.n ?? 0,
    history: history.map((h) => ({ status: h.status, reason: h.reason, at: h.at.getTime() })),
    actions: actions.map((a) => ({ action: a.action, by: a.by, reason: a.reason, at: a.at.getTime() })),
  }
}

type Told = 'verified' | 'rejected' | 'hidden' | 'shown' | 'closed' | 'reopened'
const SMS_KEY = {
  verified: 'pageVerified',
  rejected: 'pageRejected',
  hidden: 'pageHidden',
  shown: 'pageShown',
  closed: 'pageClosed',
  reopened: 'pageReopened',
} as const

/** The reason as an SMS carries it: the start of a long one (the workspace shows it whole). */
const smsReason = (reason: string) => (reason.length > SMS_REASON_MAX ? `${reason.slice(0, SMS_REASON_MAX - 1).trimEnd()}…` : reason)
export const SMS_REASON_MAX = 120
/** Links as booking SMS carry them, without the scheme. */
const bare = (url: string) => url.replace(/^https?:\/\//, '')

/**
 * "Ýeral: barlag we täzelikler" (business spec §16; chapter 8): the workspace's screens hear it at once, and the owner
 * gets an SMS in their language that waits for the morning at night (Q-279; one waiting is replaced by the next, so
 * the morning brings only the last word). `sms: false`: the screens only (a page verified or shown while it still
 * isn't public).
 */
async function tellOwner(
  tx: Queryable,
  deps: Pick<Deps, 'now' | 'site'>,
  b: BusinessRow,
  told: Told,
  o: { reason?: string; sms?: boolean } = {},
) {
  await emit(tx, { type: 'business.reviewed', businessId: b.id })
  const [owner] = await ownerOf(tx, [b.id])
  if (!owner || o.sms === false) return
  const t = createT(owner.lang)
  const link = bare(told === 'rejected' || told === 'reopened' ? deps.site.urls.business : `${deps.site.urls.client}/b/${b.slug}`)
  const runAt = businessSmsAt(deps.now())
  const dedupeKey = `business-review:${b.id}:${runAt}`
  await tx
    .delete(jobs)
    .where(
      and(eq(jobs.dedupeKey, dedupeKey), isNull(jobs.doneAt), or(isNull(jobs.lockedUntil), lte(jobs.lockedUntil, new Date(deps.now())))),
    )
  await queueSms(tx, {
    to: owner.phone,
    text: t(`sms.${SMS_KEY[told]}`, { brand: t('common.brand'), business: b.name, reason: smsReason(o.reason ?? ''), link }),
    runAt: new Date(runAt),
    dedupeKey,
  })
}

/**
 * Verified (S-17): public in search, at its link and among similar places, and the owner told. A verified business that
 * moved is checked again the same way: it stays public, and nobody is told; `moved` is the move the team looked at
 * (its `addressChangedAt`), so a newer one isn't checked by mistake.
 */
export async function verifyBusiness(deps: Deps, by: Admin, id: string, moved?: number): Promise<void> {
  await deps.db.transaction(async (tx) => {
    await holdActor(tx, by)
    const b = await rowOf(tx, id, true)
    const recheck = b.verification === 'verified'
    if (recheck && (!b.addressChangedAt || b.addressChangedAt.getTime() !== moved)) throw new ApiError('invalid_status')
    await tx
      .update(businesses)
      .set({ verification: 'verified', verificationReason: null, addressChangedAt: null })
      .where(eq(businesses.id, b.id))
    await recordAction(tx, by, recheck ? 'business.move_checked' : 'business.verified', { businessId: b.id })
    await emit(tx, { type: 'business.updated', businessId: b.id })
    if (recheck) return
    await tx.insert(verificationHistory).values({ businessId: b.id, status: 'verified', at: new Date(deps.now()) })
    // still hidden: "is open" waits for it to be shown
    await tellOwner(tx, deps, b, 'verified', { sms: publicRow({ ...b, verification: 'verified' }) })
  })
}

/**
 * Sent back with a reason (Q-274): visitors see "Bu sahypa entek açylmady", the owner the reason and a way to send it
 * again. A live business sent back is un-verified (Q-275).
 */
export async function rejectBusiness(deps: Deps, by: Admin, id: string, reason: string): Promise<void> {
  await deps.db.transaction(async (tx) => {
    await holdActor(tx, by)
    const b = await rowOf(tx, id, true)
    if (b.verification === 'rejected') throw new ApiError('invalid_status')
    await tx
      .update(businesses)
      .set({ verification: 'rejected', verificationReason: reason, addressChangedAt: null })
      .where(eq(businesses.id, b.id))
    await tx.insert(verificationHistory).values({ businessId: b.id, status: 'rejected', reason, at: new Date(deps.now()) })
    await recordAction(tx, by, b.verification === 'verified' ? 'business.unverified' : 'business.rejected', { businessId: b.id, reason })
    await emit(tx, { type: 'business.updated', businessId: b.id })
    await tellOwner(tx, deps, b, 'rejected', { reason })
  })
}

/**
 * Hidden (Q-012): out of search and its page closed to visitors, with a reason to the owner; its bookings stay, and its
 * team keeps working. Shown again when the team says so.
 */
export async function hideBusiness(deps: Deps, by: Admin, id: string, reason: string): Promise<void> {
  await deps.db.transaction(async (tx) => {
    await holdActor(tx, by)
    const b = await rowOf(tx, id, true)
    if (b.hiddenAt) throw new ApiError('invalid_status')
    await tx
      .update(businesses)
      .set({ hiddenAt: new Date(deps.now()), hiddenReason: reason })
      .where(eq(businesses.id, b.id))
    await recordAction(tx, by, 'business.hidden', { businessId: b.id, reason })
    await emit(tx, { type: 'business.updated', businessId: b.id })
    await tellOwner(tx, deps, b, 'hidden', { reason })
  })
}

export async function showBusiness(deps: Deps, by: Admin, id: string): Promise<void> {
  await deps.db.transaction(async (tx) => {
    await holdActor(tx, by)
    const b = await rowOf(tx, id, true)
    if (!b.hiddenAt) throw new ApiError('invalid_status')
    await tx.update(businesses).set({ hiddenAt: null, hiddenReason: null }).where(eq(businesses.id, b.id))
    await recordAction(tx, by, 'business.shown', { businessId: b.id })
    await emit(tx, { type: 'business.updated', businessId: b.id })
    // not verified: "open again" waits for the verification
    await tellOwner(tx, deps, b, 'shown', { sms: publicRow({ ...b, hiddenAt: null }) })
  })
}

/** The owner sends a business back for review after fixing what the reason said (Q-274): in the queue again. */
export async function sendForReview(deps: Pick<Deps, 'db' | 'now'>, businessId: string): Promise<void> {
  await deps.db.transaction(async (tx) => {
    const b = await rowOf(tx, businessId, true)
    if (b.verification !== 'rejected') throw new ApiError('invalid_status')
    const at = new Date(deps.now())
    await tx
      .update(businesses)
      .set({ verification: 'pending', verificationReason: null, sentForReviewAt: at })
      .where(eq(businesses.id, b.id))
    await tx.insert(verificationHistory).values({ businessId: b.id, status: 'pending', at })
    await emit(tx, { type: 'business.updated', businessId: b.id })
  })
}

/**
 * Closed as its owner asked (Q-213): hidden from everyone and out of its team's switcher; its bookings ahead and waiting
 * requests cancelled ("The business has closed"), each client told by SMS; its open invites cancelled; everything else
 * kept. The business row first, then its bookings, bookings before their move requests: every path's order.
 */
export async function closeBusiness(deps: Deps, by: Admin, id: string, reason: string): Promise<{ cancelled: number }> {
  return deps.db.transaction(async (tx) => {
    await holdActor(tx, by)
    const b = await rowOf(tx, id, true)
    const at = new Date(deps.now())
    await tx.update(businesses).set({ closedAt: at, closedReason: reason }).where(eq(businesses.id, b.id))
    const now = at.getTime()
    // read plainly, then each booking held before its move, the order every path takes them in
    const rows = await tx
      .select()
      .from(bookings)
      .where(
        and(eq(bookings.businessId, b.id), inArray(bookings.status, ['pending', 'confirmed']), gte(bookings.date, addDays(today(now), -1))),
      )
      .orderBy(asc(bookings.id))
    const ahead = (r: typeof bookings.$inferSelect) =>
      (r.status === 'pending' || r.status === 'confirmed') && epochOf(r.date, r.start) > now
    const originals = rows.filter((r) => !r.rescheduleOf && ahead(r))
    let cancelled = 0
    for (const r of originals) {
      const row = await lockBooking(tx, r.id)
      if (!ahead(row)) continue
      try {
        // a move it has waiting goes with it (`dropPendingMove`)
        await cancelForBusiness(tx, row, at, { reason: 'business_closed', text: null })
        cancelled++
      } catch (e) {
        // one the jobs settled meanwhile
        if (!(e instanceof StaleBooking)) throw e
      }
    }
    // a move asked of a booking under way or over: withdrawn as the business's, its booking as it is
    const taken = new Set(originals.map((r) => r.id))
    for (const m of rows.filter((r) => r.rescheduleOf && !taken.has(r.rescheduleOf)))
      await dropPendingMove(tx, await lockBooking(tx, m.rescheduleOf!), at, 'business')
    const dropped = await tx
      .update(invites)
      .set({ status: 'cancelled', answeredAt: at })
      .where(and(eq(invites.businessId, b.id), eq(invites.status, 'pending')))
      .returning({ phone: invites.phone })
    // the invitees' cards go
    for (const phone of new Set(dropped.map((d) => d.phone))) await teamChanged(tx, b.id, { phone })
    await recordAction(tx, by, 'business.closed', { businessId: b.id, reason, details: { cancelled } })
    await emit(tx, { type: 'business.updated', businessId: b.id })
    // out of the switcher
    await emit(tx, { type: 'team.changed', businessId: b.id })
    await tellOwner(tx, deps, b, 'closed')
    return { cancelled }
  })
}

/** Opened again (a closing by mistake, an owner back): in its team's switcher, and public as before; cancelled bookings stay so. */
export async function reopenBusiness(deps: Deps, by: Admin, id: string): Promise<void> {
  await deps.db.transaction(async (tx) => {
    await holdActor(tx, by)
    const b = await rowOf(tx, id, true, { closed: true })
    if (!b.closedAt) throw new ApiError('invalid_status')
    // its owner let their account go meanwhile: nobody to open it to
    if (!(await ownerOf(tx, [b.id])).length) throw new ApiError('invalid_status')
    await tx.update(businesses).set({ closedAt: null, closedReason: null }).where(eq(businesses.id, b.id))
    await recordAction(tx, by, 'business.reopened', { businessId: b.id })
    await emit(tx, { type: 'business.updated', businessId: b.id })
    await emit(tx, { type: 'team.changed', businessId: b.id })
    await tellOwner(tx, deps, b, 'reopened')
  })
}
