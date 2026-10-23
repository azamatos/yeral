/**
 * Setting a business up (book B-02–B-06, Q-200): from the business step on the business exists as a draft, its owner
 * on its team; the wizard saves where it is and fills the business in through the settings endpoints (profile, hours,
 * services, team, rules); finishing puts it in the workspace switcher and in Ýeral's review. A draft is in no public
 * list (it isn't verified) and in no switcher; one is set up at a time.
 */
import type { SetupIncompleteDetails } from '@yeral/contract/errors'
import type { menuSchema } from '@yeral/contract/services'
import type { mySetupSchema, setupServicesSchema, setupStartSchema } from '@yeral/contract/setup'
import { MARKET } from '@yeral/domain/market'
import type { Localized } from '@yeral/domain/model'
import type { Actor } from '@yeral/domain/permissions'
import { serviceErrors } from '@yeral/domain/services'
import { cutAtWord, DEMO_SLUG, SLUG_MAX, slugFrom, type SetupNeed, type SetupStep } from '@yeral/domain/setup'
import { and, asc, eq, isNotNull, like, ne, or } from 'drizzle-orm'
import type { z } from 'zod'
import { all, type Queryable } from '../../db/client'
import { bookingRules, businesses, categories, cities, serviceGroups, services, staff, staffServices, users } from '../../db/schema'
import type { Deps } from '../../deps'
import type { User } from '../../http/env'
import { ApiError, invalid, type Issue } from '../../http/errors'
import { emit } from '../../notify'
import { pgCode } from '../bookings/repo'
import { logoOf, text } from '../catalog/map'
import { accountName } from '../me/me'
import { menuOf } from '../menu/service'
import { teamChanged } from '../team/service'

type Start = z.infer<typeof setupStartSchema>
type MySetup = z.infer<typeof mySetupSchema>
type SetupServices = z.infer<typeof setupServicesSchema>
type Menu = z.infer<typeof menuSchema>

/** The person's draft: a business they own still being set up, with what the sign-in's card shows of it. */
async function draftOf(db: Queryable, userId: string) {
  const [row] = await db
    .select({
      slug: businesses.slug,
      name: businesses.name,
      step: businesses.setupStep,
      kind: businesses.kind,
      categoryId: businesses.categoryId,
      logo: businesses.logo,
      address: businesses.address,
      street: businesses.street,
      cityId: businesses.cityId,
      city: cities.name,
    })
    .from(staff)
    .innerJoin(businesses, eq(businesses.id, staff.businessId))
    .leftJoin(cities, eq(cities.id, businesses.cityId))
    .where(and(eq(staff.userId, userId), eq(staff.level, 'owner'), eq(staff.status, 'active'), isNotNull(businesses.setupStep)))
    .orderBy(asc(businesses.createdAt))
    .limit(1)
  return row?.step ? { ...row, step: row.step } : null
}

/**
 * Where the wizard reopens at sign-in, if anywhere (Q-200), with what the "Continue setting up" card shows (B-Login's
 * ContinueSetupCard): the category (and its id, which the wizard's business step picks again), the logo, and the
 * address once one is saved (the rule finishing reads: a street). In the account's language, as the workspaces and
 * invites are.
 */
export async function mySetup(deps: Pick<Deps, 'db' | 'media'>, user: User): Promise<MySetup> {
  const draft = await draftOf(deps.db, user.id)
  if (!draft) return { setup: null }
  return {
    setup: {
      slug: draft.slug,
      name: draft.name,
      step: draft.step,
      category: text(draft.kind, user.lang),
      categoryId: draft.categoryId,
      logo: logoOf(deps, draft, user.lang),
      address: draft.street ? { line: draft.address, city: { id: draft.cityId, name: text(draft.city, user.lang) } } : null,
    },
  }
}

/** The numbers a page address may take after its name ("glow-studio-2"). */
const NUMBERED_MAX = 999

