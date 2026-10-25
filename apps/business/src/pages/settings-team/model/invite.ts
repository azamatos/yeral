import type { TeamMember } from '@yeral/contract/team'
import type { Locale } from '@yeral/domain/model'
import { MARKET } from '@yeral/domain/market'
import { isMobile, isPhone, toE164 } from '@yeral/domain/phone'
import { inviteState } from '@yeral/domain/team'

/** «Add a team member» (B-Team `inviteVals`): the national digits as typed, the name clients see, the rest. */
export type InviteForm = {
  phone: string
  name: string
  specialization: string
  level: 'specialist' | 'admin'
  /** A specialist's «Uses the app»; an administrator always uses it. */
  hasApp: boolean
  serviceIds: string[]
}

export const emptyInvite: InviteForm = { phone: '', name: '', specialization: '', level: 'specialist', hasApp: true, serviceIds: [] }

/** An administrator always signs in; a specialist without the app never does (book Q-216). */
export const usesApp = (form: InviteForm) => form.level === 'admin' || form.hasApp

/**
 * Why the number can't be added, from the team as listed (B-Team `inviteVals`): not a mobile one (everyone's: it's how
 * they sign in, now or later, as in the wizard's team step); someone on the team already, the owner too; an open invite;
 * an earlier invite that ended (resent from its row, as the api keeps one row per number); someone removed who had
 * joined, or works without the app (reactivated from their row). Someone removed before they ever joined is invited
 * again on their old row.
 */
export type PhoneProblem = 'notMobile' | 'onTeam' | 'openInvite' | 'earlierInvite' | 'removed' | null

export function phoneProblem(phone: string, people: TeamMember[], now: number): PhoneProblem {
  if (!isPhone(phone)) return null
  if (!isMobile(phone)) return 'notMobile'
  const rows = people.filter((m) => m.phone === toE164(phone))
  if (rows.some((m) => m.status === 'active')) return 'onTeam'
  const invited = rows.find((m) => m.status === 'invited')
  if (invited) {
    const open =
      invited.invite &&
      inviteState(
        { status: invited.invite.state === 'expired' ? 'pending' : invited.invite.state, expiresAt: invited.invite.expiresAt },
        now,
      ) === 'pending'
    return open ? 'openInvite' : 'earlierInvite'
  }
  return rows.some((m) => m.status === 'removed' && (m.joined || !m.hasApp)) ? 'removed' : null
}

/** Step 1 is done: a whole number with no problem and a name. */
export const whoDone = (form: InviteForm, problem: PhoneProblem) =>
  form.phone.length === MARKET.phone.length && problem === null && form.name.trim().length > 0

/** Step 2 is done: a specialist does at least one service (when the menu has any); an administrator may do none. */
export const servicesDone = (form: InviteForm, menuHasServices: boolean) =>
  form.level === 'admin' || !menuHasServices || form.serviceIds.length > 0

/** What `POST …/team/invites` gets, or `POST …/team/phone-only` (no level: a specialist) for a specialist without the app. */
export function inviteInput(form: InviteForm, locale: Locale) {
  const specialization = form.specialization.trim()
  return {
    phone: toE164(form.phone),
    level: form.level,
    name: form.name.trim(),
    specialization: specialization ? ({ [locale]: specialization } as Partial<Record<Locale, string>>) : undefined,
    serviceIds: form.serviceIds,
  }
}
