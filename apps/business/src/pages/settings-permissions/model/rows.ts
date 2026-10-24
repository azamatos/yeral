/**
 * The fixed permissions as Team → Permissions reads them (design §28.1 «Fixed permissions», B-Team `tab=permissions`,
 * DS-Business): 13 rows × Owner · Admin · Specialist, each cell yes, no or a short text («Own», «View only»). Read-only:
 * editing permissions is Later (F-089). Where a row is one of `@yeral/domain/permissions`' rows, it says which, and a
 * test keeps the two in step.
 */
import type { Permission } from '@yeral/domain/permissions'

/** Yes, no, or the words of a narrower reach (`settings.permissions.cells.*`). */
export type PermissionCell =
  | 'yes'
  | 'no'
  | 'own'
  | 'ownColumn'
  | 'perAnswers'
  | 'ownAnswers'
  | 'ownBookings'
  | 'ownClients'
  | 'ownEarnings'
  | 'aboutThem'
  | 'viewOnly'
  | 'seeOwn'

export type PermissionRowId =
  | 'calendar'
  | 'answer'
  | 'bookings'
  | 'report'
  | 'clients'
  | 'clientsManage'
  | 'revenue'
  | 'reviews'
  | 'reviewsReply'
  | 'services'
  | 'settings'
  | 'shifts'
  | 'team'

export interface PermissionRow {
  /** The row's words: `settings.permissions.rows.*`. */
  id: PermissionRowId
  /** The domain's row it shows, if it is one. */
  permission?: Permission
  owner: PermissionCell
  admin: PermissionCell
  specialist: PermissionCell
}

export const PERMISSION_ROWS: readonly PermissionRow[] = [
  { id: 'calendar', permission: 'calendar', owner: 'yes', admin: 'yes', specialist: 'ownColumn' },
  // who answers isn't the table's `answerRequests` alone: «Who answers requests?» decides (`canAnswerRequest`); the
  // board draws the admin's check, the book says the setting narrows it too, so the admin's cell says so
  { id: 'answer', owner: 'yes', admin: 'perAnswers', specialist: 'ownAnswers' },
  { id: 'bookings', permission: 'bookings', owner: 'yes', admin: 'yes', specialist: 'own' },
  { id: 'report', permission: 'noshow', owner: 'yes', admin: 'yes', specialist: 'ownBookings' },
  { id: 'clients', permission: 'clients', owner: 'yes', admin: 'yes', specialist: 'ownClients' },
  { id: 'clientsManage', owner: 'yes', admin: 'yes', specialist: 'no' },
  { id: 'revenue', permission: 'revenue', owner: 'yes', admin: 'no', specialist: 'ownEarnings' },
  { id: 'reviews', owner: 'yes', admin: 'yes', specialist: 'aboutThem' },
  { id: 'reviewsReply', permission: 'reviewsReply', owner: 'yes', admin: 'yes', specialist: 'no' },
  { id: 'services', permission: 'services', owner: 'yes', admin: 'yes', specialist: 'no' },
  { id: 'settings', permission: 'settings', owner: 'yes', admin: 'yes', specialist: 'no' },
  { id: 'shifts', owner: 'yes', admin: 'viewOnly', specialist: 'seeOwn' },
  { id: 'team', permission: 'team', owner: 'yes', admin: 'viewOnly', specialist: 'no' },
]
