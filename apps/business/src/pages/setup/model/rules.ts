import { RULE_OPTIONS, type BookingRules } from '@yeral/domain/rules'

/** What step 7 sets of the booking rules (B-Onboarding `isRules`, book B-05); the others stay for Settings. */
export type RulesForm = Pick<BookingRules, 'confirmMode' | 'holdMinutes' | 'requestAnswerers' | 'cancelWindowMinutes' | 'bufferMinutes'>

const FIELDS = ['confirmMode', 'holdMinutes', 'requestAnswerers', 'cancelWindowMinutes', 'bufferMinutes'] as const

export function formFrom(rules: BookingRules): RulesForm {
  const { confirmMode, holdMinutes, requestAnswerers, cancelWindowMinutes, bufferMinutes } = rules
  return { confirmMode, holdMinutes, requestAnswerers, cancelWindowMinutes, bufferMinutes }
}

/** Only what changed goes to `PATCH …/settings/rules`; nothing changed sends nothing. */
export function rulesUpdate(form: RulesForm, stored: RulesForm): Partial<RulesForm> | null {
  const changes: Partial<RulesForm> = {}
  for (const k of FIELDS) if (form[k] !== stored[k]) Object.assign(changes, { [k]: form[k] })
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
 * a member or an invite with the app; a specialist without the app doesn't answer anything.
 */
export function hasTeam(members: { level: string; status: string; hasApp: boolean }[]): boolean {
  return members.some((m) => m.level !== 'owner' && m.status !== 'removed' && m.hasApp)
}
