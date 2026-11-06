/**
 * Who in the Ýeral team changes the team (book Q-011, owner 04.11.2026; ADR 0026 amended 2026-11-06). Two roles: one
 * superadmin, the first account ever, who invites admins, hands out new setup links and turns admins off; and admins,
 * who do everything else the admin tool offers and see the team read-only. Nobody turns off or resets the superadmin,
 * and nobody their own account. No manager role yet: none has rights of its own (later).
 */
export const ADMIN_ROLES = ['superadmin', 'admin'] as const
export type AdminRole = (typeof ADMIN_ROLES)[number]

/** Whether `role` changes the team: invites, new setup links, turning off. */
export const managesTeam = (role: AdminRole): boolean => role === 'superadmin'

/** Why a reset or a turning off is refused: the api's error code, the app's reason to hide the button. */
export type TeamActionRefusal = 'forbidden' | 'superadmin_only' | 'superadmin_protected'

/**
 * Why `by` may not reset or turn off `target`, or null when they may: nobody touches the superadmin's account
 * (`superadmin_protected`, the superadmin themselves included), never one's own (`forbidden`), and only the superadmin
 * changes the team (`superadmin_only`).
 */
export function teamActionRefusal(by: { id: string; role: AdminRole }, target: { id: string; role: AdminRole }): TeamActionRefusal | null {
  if (target.role === 'superadmin') return 'superadmin_protected'
  if (by.id === target.id) return 'forbidden'
  if (!managesTeam(by.role)) return 'superadmin_only'
  return null
}