/**
 * A page address no business has yet: the name's, then with a number after it. The name part is cut to leave the
 * number room, at a word where it can, and every numbered address is looked up under that same part.
 */
async function freeSlug(db: Queryable, name: string): Promise<string> {
  const base = slugFrom(name)
  const stem = cutAtWord(base, SLUG_MAX - String(NUMBERED_MAX).length - 1)
  const taken = new Set([
    // the demo workspace's, made by the jobs whenever it's missing (book F-242)
    DEMO_SLUG,
    ...(
      await db
        .select({ slug: businesses.slug })
        .from(businesses)
        .where(or(eq(businesses.slug, base), like(businesses.slug, `${stem}-%`)))
    ).map((r) => r.slug),
  ])
  if (!taken.has(base)) return base
  for (let n = 2; n <= NUMBERED_MAX; n++) if (!taken.has(`${stem}-${n}`)) return `${stem}-${n}`
  throw new Error(`no free page address for ${base}`)
}

/**
 * Step 2 (B-03): the draft, with the name and category, the market's main city's centre until the address step puts
 * it on the map, the owner's number as its phone, every day closed until the hours step, the booking rules' defaults;
 * the person its owner, on the team and bookable (the team step may change it).
 */
export async function startSetup(deps: Deps, user: User, input: Start): Promise<{ slug: string }> {
  const { db } = deps
  // the team and the page show the owner by their name (the sign-up's name step, B-02)
  const firstName = user.name
  if (!firstName) throw invalid({ path: ['name'], code: 'account_name_required' })
  const [[category], [city]] = await all(db, [
    () => db.select().from(categories).where(eq(categories.id, input.categoryId)),
    () => db.select().from(cities).where(eq(cities.id, MARKET.mainCity)),
  ])
  // appointments only at the first launch: tables and classes come later (book Q-030)
  if (!category?.bookingTypes.includes('appointment')) throw invalid({ path: ['categoryId'], code: 'invalid' })
  if (!city) throw new Error(`the market's main city ${MARKET.mainCity} is missing`)
  // a page address taken at the same moment is tried again, a few times
  for (let attempt = 1; ; attempt++) {
    try {
      return await db.transaction(async (tx) => {
        // the account held first: two starts at once (a double tap) find each other's draft
        await tx.select({ id: users.id }).from(users).where(eq(users.id, user.id)).for('no key update')
        const ongoing = await draftOf(tx, user.id)
        if (ongoing) throw new ApiError('setup_in_progress', { slug: ongoing.slug })
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
          name: firstName,
          fullName: accountName(user),
          phone: user.phone,
        })
        return { slug }
      })
    } catch (e) {
      // another business took the address at the same moment: the next free one
      if (pgCode(e) !== '23505' || attempt >= 3) throw e
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
  // only while it's still a draft: a save racing the finish doesn't make it one again
  const [saved] = await deps.db
    .update(businesses)
    .set({ setupStep: step })
    .where(and(eq(businesses.id, business.id), isNotNull(businesses.setupStep)))
    .returning({ id: businesses.id })
  if (!saved) throw new ApiError('invalid_status')
}

/** The most services the services step makes (a menu that long is set up in Settings). */
const SETUP_SERVICES_MAX = 100

/** The same text in the languages written: an owner's "change" that leaves a starter's name as it was. */
const sameText = (written: Localized, of: Localized) =>
  Object.entries(written).every(([lang, value]) => of[lang as keyof Localized] === value)

/**
 * Step 5 (B-04, F-098): the draft's menu as the step leaves it, in one transaction that replaces what the step made
 * before (a retry or a second save adds nothing twice; a draft has no bookings to keep). Starters come from the draft's
 * category as it is now, with their names in every language while unchanged, in the order the request gives; everyone
 * on the team who takes bookings does every service, as the step's "I work alone" default (Settings changes it).
 */
