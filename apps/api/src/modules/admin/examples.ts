/**
 * `make-example <slug> [--off]` (the owner's D2, 25.10.2026; book chapter 9): while the sign-in code shows on the screen
 * (the first launch, book Q-036), opens one of the owner's own test businesses to clients, marked "Example" as the
 * seeded examples are, so answering requests can be tried live; it keeps its own booking rules, so it still confirms by
 * hand if it did. `--off` takes it back to "in review", the "Example" mark gone, whether the code shows or not. A real business is verified only by the
 * Ýeral team, and not while the code shows (ADR 0023).
 */
import { and, eq, isNotNull } from 'drizzle-orm'
import type { Db } from '../../db/client'
import { businesses, staff } from '../../db/schema'
import { emit } from '../../notify'

/** Why the command refuses: said to whoever runs it on the server. */
export class ExampleRefused extends Error {}

export async function makeExample(db: Db, codeOnScreen: boolean, slug: string, on: boolean): Promise<'opened' | 'closed' | 'unchanged'> {
  // taking one back is always allowed: after the switch goes off too
  if (on && !codeOnScreen) throw new ExampleRefused('only while the sign-in code shows on the screen (SIGN_IN_CODE_ON_SCREEN=true)')
  let done: 'opened' | 'closed' | 'unchanged' = 'unchanged'
  await db.transaction(async (tx) => {
    const [b] = await tx.select().from(businesses).where(eq(businesses.slug, slug)).for('update')
    if (!b) throw new ExampleRefused(`no business at ${slug}`)
    if (b.setupStep) throw new ExampleRefused(`${slug} is still being set up: finish its setup first`)
    if (b.closedAt) throw new ExampleRefused(`${slug} is closed`)
    if (b.sandbox) throw new ExampleRefused(`${slug} is the business app's demo workspace`)
    // one of the owner's own: an owner who signs in (the seeded examples have no team, and stay as they are)
    const [owner] = await tx
      .select({ id: staff.id })
      .from(staff)
      .where(and(eq(staff.businessId, b.id), eq(staff.level, 'owner'), eq(staff.status, 'active'), isNotNull(staff.userId)))
    if (!owner) throw new ExampleRefused(`${slug} has no owner who signs in: not one of the owner's test businesses`)
    const example = b.demo && b.verification === 'verified'
    if (on === example) return
    await tx
      .update(businesses)
      .set(on ? { demo: true, verification: 'verified', verificationReason: null } : { demo: false, verification: 'pending' })
      .where(eq(businesses.id, b.id))
    // its team's banner, its page and search follow at once
    await emit(tx, { type: 'business.reviewed', businessId: b.id })
    done = on ? 'opened' : 'closed'
  })
  return done
}
