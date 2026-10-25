/**
 * A business's page address (`yeral.app/b/{slug}`; F-115, B-03, B-43; chapter 9, 25.10.2026): the check as it's
 * typed, a free one (made from a name, or offered for a taken one), and a new one, the old staying the business's.
 */
import type { PageAddressCheck } from '@yeral/contract/settings'
import { cutAtWord, RESERVED_SLUGS, SLUG_MAX, slugProblem } from '@yeral/domain/setup'
import { and, eq, like, ne, or } from 'drizzle-orm'
import type { Queryable } from '../../db/client'
import { businesses, businessOldSlugs } from '../../db/schema'
import type { Deps } from '../../deps'
import { ApiError, invalid } from '../../http/errors'
import { emit } from '../../notify'
import { pgCode } from '../bookings/repo'

/** The numbers an address may take after its name ("glow-studio-2"). */
const NUMBERED_MAX = 999

/** Whether another business has `slug` as its address now, or had it (`ownId`'s own addresses are free to it). */
export async function addressTaken(db: Queryable, slug: string, ownId: string | null): Promise<boolean> {
  const [now] = await db
    .select({ id: businesses.id })
    .from(businesses)
    .where(and(eq(businesses.slug, slug), ownId ? ne(businesses.id, ownId) : undefined))
    .limit(1)
  if (now) return true
  const [before] = await db
    .select({ slug: businessOldSlugs.slug })
    .from(businessOldSlugs)
    .where(and(eq(businessOldSlugs.slug, slug), ownId ? ne(businessOldSlugs.businessId, ownId) : undefined))
    .limit(1)
  return !!before
}

/**
 * A page address no other business has or had and no reserved word: `base` itself, else with a number after it, the
 * part before the number cut to leave it room (at a word where it can). Every numbered one is looked up under that
 * same part.
 */
export async function freeAddress(db: Queryable, base: string, ownId: string | null = null): Promise<string> {
  const stem = cutAtWord(base, SLUG_MAX - String(NUMBERED_MAX).length - 1)
  const others = <T extends typeof businesses.id | typeof businessOldSlugs.businessId>(column: T) => (ownId ? ne(column, ownId) : undefined)
  const now = await db
    .select({ slug: businesses.slug })
    .from(businesses)
    .where(and(or(eq(businesses.slug, base), like(businesses.slug, `${stem}-%`)), others(businesses.id)))
  const before = await db
    .select({ slug: businessOldSlugs.slug })
    .from(businessOldSlugs)
    .where(and(or(eq(businessOldSlugs.slug, base), like(businessOldSlugs.slug, `${stem}-%`)), others(businessOldSlugs.businessId)))
  const taken = new Set([...now, ...before].map((r) => r.slug))
  // `/b/` also opens booking codes (`YR-48213`, book chapter 5)
  const free = (slug: string) => !taken.has(slug) && !RESERVED_SLUGS.has(slug) && !slug.startsWith('yr-')
  if (free(base)) return base
  for (let n = 2; n <= NUMBERED_MAX; n++) if (free(`${stem}-${n}`)) return `${stem}-${n}`
  throw new Error(`no free page address for ${base}`)
}

/**
 * The check as the owner types: the address's own problem, else `taken` when another business has it or had it; for
 * a taken address or a reserved word, a free one like it.
 */
export async function checkAddress(db: Queryable, slug: string, ownId: string | null): Promise<PageAddressCheck> {
  const problem = slugProblem(slug) ?? ((await addressTaken(db, slug, ownId)) ? 'taken' : null)
  const suggestion = problem === 'taken' || RESERVED_SLUGS.has(slug) ? await freeAddress(db, slug, ownId) : null
  return { slug, problem, suggestion }
}

/** An address another transaction took first (the unique page address, or an old one's key): as one taken before. */
export function takenNow(e: unknown): boolean {
  const err = e as { constraint?: string; cause?: { constraint?: string } }
  const constraint = err.constraint ?? err.cause?.constraint
  return pgCode(e) === '23505' && (constraint === 'businesses_slug_unique' || constraint === 'business_old_slugs_pkey')
}

/**
 * A new page address (the business step, Link and QR): another business's, now or before, is `taken`. After the setup
 * is finished the old address joins the business's old ones, which keep opening its page (an old one taken back leaves
 * them); a draft's goes, nobody having seen it. The team's open screens hear the business changed.
 */
export async function setAddress(deps: Deps, businessId: string, slug: string): Promise<{ slug: string }> {
  try {
    return await deps.db.transaction(async (tx) => {
      const [b] = await tx
        .select({ slug: businesses.slug, setupStep: businesses.setupStep, sandbox: businesses.sandbox })
        .from(businesses)
        .where(eq(businesses.id, businessId))
        .for('update')
      if (!b) throw new ApiError('not_found')
      // the demo workspace is everyone's (`/w/demo`, F-242): one visitor doesn't move it for the rest
      if (b.sandbox) throw new ApiError('forbidden')
      if (b.slug === slug) return { slug }
      if (await addressTaken(tx, slug, businessId)) throw invalid({ path: ['slug'], code: 'taken' })
      await tx.delete(businessOldSlugs).where(eq(businessOldSlugs.slug, slug))
      if (!b.setupStep) await tx.insert(businessOldSlugs).values({ slug: b.slug, businessId })
      await tx.update(businesses).set({ slug }).where(eq(businesses.id, businessId))
      await emit(tx, { type: 'business.updated', businessId })
      return { slug }
    })
  } catch (e) {
    if (takenNow(e)) throw invalid({ path: ['slug'], code: 'taken' })
    throw e
  }
}
