/**
 * Business settings (book B-37–B-43): read and change what the owner and administrators set. Each change tells the
 * team's open screens (`business.updated`).
 */
import type {
  bookingRulesSchema,
  bookingRulesUpdateSchema,
  businessProfileSchema,
  businessProfileUpdateSchema,
} from '@yeral/contract/settings'
import { AMENITIES, type Amenity } from '@yeral/domain/model'
import { LATE_MINUTES, rulesErrors, type BookingRules } from '@yeral/domain/rules'
import { eq } from 'drizzle-orm'
import type { z } from 'zod'
import type { Queryable } from '../../db/client'
import { bookingRules, businesses, categories, cities, verificationHistory } from '../../db/schema'
import { ApiError } from '../../http/errors'
import { emit } from '../../notify'
import { toRules } from '../availability/context'

type RulesView = z.infer<typeof bookingRulesSchema>
type RulesChange = z.infer<typeof bookingRulesUpdateSchema>

const viewOf = (r: BookingRules): RulesView => ({ ...r, lateMinutes: LATE_MINUTES })

/** The rules as stored; `lock` holds the row until the change commits, so two saves at once can't answer stale rules. */
async function storedRules(db: Queryable, businessId: string, opts: { lock?: boolean } = {}): Promise<BookingRules> {
  const query = db.select().from(bookingRules).where(eq(bookingRules.businessId, businessId))
  const [row] = opts.lock ? await query.for('update') : await query
  if (!row) throw new ApiError('not_found')
  return toRules(row)
}

export async function rulesOf(db: Queryable, businessId: string): Promise<RulesView> {
  return viewOf(await storedRules(db, businessId))
}

/**
 * Change some of the booking rules (B-41). Only the settings screen's values pass (`rulesErrors`), checked for the
 * fields being changed. Requests already waiting keep their mode and timer (book Q-205): each one stored its own.
 */
export async function updateRules(db: Queryable, businessId: string, change: RulesChange): Promise<RulesView> {
  return db.transaction(async (tx) => {
    const stored = await storedRules(tx, businessId, { lock: true })
    const next = { ...stored, ...change }
    const issues = Object.keys(rulesErrors(next))
      .filter((field) => field in change)
      .map((field) => ({ path: [field], code: 'invalid' }))
    if (issues.length) throw new ApiError('validation_error', { issues })
    // nothing new (an empty save, or the same values): no write, no event
    const changed = Object.entries(change).filter(([field, value]) => stored[field as keyof BookingRules] !== value)
    if (!changed.length) return viewOf(stored)
    await tx.update(bookingRules).set(Object.fromEntries(changed)).where(eq(bookingRules.businessId, businessId))
    await emit(tx, { type: 'business.updated', businessId })
    return viewOf(next)
  })
}

// ── The business profile (B-37) ──

type ProfileView = z.infer<typeof businessProfileSchema>
type ProfileChange = z.infer<typeof businessProfileUpdateSchema>
type BusinessRow = typeof businesses.$inferSelect

const profileView = (b: BusinessRow): ProfileView => ({
  slug: b.slug,
  name: b.name,
  categoryId: b.categoryId,
  about: b.about,
  phone: b.phone,
  amenities: b.amenities.filter((a): a is Amenity => (AMENITIES as readonly string[]).includes(a)),
  womenOnly: b.womenOnly,
  location: { cityId: b.cityId, address: b.address, street: b.street, lat: b.lat, lng: b.lng },
  entranceNote: b.entranceNote,
  hideExactAddress: b.hideExactAddress,
  verification: b.verification,
})

export async function profileOf(db: Queryable, businessId: string): Promise<ProfileView> {
  const [row] = await db.select().from(businesses).where(eq(businesses.id, businessId))
  if (!row) throw new ApiError('not_found')
  return profileView(row)
}

/**
 * Change some of the profile (B-37). A new category keeps the kind of booking (it must offer the business's own), and
 * the card's "what it is" follows it. A new address keeps everything, the page and its verification included, and is
 * noted for the Ýeral team to check again (book Q-215).
 */
export async function updateProfile(db: Queryable, businessId: string, change: ProfileChange): Promise<ProfileView> {
  return db.transaction(async (tx) => {
    const [row] = await tx.select().from(businesses).where(eq(businesses.id, businessId)).for('no key update')
    if (!row) throw new ApiError('not_found')
    const issues: { path: string[]; code: string }[] = []
    const recategorized = change.categoryId !== undefined && change.categoryId !== row.categoryId
    if (recategorized) {
      const [category] = await tx.select().from(categories).where(eq(categories.id, change.categoryId!))
      if (!category?.bookingTypes.includes(row.bookingTypes[0] ?? 'appointment')) issues.push({ path: ['categoryId'], code: 'invalid' })
    }
    if (change.location) {
      const [city] = await tx.select({ id: cities.id }).from(cities).where(eq(cities.id, change.location.cityId))
      if (!city) issues.push({ path: ['location', 'cityId'], code: 'invalid' })
    }
    if (issues.length) throw new ApiError('validation_error', { issues })

    const { location, about, categoryId, ...rest } = change
    const moved =
      !!location &&
      (location.address !== row.address || location.cityId !== row.cityId || location.lat !== row.lat || location.lng !== row.lng)
    const set: Partial<typeof businesses.$inferInsert> = {
      ...rest,
      ...(about ? { about: about } : {}),
      // the card names the new category
      ...(recategorized ? { categoryId, kind: {} } : {}),
      ...location,
    }
    if (!Object.keys(set).length) return profileView(row)
    const [saved] = await tx.update(businesses).set(set).where(eq(businesses.id, businessId)).returning()
    if (moved) await tx.insert(verificationHistory).values({ businessId, status: row.verification, reason: 'address changed' })
    await emit(tx, { type: 'business.updated', businessId })
    return profileView(saved!)
  })
}
