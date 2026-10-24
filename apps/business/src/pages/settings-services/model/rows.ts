import type { TeamMember } from '@yeral/contract/team'

/**
 * «Who does it» on a service's row (B-Services `.who`): the people on the team who do it, and how many more are invited
 * and haven't joined yet («+ 1 invited»). Someone removed from the team isn't anyone.
 */
export function whoDoes(
  staffIds: readonly string[],
  team: readonly Pick<TeamMember, 'id' | 'name' | 'status' | 'photo'>[],
): { people: Pick<TeamMember, 'id' | 'name' | 'photo'>[]; invited: number } {
  const byId = new Map(team.filter((m) => m.status !== 'removed').map((m) => [m.id, m]))
  const on = staffIds.flatMap((id) => byId.get(id) ?? [])
  return { people: on.filter((m) => m.status !== 'invited'), invited: on.filter((m) => m.status === 'invited').length }
}
