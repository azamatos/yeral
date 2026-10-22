/**
 * Where a signed-in person lands (book B-07 step 4, design §27.2, chapter 9 21.10.2026): an invite waiting for them
 * first; then the workspace they used last; with none, their unfinished setup's "Continue setting up" card (Q-200),
 * never the no-workspace card; else an invite that ended in the last week says why, else "You don't have a workspace
 * yet".
 */
import type { Setup } from '@yeral/contract/setup'
import type { InviteCard, Workspace } from '@yeral/contract/team'
import { SETUP_STEPS, WIZARD_STEPS, type SetupStep } from '@yeral/domain/setup'
import { showsExpiredInvite } from '@yeral/domain/team'

export type Entry =
  | { kind: 'invite'; invite: InviteCard }
  | { kind: 'opening'; workspace: Workspace; count: number }
  | { kind: 'setup'; setup: Setup }
  | { kind: 'expired'; invite: InviteCard }
  | { kind: 'empty' }
  /** The setup decides and isn't known yet. */
  | { kind: 'pending' }

/**
 * `setup`: the person's unfinished setup, null without one, undefined while it isn't known (only the cards after it
 * wait for it). `declined`: the person just declined an invite, so the card after it says so (B-Login), and no
 * older expiry shows. `now`: when the person arrived, for the expired card's week.
 */
export function entryOf(
  invites: readonly InviteCard[],
  workspaces: { items: readonly Workspace[]; current: string | null },
  setup: Setup | null | undefined,
  { declined = false, now }: { declined?: boolean; now: number },
): Entry {
  // oldest first, as the api lists them; several at once aren't drawn, so they come one after another
  const pending = invites.find((i) => i.state === 'pending')
  if (pending) return { kind: 'invite', invite: pending }
  const { items } = workspaces
  const last =
    items.find((w) => w.slug === workspaces.current) ?? [...items].sort((a, b) => (b.lastOpenedAt ?? 0) - (a.lastOpenedAt ?? 0))[0]
  if (last) return { kind: 'opening', workspace: last, count: items.length }
  if (setup === undefined) return { kind: 'pending' }
  if (setup) return { kind: 'setup', setup }
  const expired = declined
    ? undefined
    : invites.filter((i) => i.state === 'expired' && showsExpiredInvite(i.expiresAt, now)).sort((a, b) => b.expiresAt - a.expiresAt)[0]
  if (expired) return { kind: 'expired', invite: expired }
  return { kind: 'empty' }
}

/**
 * The "Continue setting up" card's numbers (B-Login): the saved step's place among the wizard's 8 (the phone is the
 * first), how many are done before it, the draft's steps done (`before`) and the ones still ahead, the saved one
 * included (the last step, the result, isn't one to do). The steps before the saved one are the done ones (chapter 9
 * 21.10.2026), as the wizard reopens there, also when "Continue later" saved an earlier step than the furthest.
 */
export function setupProgress(step: SetupStep) {
  const at = SETUP_STEPS.indexOf(step)
  const n = WIZARD_STEPS.indexOf(step) + 1
  return {
    n,
    total: WIZARD_STEPS.length,
    done: n - 1,
    before: SETUP_STEPS.slice(0, at),
    ahead: SETUP_STEPS.slice(at).filter((s): s is Exclude<SetupStep, 'done'> => s !== 'done'),
  }
}
