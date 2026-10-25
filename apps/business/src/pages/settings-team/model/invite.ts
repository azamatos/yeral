import type { TeamMember } from '@yeral/contract/team'
import type { Locale } from '@yeral/domain/model'
import { MARKET } from '@yeral/domain/market'
import { isMobile, nationalDigits, toE164 } from '@yeral/domain/phone'
import { inviteState } from '@yeral/domain/team'

/** «Add a team member» (B-Team `inviteVals`, book B-44): the national digits as typed, the name clients see, the rest. */
export type InviteForm = {
  phone: string
  name: string
  /** Book B-44: optional, seen by the team only. */
  fullName: string
  specialization: string
  level: 'specialist' | 'admin'
  /** A specialist's «Uses the app»; an administrator always uses it. */
  hasApp: boolean
  serviceIds: string[]
}

export const emptyInvite: InviteForm = {
  phone: '',
  name: '',
  fullName: '',
  specialization: '',
  level: 'specialist',
  hasApp: true,
  serviceIds: [],
}

/**
 * «Invite again» for someone who left (B-Team `inviteAgain`): their number, names and level filled in, with the app;
 * the services are picked again (the menu doesn't list someone off the team).
 */
export const inviteAgainForm = (m: TeamMember): InviteForm => ({
  phone: m.phone ? nationalDigits(m.phone) : '',
  name: m.name,
  fullName: m.fullName ?? '',
  specialization: m.specialization ?? '',
  level: m.level === 'admin' ? 'admin' : 'specialist',
  hasApp: true,
  serviceIds: [],
})

/** An administrator always signs in; a specialist without the app never does (book Q-216). */
export const usesApp = (form: InviteForm) => form.level === 'admin' || form.hasApp

/** An invite's state now: one the list still calls pending reads as expired once its end has passed. */
export const inviteNow = (invite: NonNullable<TeamMember['invite']>, now: number) =>
  inviteState({ status: invite.state === 'expired' ? 'pending' : invite.state, expiresAt: invite.expiresAt }, now)

/**
 * Why the number can't be added, from the team as listed (B-Team `inviteVals`): a whole number that isn't a mobile one
 * (everyone's: it's how they sign in, now or later, as in the wizard's team step); someone on the team already, the
 * owner too; an open invite; an earlier invite that ended (resent from its row, as the api keeps one row per number);
 * someone no longer on the team added back without the app (the api would add a second row: Reactivate brings their
 * own back). With the app they're invited again on their old row, which also brings back someone who left (§28.4).
 */
export type PhoneProblem = 'notMobile' | 'onTeam' | 'openInvite' | 'earlierInvite' | 'removed' | null

export function phoneProblem(phone: string, app: boolean, people: TeamMember[], now: number): PhoneProblem {
  if (phone.length < MARKET.phone.length) return null
  if (!isMobile(phone)) return 'notMobile'
  const rows = people.filter((m) => m.phone === toE164(phone))
  if (rows.some((m) => m.status === 'active')) return 'onTeam'
  const invited = rows.find((m) => m.status === 'invited')
  if (invited) return invited.invite && inviteNow(invited.invite, now) === 'pending' ? 'openInvite' : 'earlierInvite'
  return !app && rows.some((m) => m.status === 'removed') ? 'removed' : null
}

/** Step 1 is done: a whole mobile number with no problem, and a name. */
export const whoDone = (form: InviteForm, problem: PhoneProblem) => isMobile(form.phone) && problem === null && form.name.trim().length > 0

/** Step 2 is done: a specialist does at least one service (when the menu has any); an administrator may do none. */
export const servicesDone = (form: InviteForm, menuHasServices: boolean) =>
  form.level === 'admin' || !menuHasServices || form.serviceIds.length > 0

/** What `POST …/team/invites` gets; `POST …/team/phone-only` takes the same without the level (a specialist). */
export function inviteInput(form: InviteForm, locale: Locale) {
  const fullName = form.fullName.trim()
  const specialization = form.specialization.trim()
  return {
    phone: toE164(form.phone),
    level: form.level,
    name: form.name.trim(),
    fullName: fullName || undefined,
    specialization: specialization ? ({ [locale]: specialization } as Partial<Record<Locale, string>>) : undefined,
    serviceIds: form.serviceIds,
  }
}
