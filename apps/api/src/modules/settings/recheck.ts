/**
 * The admin tool's «check again» list (book Q-215, Q-275 as changed 07.11.2026): a verified business that moved, or has
 * a new About, photo or logo, keeps the change live and waits there until the Ýeral team has looked. One still being set
 * up or not verified has nothing to mark: its review checks everything.
 */
import { RECHECK_CHANGES, type RecheckChange } from '@yeral/domain/model'
import type { businesses } from '../../db/schema'

type Row = Pick<typeof businesses.$inferSelect, 'setupStep' | 'verification' | 'recheck'>

/** The columns a change sets: the newest change's time, and what changed since the last check (in the list's order). */
export function recheckOf(b: Row, what: readonly RecheckChange[], now: number): { recheckAt?: Date; recheck?: RecheckChange[] } {
  if (!what.length || b.setupStep || b.verification !== 'verified') return {}
  return { recheckAt: new Date(now), recheck: RECHECK_CHANGES.filter((c) => what.includes(c) || b.recheck.includes(c)) }
}
