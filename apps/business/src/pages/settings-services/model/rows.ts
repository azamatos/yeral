import type { TeamMember } from '@yeral/contract/team'

type Person = Pick<TeamMember, 'id' | 'name' | 'status' | 'photo' | 'invite'>

/**
 * The team as «Who does it» reads it, built once for every row: the people on it, and those invited who may still
 * come (an invite waiting, or a draft's person whose invite goes out at the finish). Someone removed, or whose invite
 * was declined, cancelled or ran out, isn't anyone (as `hasTeam` in edit-booking-rules).
 */
export function teamLookup(team: readonly Person[]): Map<string, Person & { invited: boolean }> {
  const lookup = new Map<string, Person & { invited: boolean }>()
  for (const m of team) {
    if (m.status === 'removed') continue
    const invited = m.status === 'invited'
    if (invited && m.invite && m.invite.state !== 'pending') continue
    lookup.set(m.id, { ...m, invited })
  }
  return lookup
}

/** «Who does it» on a service's row (B-Services `.who`): the people who do it, and how many more are invited. */
export function whoDoes(
  staffIds: readonly string[],
  lookup: ReturnType<typeof teamLookup>,
): { people: Pick<TeamMember, 'id' | 'name' | 'photo'>[]; invited: number } {
  const on = staffIds.flatMap((id) => lookup.get(id) ?? [])
  return { people: on.filter((m) => !m.invited), invited: on.filter((m) => m.invited).length }
}
