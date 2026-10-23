import type { TeamMember } from '@yeral/contract/team'
import { RULE_OPTIONS, type BookingRules } from '@yeral/domain/rules'

const FIELDS = ['confirmMode', 'holdMinutes', 'requestAnswerers', 'cancelWindowMinutes', 'bufferMinutes'] as const

/** What step 7 sets of the booking rules (B-Onboarding `isRules`, book B-05); the others stay for Settings. */
export type RulesForm = Pick<BookingRules, (typeof FIELDS)[number]>

export function formFrom(rules: BookingRules): RulesForm {
  const form: Partial<RulesForm> = {}
  for (const k of FIELDS) Object.assign(form, { [k]: rules[k] })
  return form as RulesForm
}

/**
 * Only what changed goes to `PATCH …/settings/rules`; nothing changed sends nothing. In instant mode the hold and who
 * answers are hidden, so a change made there before switching isn't sent.
 */
export function rulesUpdate(form: RulesForm, stored: RulesForm): Partial<RulesForm> | null {
  const shown =
    form.confirmMode === 'manual' ? form : { ...form, holdMinutes: stored.holdMinutes, requestAnswerers: stored.requestAnswerers }
  const changes: Partial<RulesForm> = {}
  for (const k of FIELDS) if (shown[k] !== stored[k]) Object.assign(changes, { [k]: shown[k] })
  return Object.keys(changes).length ? changes : null
}

/**
 * The step's choices, with the business's own value kept when Settings set one the step doesn't offer (a custom
 * buffer of 45 minutes), so opening the step never changes it.
 */
export function choicesWith<T extends number | null>(options: readonly T[], value: T): T[] {
  if (options.includes(value)) return [...options]
  return [...options, value].sort((a, b) => (a ?? -1) - (b ?? -1))
}

export const HOLD_CHOICES = RULE_OPTIONS.holdMinutes
export const CANCEL_CHOICES = RULE_OPTIONS.cancelWindowMinutes
export const BUFFER_CHOICES = RULE_OPTIONS.bufferMinutes

/**
 * «Who answers requests?» shows in manual mode once someone besides the owner signs in to the workspace (book B-42):
 * a member who joined, or an invite still waiting, with the app; a specialist without the app doesn't answer anything,
 * and a declined, cancelled or expired invite isn't anyone.
 */
export function hasTeam(members: Pick<TeamMember, 'level' | 'status' | 'hasApp' | 'joined' | 'invite'>[]): boolean {
  return members.some((m) => m.level !== 'owner' && m.status !== 'removed' && m.hasApp && (m.joined || m.invite?.state === 'pending'))
}