export async function setupServices(
  deps: Deps,
  business: { id: string; setupStep: SetupStep | null },
  actor: Actor,
  input: SetupServices,
): Promise<Menu> {
  assertDraft(business, actor)
  return deps.db.transaction(async (tx) => {
    // the menu held, as its own changes hold it (`lockMenu`), and the draft still one
    const [b] = await tx
      .select({ setupStep: businesses.setupStep, categoryId: businesses.categoryId })
      .from(businesses)
      .where(eq(businesses.id, business.id))
      .for('no key update')
    if (!b?.setupStep) throw new ApiError('invalid_status')
    const [category] = await tx.select({ starters: categories.starterServices }).from(categories).where(eq(categories.id, b.categoryId))
    const starters = new Map((category?.starters ?? []).map((s) => [s.id, s]))
    const starterGroups = new Map((category?.starters ?? []).map((s) => [s.group.id, s.group.name]))

    const issues: Issue[] = []
    const used = new Set<string>()
    const groups = input.groups.map((g, gi) => {
      const groupName = g.name ?? (g.starter ? starterGroups.get(g.starter) : undefined)
      if (g.starter && !starterGroups.has(g.starter)) issues.push({ path: ['groups', gi, 'starter'], code: 'invalid' })
      else if (!groupName) issues.push({ path: ['groups', gi, 'name'], code: 'invalid' })
      const rows = g.services.map((s, si) => {
        const at = ['groups', gi, 'services', si]
        const starter = s.starter ? starters.get(s.starter) : undefined
        if (s.starter && (!starter || used.has(s.starter))) issues.push({ path: [...at, 'starter'], code: 'invalid' })
        if (s.starter) used.add(s.starter)
        const name = s.name && !(starter && sameText(s.name, starter.name)) ? s.name : starter?.name
        if (!name && !s.starter) issues.push({ path: [...at, 'name'], code: 'invalid' })
        for (const field of Object.keys(serviceErrors({ ...s, bufferMin: null }))) issues.push({ path: [...at, field], code: 'invalid' })
        return { name: name ?? {}, durationMin: s.durationMin, priceType: s.priceType, priceAmount: s.priceAmount }
      })
      return { name: groupName ?? {}, rows }
    })
    if (groups.reduce((n, g) => n + g.rows.length, 0) > SETUP_SERVICES_MAX) issues.push({ path: ['groups'], code: 'too_big' })
    if (issues.length) throw invalid(...issues)

    // what the step made before goes (the links with its services), then the menu as sent
    await tx.delete(services).where(eq(services.businessId, business.id))
    await tx.delete(serviceGroups).where(eq(serviceGroups.businessId, business.id))
    const made: string[] = []
    for (const [sort, g] of groups.entries()) {
      const [group] = await tx
        .insert(serviceGroups)
        .values({ businessId: business.id, name: g.name, sort })
        .returning({ id: serviceGroups.id })
      const rows = await tx
        .insert(services)
        .values(g.rows.map((r, i) => ({ ...r, businessId: business.id, groupId: group!.id, sort: i })))
        .returning({ id: services.id })
      made.push(...rows.map((r) => r.id))
    }
    const doers = await tx
      .select({ id: staff.id })
      .from(staff)
      .where(and(eq(staff.businessId, business.id), eq(staff.bookable, true), ne(staff.status, 'removed')))
    if (doers.length) await tx.insert(staffServices).values(doers.flatMap((d) => made.map((serviceId) => ({ staffId: d.id, serviceId }))))
    await emit(tx, { type: 'business.updated', businessId: business.id })
    return menuOf(tx, business.id, deps.now())
  })
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
    const details: SetupIncompleteDetails = { missing }
    if (missing.length) throw new ApiError('setup_incomplete', details)
    await tx
      .update(businesses)
      .set({ setupStep: null, sentForReviewAt: new Date(deps.now()) })
      .where(eq(businesses.id, business.id))
    // the switcher shows it now
    await teamChanged(tx, business.id, { userId: user.id })
  })
}
