/**
 * Setting a business up (book B-02–B-06, Q-200): from the business step on the business exists as a draft, its owner
 * on its team; the wizard saves where it is and fills the business in through the settings endpoints (profile, hours,
 * services, team, rules); finishing puts it in the workspace switcher and in Ýeral's review. A draft is in no public
 * list (it isn't verified) and in no switcher; one is set up at a time.
 */
import type { mySetupSchema, setupStartSchema } from '@yeral/contract/setup'
import { MARKET } from '@yeral/domain/market'
import { formatPhone } from '@yeral/domain/phone'
import type { Actor } from '@yeral/domain/permissions'
import { SLUG_MAX, slugFrom, type SetupNeed, type SetupStep } from '@yeral/domain/setup'
import { and, eq, isNotNull, like, or } from 'drizzle-orm'
import type { z } from 'zod'
import { all, type Queryable } from '../../db/client'
import { bookingRules, businesses, categories, cities, services, staff } from '../../db/schema'
import type { Deps } from '../../deps'
import type { User } from '../../http/env'
import { ApiError, invalid } from '../../http/errors'
import { pgCode } from '../bookings/repo'
import { accountName } from '../me/me'
import { teamChanged } from '../team/service'

type Start = z.infer<typeof setupStartSchema>
type MySetup = z.infer<typeof mySetupSchema>

/** The person's draft: a business they own still being set up. */
async function draftOf(db: Queryable, userId: string) {
  const [row] = await db
    .select({ slug: businesses.slug, name: businesses.name, step: businesses.setupStep })
    .from(staff)
    .innerJoin(businesses, eq(businesses.id, staff.businessId))
    .where(and(eq(staff.userId, userId), eq(staff.level, 'owner'), eq(staff.status, 'active'), isNotNull(businesses.setupStep)))
    .limit(1)
  return row && row.step ? { slug: row.slug, name: row.name, step: row.step } : null
}

/** Where the wizard reopens at sign-in, if anywhere (Q-200). */
export async function mySetup(db: Queryable, user: User): Promise<MySetup> {
  return { setup: await draftOf(db, user.id) }
}

/** A page address no business has yet: the name's, then with a number after it. */
async function freeSlug(db: Queryable, name: string): Promise<string> {
  const base = slugFrom(name)
  const taken = new Set(
    (
      await db
        .select({ slug: businesses.slug })
        .from(businesses)
        .where(or(eq(businesses.slug, base), like(businesses.slug, `${base}-%`)))
    ).map((r) => r.slug),
  )
  if (!taken.has(base)) return base
  for (let n = 2; ; n++) {
    const slug = `${base.slice(0, SLUG_MAX - String(n).length - 1)}-${n}`
    if (!taken.has(slug)) return slug
  }
}

/**
 * Step 2 (B-03): the draft, with the name and category, the market's main city's centre until the address step puts
 * it on the map, the owner's number as its phone, every day closed until the hours step, the booking rules' defaults;
 * the person its owner, on the team and bookable (the team step may change it).
 */
export async function startSetup(deps: Deps, user: User, input: Start): Promise<{ slug: string }> {
  const { db } = deps
  const ongoing = await draftOf(db, user.id)
  if (ongoing) throw new ApiError('setup_in_progress', { slug: ongoing.slug })
  const [[category], [city]] = await all(db, [
    () => db.select().from(categories).where(eq(categories.id, input.categoryId)),
    () => db.select().from(cities).where(eq(cities.id, MARKET.mainCity)),
  ])
  // appointments only at the first launch: tables and classes come later (book Q-030)
  if (!category?.bookingTypes.includes('appointment')) throw invalid({ path: ['categoryId'], code: 'invalid' })
  if (!city) throw new Error(`the market's main city ${MARKET.mainCity} is missing`)
  for (;;) {
    try {
      return await db.transaction(async (tx) => {
        const slug = await freeSlug(tx, input.name)
        const [b] = await tx
          .insert(businesses)
          .values({
            slug,
            name: input.name,
            categoryId: category.id,
            kind: category.name,
            bookingTypes: ['appointment'],
            about: {},
            address: '',
            street: '',
            cityId: city.id,
            lat: city.lat,
            lng: city.lng,
            phone: user.phone,
            hours: [null, null, null, null, null, null, null],
            setupStep: 'address',
            createdAt: new Date(deps.now()),
          })
          .returning({ id: businesses.id })
        await tx.insert(bookingRules).values({ businessId: b!.id })
        await tx.insert(staff).values({
          businessId: b!.id,
          userId: user.id,
          level: 'owner',
          name: user.name ?? formatPhone(user.phone),
          fullName: accountName(user),
          phone: user.phone,
        })
        return { slug }
      })
    } catch (e) {
      // another business took the address at the same moment: the next free one
      if (pgCode(e) !== '23505') throw e
    }
  }
}

/** The draft the actor owns; anything else isn't being set up. */
function assertDraft(business: { setupStep: SetupStep | null }, actor: Actor): void {
  if (actor.level !== 'owner') throw new ApiError('forbidden')
  if (!business.setupStep) throw new ApiError('invalid_status')
}

/** The wizard moved on (or back): it reopens there. */
export async function saveStep(deps: Deps, business: { id: string; setupStep: SetupStep | null }, actor: Actor, step: SetupStep) {
  assertDraft(business, actor)
  await deps.db.update(businesses).set({ setupStep: step }).where(eq(businesses.id, business.id))
}

/**
 * "Senenama geç" (B-06): with an address, an open day and a service (`setup_incomplete` names what's missing), the
 * draft becomes a workspace in the switcher, and its page goes to Ýeral's review (it opens to clients once verified).
 */
export async function finishSetup(deps: Deps, business: { id: string; setupStep: SetupStep | null }, actor: Actor, user: User) {
  assertDraft(business, actor)
  await deps.db.transaction(async (tx) => {
    const [[b], [service]] = await all(tx, [
      () => tx.select().from(businesses).where(eq(businesses.id, business.id)).for('no key update'),
      () =>
        tx
          .select({ id: services.id })
          .from(services)
          .where(and(eq(services.businessId, business.id), eq(services.archived, false)))
          .limit(1),
    ])
    if (!b?.setupStep) throw new ApiError('invalid_status')
    const missing: SetupNeed[] = [
      ...(!b.street ? (['address'] as const) : []),
      ...(!b.hours.some(Boolean) ? (['hours'] as const) : []),
      ...(!service ? (['services'] as const) : []),
    ]
    if (missing.length) throw new ApiError('setup_incomplete', { missing })
    await tx.update(businesses).set({ setupStep: null }).where(eq(businesses.id, business.id))
    // the switcher shows it now
    await teamChanged(tx, business.id, { userId: user.id })
  })
}
