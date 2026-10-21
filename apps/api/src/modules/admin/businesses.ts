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
import { and, asc, count, desc, eq, ilike, inArray, isNotNull, isNull, or, sql, type SQL } from 'drizzle-orm'
import type { Queryable } from '../../db/client'
import { adminActions, admins, businesses, categories, services, staff, users, verificationHistory } from '../../db/schema'
import type { Deps } from '../../deps'
import type { Admin } from '../../http/env'
import { ApiError } from '../../http/errors'
import { emit, queueSms } from '../../notify'
import { cityRefOf, loadCities } from '../catalog/cities'
import { photoOf, text } from '../catalog/map'
import { likeOf } from '../catalog/search'
import { recordAction } from './accounts'

/** A list holds this many at most: the newest, or the longest waiting. */
export const ADMIN_LIST_MAX = 200

type BusinessRow = typeof businesses.$inferSelect

const finished = isNull(businesses.setupStep)
const VIEWS: Record<AdminBusinessView, { where: SQL; order: SQL[] }> = {
  // finished and waiting, the longest waiting first
  review: {
    where: and(finished, eq(businesses.verification, 'pending'))!,
    order: [asc(sql`coalesce(${businesses.sentForReviewAt}, ${businesses.createdAt})`)],
  },
  // a verified business that moved, to check again (Q-215)
  moved: {
    where: and(eq(businesses.verification, 'verified'), isNotNull(businesses.addressChangedAt))!,
    order: [asc(businesses.addressChangedAt)],
  },
  rejected: { where: and(finished, eq(businesses.verification, 'rejected'))!, order: [desc(businesses.createdAt)] },
  hidden: { where: isNotNull(businesses.hiddenAt), order: [desc(businesses.hiddenAt)] },
  verified: { where: eq(businesses.verification, 'verified'), order: [desc(businesses.createdAt)] },
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

async function rowOf(db: Queryable, id: string, lock = false): Promise<BusinessRow> {
  const found = db.select().from(businesses).where(eq(businesses.id, id))
  const [row] = await (lock ? found.for('no key update') : found)
  // a draft isn't the team's to check until it's finished (book Q-200)
  if (!row || row.setupStep) throw new ApiError('not_found')
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

type Told = 'verified' | 'rejected' | 'hidden' | 'shown'
const SMS_KEY = { verified: 'pageVerified', rejected: 'pageRejected', hidden: 'pageHidden', shown: 'pageShown' } as const

/**
 * "Ýeral: barlag we täzelikler" (business spec §16; chapter 8): the workspace's screens hear it at once, and the owner
 * gets an SMS in their language that waits for the morning at night (Q-279).
 */
async function tellOwner(tx: Queryable, deps: Pick<Deps, 'now' | 'site'>, b: BusinessRow, told: Told, reason?: string) {
  await emit(tx, { type: 'business.reviewed', businessId: b.id })
  const [owner] = await ownerOf(tx, [b.id])
  if (!owner) return
  const t = createT(owner.lang)
  const link = told === 'rejected' ? deps.site.urls.business : `${deps.site.urls.client}/b/${b.slug}`
  await queueSms(tx, {
    to: owner.phone,
    text: t(`sms.${SMS_KEY[told]}`, { brand: t('common.brand'), business: b.name, reason: reason ?? '', link }),
    runAt: new Date(businessSmsAt(deps.now())),
  })
}

/**
 * Verified (S-17): public in search, at its link and among similar places, and the owner told. A verified business that
 * moved is checked again the same way: it stays public, and nobody is told.
 */
export async function verifyBusiness(deps: Deps, by: Admin, id: string): Promise<void> {
  await deps.db.transaction(async (tx) => {
    const b = await rowOf(tx, id, true)
    const recheck = b.verification === 'verified'
    if (recheck && !b.addressChangedAt) throw new ApiError('invalid_status')
    await tx
      .update(businesses)
      .set({ verification: 'verified', verificationReason: null, addressChangedAt: null })
      .where(eq(businesses.id, b.id))
    await recordAction(tx, by, recheck ? 'business.move_checked' : 'business.verified', { businessId: b.id })
    await emit(tx, { type: 'business.updated', businessId: b.id })
    if (recheck) return
    await tx.insert(verificationHistory).values({ businessId: b.id, status: 'verified', at: new Date(deps.now()) })
    await tellOwner(tx, deps, b, 'verified')
  })
}

/**
 * Sent back with a reason (Q-274): visitors see "Bu sahypa entek açylmady", the owner the reason and a way to send it
 * again. A live business sent back is un-verified (Q-275).
 */
export async function rejectBusiness(deps: Deps, by: Admin, id: string, reason: string): Promise<void> {
  await deps.db.transaction(async (tx) => {
    const b = await rowOf(tx, id, true)
    if (b.verification === 'rejected') throw new ApiError('invalid_status')
    await tx
      .update(businesses)
      .set({ verification: 'rejected', verificationReason: reason, addressChangedAt: null })
      .where(eq(businesses.id, b.id))
    await tx.insert(verificationHistory).values({ businessId: b.id, status: 'rejected', reason, at: new Date(deps.now()) })
    await recordAction(tx, by, b.verification === 'verified' ? 'business.unverified' : 'business.rejected', { businessId: b.id, reason })
    await emit(tx, { type: 'business.updated', businessId: b.id })
    await tellOwner(tx, deps, b, 'rejected', reason)
  })
}

/**
 * Hidden (Q-012): out of search and its page closed to visitors, with a reason to the owner; its bookings stay, and its
 * team keeps working. Shown again when the team says so.
 */
export async function hideBusiness(deps: Deps, by: Admin, id: string, reason: string): Promise<void> {
  await deps.db.transaction(async (tx) => {
    const b = await rowOf(tx, id, true)
    if (b.hiddenAt) throw new ApiError('invalid_status')
    await tx
      .update(businesses)
      .set({ hiddenAt: new Date(deps.now()), hiddenReason: reason })
      .where(eq(businesses.id, b.id))
    await recordAction(tx, by, 'business.hidden', { businessId: b.id, reason })
    await emit(tx, { type: 'business.updated', businessId: b.id })
    await tellOwner(tx, deps, b, 'hidden', reason)
  })
}

export async function showBusiness(deps: Deps, by: Admin, id: string): Promise<void> {
  await deps.db.transaction(async (tx) => {
    const b = await rowOf(tx, id, true)
    if (!b.hiddenAt) throw new ApiError('invalid_status')
    await tx.update(businesses).set({ hiddenAt: null, hiddenReason: null }).where(eq(businesses.id, b.id))
    await recordAction(tx, by, 'business.shown', { businessId: b.id })
    await emit(tx, { type: 'business.updated', businessId: b.id })
    await tellOwner(tx, deps, b, 'shown')
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
