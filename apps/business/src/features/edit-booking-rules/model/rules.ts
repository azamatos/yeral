import type { TeamMember } from '@yeral/contract/team'
import { BUFFER_MAX, RULE_OPTIONS, type BookingRules } from '@yeral/domain/rules'

/**
 * Every rule Settings → Booking rules sets (B-Settings `isRules`, design §28.5, book B-05, B-41, B-42). Online booking
 * itself is paused in Business profile («Pause online booking»), so `onlineEnabled` isn't here. The wizard's rules step
 * shows a few of them; the rest keep their values.
 */
const FIELDS = [
  'confirmMode',
  'holdMinutes',
  'requestAnswerers',
  'leadMinutes',
  'windowDays',
  'bufferMinutes',
  'slotStep',
  'cancelWindowMinutes',
  'askCancelReason',
  'blockAfterNoShows',
] as const

type Rules = Pick<BookingRules, (typeof FIELDS)[number]>

/**
 * The rules as the form holds them. `bufferOther` is the text in the buffer's «Other…» box while that choice is on
 * (Settings, 1–120 minutes); `null` otherwise, and then `bufferMinutes` is the buffer.
 */
export type RulesForm = Rules & { bufferOther: string | null }

export function formFrom(rules: BookingRules): RulesForm {
  const form: Partial<RulesForm> = { bufferOther: null }
  for (const k of FIELDS) Object.assign(form, { [k]: rules[k] })
  return form as RulesForm
}

/** The buffer the form would save; `null` while «Other…» holds anything but a whole 1–120. */
export function bufferOf(form: RulesForm): number | null {
  if (form.bufferOther === null) return form.bufferMinutes
  const text = form.bufferOther.trim()
  const n = Number(text)
  return /^\d+$/.test(text) && n >= 1 && n <= BUFFER_MAX ? n : null
}

/** «Enter 1 to 120 minutes.»: «Other…» holds something that isn't a buffer; saving waits until it's fixed. */
export function bufferProblem(form: RulesForm): boolean {
  return bufferOf(form) === null
}

/** «Other…» shows for a typed buffer and for a stored one the presets don't have (45 minutes). */
export function bufferIsOther(form: RulesForm): boolean {
  return form.bufferOther !== null || !(BUFFER_CHOICES as readonly number[]).includes(form.bufferMinutes)
}

/**
 * Only what changed goes to `PATCH …/settings/rules`; nothing changed sends nothing. In instant mode the hold and who
 * answers are hidden, so a change made there before switching isn't sent; a buffer «Other…» can't save yet stays as
 * stored.
 */
export function rulesUpdate(form: RulesForm, stored: RulesForm): Partial<Rules> | null {
  const shown: Rules = {
    ...form,
    bufferMinutes: bufferOf(form) ?? stored.bufferMinutes,
    ...(form.confirmMode === 'manual' ? {} : { holdMinutes: stored.holdMinutes, requestAnswerers: stored.requestAnswerers }),
  }
  const changes: Partial<Rules> = {}
  for (const k of FIELDS) if (shown[k] !== stored[k]) Object.assign(changes, { [k]: shown[k] })
  return Object.keys(changes).length ? changes : null
}

/** The form once `changes` are saved: what the business has now, the buffer as a number. */
export function savedForm(form: RulesForm, stored: RulesForm): RulesForm {
  return { ...stored, ...rulesUpdate(form, stored), bufferOther: null }
}

export const HOLD_CHOICES = RULE_OPTIONS.holdMinutes
export const CANCEL_CHOICES = RULE_OPTIONS.cancelWindowMinutes
export const BUFFER_CHOICES = RULE_OPTIONS.bufferMinutes
export const LEAD_CHOICES = RULE_OPTIONS.leadMinutes
export const WINDOW_CHOICES = RULE_OPTIONS.windowDays
export const STEP_CHOICES = RULE_OPTIONS.slotStep
export const NO_SHOW_MAX = Math.max(...RULE_OPTIONS.blockAfterNoShows)

/**
 * «Who answers requests?» shows in manual mode once someone besides the owner signs in to the workspace (book B-42):
 * a member who joined, an invite still waiting, or a draft's person the finish will invite (`invited`, no invite yet),
 * with the app; a specialist without the app doesn't answer anything, and a declined, cancelled or expired invite isn't
 * anyone.
 */
export function hasTeam(members: Pick<TeamMember, 'level' | 'status' | 'hasApp' | 'joined' | 'invite'>[]): boolean {
  return members.some(
    (m) =>
      m.level !== 'owner' &&
      m.status !== 'removed' &&
      m.hasApp &&
      (m.joined || m.invite?.state === 'pending' || (m.status === 'invited' && !m.invite)),
  )
}
