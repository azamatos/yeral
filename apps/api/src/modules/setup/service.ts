/**
 * Setting a business up (book B-02–B-06, Q-200): from the business step on the business exists as a draft, its owner
 * on its team; the wizard saves where it is and fills the business in through the settings endpoints (profile, hours,
 * services, team, rules); finishing puts it in the workspace switcher and in Ýeral's review. A draft is in no public
 * list (it isn't verified) and in no switcher; one is set up at a time.
 */
import type { SetupIncompleteDetails } from '@yeral/contract/errors'
import type { menuSchema } from '@yeral/contract/services'
import type { mySetupSchema, SetupServices, setupStartSchema, setupTeamSchema } from '@yeral/contract/setup'
import type { TeamMember } from '@yeral/contract/team'
import { MARKET } from '@yeral/domain/market'
import type { Locale, Localized } from '@yeral/domain/model'
import type { Actor } from '@yeral/domain/permissions'
import { serviceErrors } from '@yeral/domain/services'
import { cutAtWord, DEMO_SLUG, SLUG_MAX, slugFrom, type SetupNeed, type SetupStep } from '@yeral/domain/setup'
import { and, asc, eq, inArray, isNotNull, like, ne, or } from 'drizzle-orm'
import type { z } from 'zod'
import { all, type Queryable } from '../../db/client'
import { bookingRules, businesses, categories, cities, services, staff, users } from '../../db/schema'
import type { Deps } from '../../deps'
import type { User } from '../../http/env'
import { ApiError, invalid, type Issue } from '../../http/errors'
import { pgCode } from '../bookings/repo'
import { logoOf, text } from '../catalog/map'
import { accountName } from '../me/me'
import { setMenu, type PlannedGroup } from '../menu/service'
import { issueInvite, members, setServices, teamChanged } from '../team/service'

type Start = z.infer<typeof setupStartSchema>
type MySetup = z.infer<typeof mySetupSchema>
type Menu = z.infer<typeof menuSchema>
type SetupTeam = z.output<typeof setupTeamSchema>

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
 * the person its owner, on the team and bookable (Settings → Team changes it; the team step adds the others).
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

/** The same text where both are written: a starter sent back as it was (blank languages don't count). */
const sameText = (sent: Localized, of: Localized) =>
  Object.entries(sent).every(([lang, value]) => !value || of[lang as keyof Localized] === value)

/**
 * Step 5 (B-04, F-098): the draft's whole menu as the step leaves it (`setMenu`), in one transaction. Starters come
 * from the draft's category as it is now: a starter group or service keeps its names in every language while the name
 * sent is the same, and each is used once. A new service is done by everyone on the team who takes bookings, or the
 * owner when nobody does (the step's "I work alone"). Only the draft's owner, while it's a draft.
 */
export async function setupServices(
  deps: Deps,
  business: { id: string; setupStep: SetupStep | null },
  actor: Actor,
  input: SetupServices,
): Promise<Menu> {
  assertDraft(business, actor)
  return deps.db.transaction(async (tx) => {
    // held as the menu's own changes hold it, and still a draft: a save racing the finish doesn't change a workspace
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
    const usedGroups = new Set<string>()
    const usedServices = new Set<string>()
    /** A starter's names unless the one sent differs; issues for a starter not in the category, or used twice. */
    const resolve = (
      ref: { id?: string; starter?: string; name?: Localized },
      of: Map<string, Localized>,
      used: Set<string>,
      at: (string | number)[],
    ): Localized | undefined => {
      if (ref.starter === undefined) {
        if (!ref.id && !ref.name) issues.push({ path: [...at, 'name'], code: 'invalid' })
        return ref.name
      }
      const names = of.get(ref.starter)
      if (ref.id || !names || used.has(ref.starter)) issues.push({ path: [...at, 'starter'], code: 'invalid' })
      used.add(ref.starter)
      return ref.name && !(names && sameText(ref.name, names)) ? ref.name : names
    }
    const starterNames = new Map([...starters].map(([id, s]) => [id, s.name]))
    const plan: PlannedGroup[] = input.groups.map((g, gi) => ({
      id: g.id,
      name: resolve(g, starterGroups, usedGroups, ['groups', gi]),
      services: g.services.map((s, si) => {
        const at = ['groups', gi, 'services', si]
        for (const field of Object.keys(serviceErrors({ ...s, bufferMin: null }))) issues.push({ path: [...at, field], code: 'invalid' })
        return { ...s, name: resolve(s, starterNames, usedServices, at) }
      }),
    }))
    if (issues.length) throw invalid(...issues)

    const team = await tx
      .select({ id: staff.id, level: staff.level, bookable: staff.bookable })
      .from(staff)
      .where(and(eq(staff.businessId, business.id), ne(staff.status, 'removed')))
    const bookable = team.filter((m) => m.bookable)
    const doers = (bookable.length ? bookable : team.filter((m) => m.level === 'owner')).map((m) => m.id)
    return setMenu(tx, business.id, plan, doers, deps.now())
  })
}

