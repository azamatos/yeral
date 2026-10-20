/**
 * Who may do what in a business workspace (book chapter 3, "The business team"; ADR 0025). Three fixed levels, no
 * custom roles; the permission table is fixed for the MVP (letting the owner edit it is Later, F-089). The api enforces
 * it and leaves out what a level can't see; the apps hide it ("hidden, not greyed out").
 */
import type { RequestAnswerers } from './rules'

/** Eýesi (exactly one per workspace), Administrator, Hünärmen. A specialist without the app is an option, not a level. */
export const LEVELS = ['owner', 'admin', 'specialist'] as const
export type Level = (typeof LEVELS)[number]

/**
 * How far a permission reaches: nothing, the person's own (their column, bookings, clients and earnings), or everyone's.
 * The team row reads `view` or `manage` instead.
 */
export type Scope = 'none' | 'own' | 'all' | 'view' | 'manage'

/** The rows of the table (business demo data `accessLevels`). */
export const PERMISSIONS = [
  'calendar', // every staff member's calendar; `own` = their own column only
  'answerRequests', // confirm or decline requests; narrowed by the "who answers" setting
  'bookings', // add, move and cancel bookings; block time
  'noshow', // mark no-shows and file complaints
  'clients', // clients with their phone numbers
  'reviewsReply', // reply to reviews (a specialist reads the reviews about them)
  'revenue', // money: revenue, earnings
  'analytics', // numbers; without money unless `revenue` allows it
  'services', // services and prices
  'settings', // business settings
  'team', // the team, invites and levels
] as const
export type Permission = (typeof PERMISSIONS)[number]

/** The fixed table: the owner's column is everything (book chapter 3). */
export const PERMISSION_TABLE: Record<Level, Record<Permission, Scope>> = {
  owner: {
    calendar: 'all',
    answerRequests: 'all',
    bookings: 'all',
    noshow: 'all',
    clients: 'all',
    reviewsReply: 'all',
    revenue: 'all',
    analytics: 'all',
    services: 'all',
    settings: 'all',
    team: 'manage',
  },
  admin: {
    calendar: 'all',
    answerRequests: 'all',
    bookings: 'all',
    noshow: 'all',
    clients: 'all',
    reviewsReply: 'all',
    revenue: 'none',
    analytics: 'all',
    services: 'all',
    settings: 'all',
    team: 'view',
  },
  specialist: {
    calendar: 'own',
    answerRequests: 'own',
    bookings: 'own',
    noshow: 'own',
    clients: 'own',
    reviewsReply: 'none',
    revenue: 'own',
    analytics: 'own',
    services: 'none',
    settings: 'none',
    team: 'none',
  },
}

/** A signed-in team member acting in one workspace. Every member is a row on the team (`staff`). */
export interface Actor {
  level: Level
  staffId: string
  /** "Öz haýyşlaryna jogap berip biler": the owner can take the right to answer one's own requests away. */
  canAnswerOwn: boolean
}

export const scopeOf = (actor: Actor, permission: Permission): Scope => PERMISSION_TABLE[actor.level][permission]

/**
 * The rows `can` and `canOn` answer. Answering requests isn't one of them: its row follows the business's setting
 * and the override, so it goes through `canAnswerRequest` only.
 */
export type GatedPermission = Exclude<Permission, 'answerRequests'>

/** Rows that change something; the others let the person see. */
const ACTIONS: readonly GatedPermission[] = ['bookings', 'noshow']

/** May the actor open this part of the workspace at all? Anything else is hidden. */
export const can = (actor: Actor, permission: GatedPermission): boolean => scopeOf(actor, permission) !== 'none'

/**
 * ...for something that belongs to these team members (a booking's specialists, the specialists a client booked)?
 * With `own`, seeing needs one of them to be the actor; changing needs all of them: a booking shared with another
 * specialist is moved or cancelled by the owner or an administrator.
 */
export function canOn(actor: Actor, permission: GatedPermission, staffIds: readonly string[]): boolean {
  const scope = scopeOf(actor, permission)
  if (scope === 'all' || scope === 'manage') return true
  if (scope !== 'own' || staffIds.length === 0) return false
  return ACTIONS.includes(permission) ? staffIds.every((id) => id === actor.staffId) : staffIds.includes(actor.staffId)
}

/** Invite, change levels, remove: the owner only; administrators see the team (book chapter 3). */
export const canManageTeam = (actor: Actor): boolean => scopeOf(actor, 'team') === 'manage'

/**
 * May the actor confirm or decline this request (book chapter 3, "Who answers booking requests")? The owner always
 * can. Requests for a specialist without the app go to the owner and administrators. Otherwise the business's setting
 * decides: `desk` the owner and administrators, `each` the request's own specialist, `both` whoever is first; "one's
 * own" needs the override left on, and every service of the request to be theirs.
 */
export function canAnswerRequest(
  actor: Actor,
  answerers: RequestAnswerers,
  request: { staffIds: readonly string[]; forPhoneOnlyStaff: boolean },
): boolean {
  if (actor.level === 'owner') return true
  if (request.forPhoneOnlyStaff) return actor.level === 'admin'
  const desk = actor.level === 'admin'
  // one's own only: a request shared with another specialist is answered by the desk, as its booking is changed (canOn)
  const own = actor.canAnswerOwn && request.staffIds.length > 0 && request.staffIds.every((id) => id === actor.staffId)
  switch (answerers) {
    case 'desk':
      return desk
    case 'each':
      return own
    case 'both':
      return desk || own
  }
}

/**
 * Whether someone joining at this level will answer booking requests there (the invite card's line, book B-08), by
 * `canAnswerRequest`'s rule: never where bookings confirm at once; an administrator where the desk answers, or for the
 * specialists who work without the app; a specialist where each answers their own, unless the owner took that away.
 */
export function answersRequests(
  member: { level: Exclude<Level, 'owner'>; canAnswerOwn: boolean },
  business: { answerers: RequestAnswerers; instant: boolean; phoneOnlyStaff: boolean },
): boolean {
  if (business.instant) return false
  if (member.level === 'admin') return business.answerers !== 'each' || business.phoneOnlyStaff
  return business.answerers !== 'desk' && member.canAnswerOwn
}
