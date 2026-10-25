import type { Menu } from '@yeral/contract/services'
import type { TeamMember } from '@yeral/contract/team'
import type { Locale } from '@yeral/domain/model'
import { MARKET } from '@yeral/domain/market'
import { isMobile, nationalDigits, toE164 } from '@yeral/domain/phone'
import { diffDays, today } from '@yeral/domain/time'
import { inviteNow } from './invite'

/** The staff drawer's answers (B-Team `sd`): the profile, the access, the services. */
export type MemberForm = {
  name: string
  fullName: string
  specialization: string
  /** National digits, as typed; only someone without the app who never joined has it changed (the api's rule). */
  phone: string
  level: TeamMember['level']
  /** «Uses the app»: on with the app, or with an invite waiting. */
  app: boolean
  canAnswerOwn: boolean
  serviceIds: string[]
}

/** The invite waiting for them: invited, or a specialist without the app sent one (they work as before until then). */
export const invitePending = (m: TeamMember, now: number) => !m.joined && !!m.invite && inviteNow(m.invite, now) === 'pending'

/** On an invite: invited (open or ended), or working without the app with one waiting (B-Team `o.status === 'invited'`). */
export const onInvite = (m: TeamMember, now: number) => m.status === 'invited' || invitePending(m, now)

/** Calendar days left on the invite, as the board counts them: sent today, «7 days left». */
export const inviteDaysLeft = (invite: NonNullable<TeamMember['invite']>, now: number) =>
  Math.max(1, diffDays(today(invite.expiresAt), today(now)))

/** «Uses the app» as it stands: with the app, or invited to it. */
export const usesAppNow = (m: TeamMember, now: number) => m.hasApp || invitePending(m, now)

/**
 * The owner keeps the phone of someone without the app who never joined (B-Team `phoneEdit = owner && !o.app`): not
 * while an invite waits for that number; anyone else's is how they sign in.
 */
export const phoneEditable = (m: TeamMember, now: number) => m.level !== 'owner' && !m.hasApp && !m.joined && !invitePending(m, now)

/** What they do, from the menu's «who does it». */
export const servicesOf = (menu: Menu, id: string) =>
  menu.groups.flatMap((g) => g.services).flatMap((s) => (s.staffIds.includes(id) ? [s.id] : []))

export function formOf(m: TeamMember, menu: Menu, now: number): MemberForm {
  return {
    name: m.name,
    fullName: m.fullName ?? '',
    specialization: m.specialization ?? '',
    phone: m.phone ? nationalDigits(m.phone) : '',
    level: m.level,
    app: usesAppNow(m, now),
    canAnswerOwn: m.canAnswerOwn,
    serviceIds: servicesOf(menu, m.id),
  }
}

/** Why the new phone can't be saved: not whole, not a mobile one, or someone else's on the team. */
export type PhoneEditProblem = 'incomplete' | 'notMobile' | 'onTeam' | null

export function phoneEditProblem(phone: string, m: TeamMember, people: TeamMember[]): PhoneEditProblem {
  if (phone.length < MARKET.phone.length) return 'incomplete'
  if (!isMobile(phone)) return 'notMobile'
  const e164 = toE164(phone)
  return people.some((p) => p.id !== m.id && p.status !== 'removed' && p.phone === e164) ? 'onTeam' : null
}

const sameSet = (a: string[], b: string[]) => a.length === b.length && a.every((x) => b.includes(x))

/**
 * What a save sends (B-Team `commitStaff`): one `PATCH` with the profile, the access and the app turned off; the
 * services in their own call; an invite when the app is turned on. Only what changed goes.
 */
export function saveOf(m: TeamMember, was: MemberForm, form: MemberForm, locale: Locale, now: number) {
  const update: {
    name?: string
    fullName?: string | null
    specialization?: Partial<Record<Locale, string>> | null
    phone?: string
    level?: 'admin' | 'specialist'
    canAnswerOwn?: boolean
    hasApp?: false
  } = {}
  const name = form.name.trim()
  const fullName = form.fullName.trim()
  const specialization = form.specialization.trim()
  if (name !== was.name.trim()) update.name = name
  if (fullName !== was.fullName.trim()) update.fullName = fullName || null
  if (specialization !== was.specialization.trim()) update.specialization = specialization ? { [locale]: specialization } : null
  if (phoneEditable(m, now) && form.phone !== was.phone) update.phone = toE164(form.phone)
  if (form.level !== was.level && form.level !== 'owner') update.level = form.level
  if (form.canAnswerOwn !== was.canAnswerOwn) update.canAnswerOwn = form.canAnswerOwn
  // an administrator always uses the app (B-Team `needsApp`)
  if (was.app && !form.app && form.level !== 'admin') update.hasApp = false
  return {
    update: Object.keys(update).length ? update : null,
    serviceIds: sameSet(form.serviceIds, was.serviceIds) ? null : form.serviceIds,
    invite: !was.app && form.app,
  }
}

/** Changed as saveOf sees it: spaces around a text don't count. */
const key = (f: MemberForm) =>
  JSON.stringify({
    ...f,
    name: f.name.trim(),
    fullName: f.fullName.trim(),
    specialization: f.specialization.trim(),
    serviceIds: [...f.serviceIds].sort(),
  })
export const isDirty = (was: MemberForm, form: MemberForm) => key(was) !== key(form)

/** An invite goes to a mobile number (the api's rule): the one typed, or theirs. */
export const inviteable = (form: MemberForm) => isMobile(form.phone)