/**
 * Step 6 (B-04): the draft's team besides its owner as the step leaves it, in one transaction. Someone already saved
 * keeps their row (by phone) and, at the same level, their services; anyone not sent goes (a draft's people have no
 * bookings, invites or account yet). Someone with the app waits as `invited` until the finish sends the invites; a
 * specialist without it is active at once. A new specialist does every service of the menu, as a new service is done
 * by everyone who takes bookings (step 5), and takes bookings once the menu has a service; an administrator doesn't.
 */
export async function setupTeam(
  deps: Deps,
  business: { id: string; setupStep: SetupStep | null },
  actor: Actor,
  input: SetupTeam,
  lang: Locale,
): Promise<TeamMember[]> {
  assertDraft(business, actor)
  await deps.db.transaction(async (tx) => {
    const [b] = await tx
      .select({ setupStep: businesses.setupStep })
      .from(businesses)
      .where(eq(businesses.id, business.id))
      .for('no key update')
    if (!b?.setupStep) throw new ApiError('invalid_status')
    const team = await tx.select().from(staff).where(eq(staff.businessId, business.id))
    const owner = team.find((r) => r.level === 'owner')

    const issues: Issue[] = []
    const seen = new Set<string>()
    input.members.forEach((m, i) => {
      // an administrator always signs in
      if (m.level === 'admin' && !m.hasApp) issues.push({ path: ['members', i, 'hasApp'], code: 'invalid' })
      if (seen.has(m.phone) || m.phone === owner?.phone) issues.push({ path: ['members', i, 'phone'], code: 'taken' })
      seen.add(m.phone)
    })
    if (issues.length) throw invalid(...issues)

    const others = team.filter((r) => r.level !== 'owner')
    const kept = new Set(input.members.map((m) => m.phone))
    const gone = others.filter((r) => !r.phone || !kept.has(r.phone)).map((r) => r.id)
    if (gone.length) await tx.delete(staff).where(and(eq(staff.businessId, business.id), inArray(staff.id, gone)))
    const byPhone = new Map(others.flatMap((r) => (r.phone ? [[r.phone, r] as const] : [])))
    const menu = await tx
      .select({ id: services.id })
      .from(services)
      .where(and(eq(services.businessId, business.id), eq(services.archived, false)))
    for (const [i, m] of input.members.entries()) {
      const specialist = m.level === 'specialist'
      const found = byPhone.get(m.phone)
      // a kept row at the same level keeps what it does (Settings may have narrowed it); a new or changed one is set
      const keep = found?.level === m.level
      const fields = {
        // the step's order, after the owner
        sort: i + 1,
        name: m.name,
        phone: m.phone,
        level: m.level,
        hasApp: m.hasApp,
        status: m.hasApp ? ('invited' as const) : ('active' as const),
        bookable: keep ? found.bookable : specialist && menu.length > 0,
      }
      const [row] = found
        ? await tx.update(staff).set(fields).where(eq(staff.id, found.id)).returning({ id: staff.id })
        : await tx
            .insert(staff)
            .values({ businessId: business.id, ...fields })
            .returning({ id: staff.id })
      if (!row) throw new Error('staff write failed')
      if (!keep) await setServices(tx, business.id, row.id, specialist ? menu.map((s) => s.id) : [])
    }
    await teamChanged(tx, business.id)
  })
  return members(deps, business.id, lang, deps.now())
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
    const now = deps.now()
    await tx
      .update(businesses)
      .set({ setupStep: null, sentForReviewAt: new Date(now) })
      .where(eq(businesses.id, business.id))
    // the team step's people with the app get their invites now (B-04: "invites go out from the final step"), each
    // seen at sign-in with that number for 7 days
    const invitees = await tx
      .select({ id: staff.id, phone: staff.phone })
      .from(staff)
      .where(and(eq(staff.businessId, business.id), eq(staff.status, 'invited'), eq(staff.hasApp, true)))
    for (const row of invitees) {
      if (!row.phone) continue
      await issueInvite(tx, now, { businessId: business.id, staffId: row.id, phone: row.phone, invitedBy: user.id })
      await teamChanged(tx, business.id, { phone: row.phone })
    }
    // the switcher shows it now
    await teamChanged(tx, business.id, { userId: user.id })
  })
}
