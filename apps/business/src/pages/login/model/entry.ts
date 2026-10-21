/**
 * Where a signed-in person lands (book B-07 step 4, design §27.2, chapter 9 21.10.2026): an invite waiting for them
 * first; then the workspace they used last; with none, an invite that ended in the last week says why, else "You don't
 * have a workspace yet". An unfinished setup (Q-200) would come before the empty card, once the api says where a setup
 * stopped.
 */
import type { InviteCard, Workspace } from '@yeral/contract/team'
import { showsExpiredInvite } from '@yeral/domain/team'

export type Entry =
  | { kind: 'invite'; invite: InviteCard }
  | { kind: 'opening'; workspace: Workspace; count: number }
  | { kind: 'expired'; invite: InviteCard }
  | { kind: 'empty' }

/**
 * `declined`: the person just declined an invite, so the no-workspace card says so (B-Login), not an older expiry.
 * `now`: when the person arrived, for the expired card's week.
 */
export function entryOf(
  invites: readonly InviteCard[],
  workspaces: { items: readonly Workspace[]; current: string | null },
  { declined = false, now }: { declined?: boolean; now: number },
): Entry {
  // oldest first, as the api lists them; several at once aren't drawn, so they come one after another
  const pending = invites.find((i) => i.state === 'pending')
  if (pending) return { kind: 'invite', invite: pending }
  const { items } = workspaces
  const last =
    items.find((w) => w.slug === workspaces.current) ?? [...items].sort((a, b) => (b.lastOpenedAt ?? 0) - (a.lastOpenedAt ?? 0))[0]
  if (last) return { kind: 'opening', workspace: last, count: items.length }
  const expired = declined
    ? undefined
    : invites.filter((i) => i.state === 'expired' && showsExpiredInvite(i.expiresAt, now)).sort((a, b) => b.expiresAt - a.expiresAt)[0]
  if (expired) return { kind: 'expired', invite: expired }
  return { kind: 'empty' }
}
