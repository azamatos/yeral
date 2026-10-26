/**
 * `make-example <slug> [--off]` (the owner's D2, 25.10.2026; book chapter 9): while the sign-in code shows on the screen
 * (the first launch, book Q-036), opens one of the owner's own test businesses to clients, marked "Example" as the
 * seeded examples are, so answering requests can be tried live; it keeps its own booking rules, so it still confirms by
 * hand if it did. `--off` takes the mark away, and an open one back to "in review", whether the code shows or not. A
 * real business is verified only by the Ýeral team, and not while the code shows (ADR 0023).
 */
import { and, eq } from 'drizzle-orm'
import type { Db } from '../../db/client'
import { businesses, staff, verificationHistory } from '../../db/schema'
import type { Deps } from '../../deps'
import { emit } from '../../notify'
import { showsCodeOnScreen } from '../auth/codes'
import { signsIn } from '../team/members'

/** Why the command refuses: said to whoever runs it on the server. */
export class ExampleRefused extends Error {}

const USAGE = 'usage: make-example <slug> [--off]'

/** The command's words: one page address and maybe `--off`; anything else (a mistyped flag) mustn't open a business. */
export function exampleArgs(flags: string[]): { slug: string; on: boolean } {
  const [slug, ...rest] = flags.filter((f) => !f.startsWith('--'))
  if (!slug || rest.length || flags.some((f) => f.startsWith('--') && f !== '--off')) throw new ExampleRefused(USAGE)
  return { slug, on: !flags.includes('--off') }
}

export async function makeExample(
  db: Db,
  deps: Pick<Deps, 'codeOnScreen' | 'sms' | 'now'>,
  slug: string,
  on: boolean,
): Promise<{ done: 'opened' | 'closed' | 'unchanged'; name: string }> {
  // taking one back is always allowed: after the switch goes off too
  if (on && !showsCodeOnScreen(deps))
    throw new ExampleRefused('only while the sign-in code shows on the screen (SIGN_IN_CODE_ON_SCREEN=true)')
  return db.transaction(async (tx) => {
    const [b] = await tx.select().from(businesses).where(eq(businesses.slug, slug)).for('no key update')
    if (!b) throw new ExampleRefused(`no business at ${slug} (its page address now)`)
    if (b.sandbox) throw new ExampleRefused(`${slug} is the business app's demo workspace`)
    // a team that signs in: the seeded examples have none, and stay as they are
    const [owner] = await tx
      .select({ id: staff.id })
      .from(staff)
      .where(and(eq(staff.businessId, b.id), eq(staff.level, 'owner'), signsIn))
    if (!owner) throw new ExampleRefused(`${slug} has no owner who signs in (a seeded example?)`)
    const name = b.name
    const at = new Date(deps.now())
    if (!on) {
      if (!b.demo) return { done: 'unchanged', name }
      const back = b.verification === 'verified'
      await tx
        .update(businesses)
        .set(back ? { demo: false, verification: 'pending' } : { demo: false })
        .where(eq(businesses.id, b.id))
      if (back) await tx.insert(verificationHistory).values({ businessId: b.id, status: 'pending', at })
      // its team's banner, its page and search follow at once
      await emit(tx, { type: 'business.reviewed', businessId: b.id })
      return { done: 'closed', name }
    }
    if (b.demo && b.verification === 'verified') return { done: 'unchanged', name }
    if (b.setupStep) throw new ExampleRefused(`${slug} is still being set up: finish its setup first`)
    if (b.closedAt) throw new ExampleRefused(`${slug} is closed`)
    if (b.hiddenAt) throw new ExampleRefused(`${slug} is hidden by the Ýeral team: show it in the admin tool first`)
    // only from "in review": the team's verdict (verified for real, or sent back with a reason) isn't the command's
    if (b.verification !== 'pending') throw new ExampleRefused(`${slug} is ${b.verification} by the Ýeral team, not in review`)
    await tx.update(businesses).set({ demo: true, verification: 'verified' }).where(eq(businesses.id, b.id))
    await tx.insert(verificationHistory).values({ businessId: b.id, status: 'verified', at })
    await emit(tx, { type: 'business.reviewed', businessId: b.id })
    return { done: 'opened', name }
  })
}
