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
import { addressOf, newAddressSince, sameAddress, sameAddressShown } from '@yeral/domain/lifecycle'
import { AMENITIES, type Amenity, type Localized } from '@yeral/domain/model'
import { LATE_MINUTES, rulesErrors, type BookingRules } from '@yeral/domain/rules'
import { eq } from 'drizzle-orm'
import type { z } from 'zod'
import { all, type Queryable } from '../../db/client'
import { bookingRules, businesses, categories, cities } from '../../db/schema'
import { ApiError, invalid, type Issue } from '../../http/errors'
import { emit } from '../../notify'
import { toRules } from '../availability/context'
import { queueAddressSms } from '../bookings/address-sms'

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
    if (issues.length) throw invalid(...issues)
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
 * Change some of the profile (B-37). A new category must offer every kind of booking the business takes, and the card's
 * "what it is" becomes its name. A new address keeps everything, the page and its verification included, and marks the
 * business for the Ýeral team to check again (book Q-215: `addressChangedAt`, cleared by the admin tool); a new line,
 * street or city is a move (`movedAt`, `movedFrom`), which every client with a booking ahead hears by SMS
 * (`queueAddressSms`). Back where it moved from while the page still says "New address", it has nothing new to say.
 */
export async function updateProfile(db: Queryable, businessId: string, change: ProfileChange, now: number): Promise<ProfileView> {
  return db.transaction(async (tx) => {
    const [row] = await tx.select().from(businesses).where(eq(businesses.id, businessId)).for('no key update')
    if (!row) throw new ApiError('not_found')
    const recategorized = change.categoryId !== undefined && change.categoryId !== row.categoryId
    // a business still being set up has no clients and no page to move: its address is where it starts (Q-200)
    const draft = !!row.setupStep
    const [[category], [city]] = await all(tx, [
      async () => (recategorized ? tx.select().from(categories).where(eq(categories.id, change.categoryId!)) : []),
      async () => (change.location ? tx.select({ id: cities.id }).from(cities).where(eq(cities.id, change.location.cityId)) : []),
    ])
    const issues: Issue[] = []
    if (recategorized && !(category && row.bookingTypes.every((t) => category.bookingTypes.includes(t))))
      issues.push({ path: ['categoryId'], code: 'invalid' })
    if (change.location && !city) issues.push({ path: ['location', 'cityId'], code: 'invalid' })
    // the languages sent change, an empty one goes, the others stay; one must be left
    const about = change.about && mergeLanguages(row.about, change.about)
    if (about && !Object.keys(about).length) issues.push({ path: ['about'], code: 'invalid' })
    if (issues.length) throw invalid(...issues)

    const { location, categoryId, amenities, ...rest } = change
    const before = addressOf(row)
    // a new pin alone is checked again, but the address the clients read is the same
    const relocated = !!location && !sameAddress(before, location)
    const moved = !draft && (relocated || (!!location && (location.lat !== row.lat || location.lng !== row.lng)))
    // the page says "New address" when what it shows changed (a home-based business shows its street); a fix while it
    // says so keeps where it moved from, and back there it has nothing new to say
    const hide = change.hideExactAddress ?? row.hideExactAddress
    const pageMoved = !draft && relocated && !sameAddressShown(before, location, hide, 'pending')
    const from = row.movedFrom && newAddressSince(row.movedAt?.getTime() ?? null, now) !== null ? row.movedFrom : before
    const movedBack = pageMoved && sameAddressShown(from, location, hide, 'pending')
    const set: Partial<typeof businesses.$inferInsert> = {
      ...rest,
      ...(about ? { about } : {}),
      // amenities the list doesn't know (older data) stay
      ...(amenities ? { amenities: [...amenities, ...row.amenities.filter((a) => !(AMENITIES as readonly string[]).includes(a))] } : {}),
      ...(recategorized ? { categoryId, kind: category!.name } : {}),
      ...location,
      ...(moved ? { addressChangedAt: new Date(now) } : {}),
      ...(pageMoved ? (movedBack ? { movedAt: null, movedFrom: null } : { movedAt: new Date(now), movedFrom: from }) : {}),
    }
    if (!Object.keys(set).length) return profileView(row)
    const [saved] = await tx.update(businesses).set(set).where(eq(businesses.id, businessId)).returning()
    if (relocated && !draft) await queueAddressSms(tx, businessId, before, now)
    await emit(tx, { type: 'business.updated', businessId })
    return profileView(saved!)
  })
}

function mergeLanguages(stored: Localized, change: Localized): Localized {
  const out: Localized = { ...stored }
  for (const [lang, text] of Object.entries(change) as [keyof Localized, string][]) {
    if (text) out[lang] = text
    else delete out[lang]
  }
  return out
}
