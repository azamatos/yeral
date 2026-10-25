/**
 * A business's page address (`yeral.app/b/{slug}`; F-115, B-03, B-43; chapter 9, 25.10.2026): the check as it's
 * typed, a free one (made from a name, or offered for a taken one), and a new one, the old staying the business's.
 */
import type { PageAddressCheck } from '@yeral/contract/settings'
import { cutAtWord, SLUG_MAX, slugProblem } from '@yeral/domain/setup'
import { and, eq, like, ne, or } from 'drizzle-orm'
import type { Queryable } from '../../db/client'
import { businesses, businessOldSlugs } from '../../db/schema'
import type { Deps } from '../../deps'
import { ApiError, invalid } from '../../http/errors'
import { randomDigits } from '../../lib/crypto'
import { hit, rateLimited } from '../../lib/rate-limit'
import { emit } from '../../notify'
import { pgCode } from '../bookings/repo'

/** The numbers an address may take after its name ("glow-studio-2"). */
const NUMBERED_MAX = 999

/**
 * How often a finished business moves its page address (chapter 9, 25.10.2026): every move keeps one more address as
 * its own, so a day's few keep anyone from collecting them.
 */
export const PAGE_ADDRESS_MOVES_PER_DAY = 5

/** How many checks an account makes in an hour as it types (a few dozen an address). */
export const PAGE_ADDRESS_CHECKS_PER_HOUR = 300

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
 * A page address no other business has or had and no reserved word (`slugProblem`'s, the booking codes' `yr-` too):
 * `base` itself, else with a number after it, the part before the number cut to leave it room (at a word where it
 * can); every numbered one is looked up under that same part. A short made-up one stays as the name gives it.
 */
export async function freeAddress(db: Queryable, base: string, ownId: string | null = null): Promise<string> {
  const stem = cutAtWord(base, SLUG_MAX - String(NUMBERED_MAX).length - 1)
  const now = await db
    .select({ slug: businesses.slug })
    .from(businesses)
    .where(and(or(eq(businesses.slug, base), like(businesses.slug, `${stem}-%`)), ownId ? ne(businesses.id, ownId) : undefined))
  const before = await db
    .select({ slug: businessOldSlugs.slug })
    .from(businessOldSlugs)
    .where(
      and(
        or(eq(businessOldSlugs.slug, base), like(businessOldSlugs.slug, `${stem}-%`)),
        ownId ? ne(businessOldSlugs.businessId, ownId) : undefined,
      ),
    )
  const taken = new Set([...now, ...before].map((r) => r.slug))
  const free = (slug: string) => !taken.has(slug) && slugProblem(slug) !== 'reserved'
  if (free(base)) return base
  for (let n = 2; n <= NUMBERED_MAX; n++) if (free(`${stem}-${n}`)) return `${stem}-${n}`
  // every number up to 999 had: a longer one, by chance
  for (;;) {
    const slug = `${stem}-${randomDigits(6)}`
    if (free(slug)) return slug
  }
}

/**
 * The check as the owner types: the business's own address is fine; otherwise the address's own problem, else
 * `taken` when another business has it or had it; for a taken address or a reserved one, a free one like it (a
 * booking code's `yr-` start written `yr`, as a name gives it).
 */
export async function checkAddress(db: Queryable, slug: string, own: { id: string; slug: string } | null): Promise<PageAddressCheck> {
  if (own?.slug === slug) return { slug, problem: null, suggestion: null }
  const problem = slugProblem(slug) ?? ((await addressTaken(db, slug, own?.id ?? null)) ? 'taken' : null)
  const suggestion =
    problem === 'taken' || problem === 'reserved' ? await freeAddress(db, slug.replace(/^yr-/, 'yr'), own?.id ?? null) : null
  return { slug, problem, suggestion }
}

/** An address another transaction took first (the unique page address, or an old one's key): as one taken before. */
export function takenNow(e: unknown): boolean {
  const err = e as { constraint?: string; cause?: { constraint?: string } }
  const constraint = err.constraint ?? err.cause?.constraint
  return pgCode(e) === '23505' && (constraint === 'businesses_slug_unique' || constraint === 'business_old_slugs_pkey')
}

/**
 * A new page address (the business step, Link and QR): the business's own is no change; one breaking the rules is
 * `invalid`, another business's, now or before, `taken`. After the setup is finished the old address joins the
 * business's old ones, which keep opening its page (an old one taken back leaves them), up to
 * `PAGE_ADDRESS_MOVES_PER_DAY` moves a day; a draft's goes, nobody having seen it. Never the demo workspace's. The
 * team's switchers hear the business changed.
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
      // its own address stands, whatever rules came after it was made
      if (b.slug === slug) return { slug }
      if (slugProblem(slug)) throw invalid({ path: ['slug'], code: 'invalid' })
      if (await addressTaken(tx, slug, businessId)) throw invalid({ path: ['slug'], code: 'taken' })
      if (!b.setupStep) {
        // counted with the move: a refused one rolls back with it
        const r = await hit(tx, `page-address:${businessId}`, PAGE_ADDRESS_MOVES_PER_DAY, 24 * 3600, deps.now())
        if (!r.ok) throw rateLimited(r.retryAfterSec)
      }
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
