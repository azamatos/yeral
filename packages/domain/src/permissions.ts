/**
 * Who may do what in the business workspace (business spec §1, ADR 0018). The api enforces these and redacts what a
 * role can't see; the UI hides it. Roles are per-business templates; Eýesi (owner) is a locked system role.
 */

/** The permission switches, after visibility ("Ähli senenamany görmek" = visibility `all`). */
export const PERMISSIONS = [
  'confirm', // Ýazylyşlary tassyklamak
  'move', // Geçirmek we ýatyrmak
  'noshow', // Gelmedi bellemek (complaints)
  'clients', // Müşderileri görmek we üýtgetmek
  'services', // Hyzmatlary we bahalary üýtgetmek
  'invite', // Işgär çagyrmak
  'revenue', // Girdejini görmek
  'settings', // Sazlamalary üýtgetmek
] as const
export type Permission = (typeof PERMISSIONS)[number]

export const VISIBILITIES = ['own', 'all'] as const
/** `own`: a specialist sees their own bookings; others' time shows as "Bes" (busy) without details. */
export type Visibility = (typeof VISIBILITIES)[number]

export interface RoleGrant {
  /** The owner role: everything, including roles and billing; can't be edited or removed. */
  system: boolean
  visibility: Visibility
  permissions: readonly Permission[]
}

export const ROLE_TEMPLATES = {
  owner: { system: true, visibility: 'all', permissions: PERMISSIONS },
  admin: { system: false, visibility: 'all', permissions: ['confirm', 'move', 'noshow', 'clients', 'invite'] },
  specialist: { system: false, visibility: 'own', permissions: ['confirm', 'move', 'noshow'] },
} as const satisfies Record<string, RoleGrant>
export type RoleTemplate = keyof typeof ROLE_TEMPLATES

/** A signed-in team member acting in one business. */
export interface Actor {
  role: RoleGrant
  /** Their row on the team, if they take bookings. */
  staffId: string | null
}

export function can(actor: Actor, permission: Permission): boolean {
  return actor.role.system || actor.role.permissions.includes(permission)
}

/** Editing roles and billing stays with the owner. */
export const canManageRoles = (actor: Actor) => actor.role.system

/** Does the actor see this booking's details, or only that the time is taken ("Bes")? */
export function seesBooking(actor: Actor, booking: { staffIds: readonly string[] }): boolean {
  if (actor.role.system || actor.role.visibility === 'all') return true
  return actor.staffId !== null && booking.staffIds.includes(actor.staffId)
}

/**
 * May the actor act on this booking with a permission? Visibility `own` limits actions to their own bookings.
 * Requests for a phone-only specialist ("Programmasyz") are handled by people who see the whole calendar.
 */
export function canActOn(actor: Actor, permission: Permission, booking: { staffIds: readonly string[] }): boolean {
  return can(actor, permission) && seesBooking(actor, booking)
}

/** Grants can't go beyond the permission list; the owner role can't change. */
export function isValidGrant(grant: RoleGrant): boolean {
  return !grant.system && VISIBILITIES.includes(grant.visibility) && grant.permissions.every((p) => PERMISSIONS.includes(p))
}
