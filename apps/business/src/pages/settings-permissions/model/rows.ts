/**
 * The fixed permissions as Settings → Permissions reads them (design v0.7 · B7-Team B9 «Permissions matrix», book
 * chapter 3): 13 rows × Owner · Admin · Specialist, each cell a symbol — yes, no, Own (only their own column, bookings,
 * clients, earnings) or View (can see, can't change) — with a footnote number where a nuance needs words, and an ⓘ on
 * the row where the action covers more than its name says. Read-only: editing permissions is Later (F-089). Where a
 * row is one of `@yeral/domain/permissions`' rows, it says which, and a test keeps the two in step.
 */
import type { Level, Permission } from '@yeral/domain/permissions'

/** A symbol cell (`settings.permissions.cells.*` for the two chips). */
export type PermissionCell = 'yes' | 'no' | 'own' | 'view'

/** The numbered notes under the matrix (`settings.permissions.notes.n*`). */
export type Footnote = 1 | 2 | 3 | 4
export const FOOTNOTES: readonly Footnote[] = [1, 2, 3, 4]

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
  /** The row's words: `settings.permissions.rows.*`; with `about`, `settings.permissions.about.*` behind its ⓘ. */
  id: PermissionRowId
  /** The domain's row it shows, if it is one. */
  permission?: Permission
  owner: PermissionCell
  admin: PermissionCell
  specialist: PermissionCell
  /** A footnote number beside a level's symbol. */
  notes?: Partial<Record<Level, Footnote>>
  /** The row has an ⓘ saying what the action covers (`settings.permissions.about.*`, keyed like the row). */
  about?: AboutRowId
}

/** The rows whose name doesn't say everything the action covers. */
export type AboutRowId = Extract<PermissionRowId, 'bookings' | 'report' | 'clientsManage' | 'revenue' | 'settings' | 'team'>

export const PERMISSION_ROWS: readonly PermissionRow[] = [
  { id: 'calendar', permission: 'calendar', owner: 'yes', admin: 'yes', specialist: 'own', notes: { specialist: 2 } },
  // who answers isn't the table's `answerRequests` alone: «Who answers requests?» decides (`canAnswerRequest`), so every
  // level's symbol carries note 1
  { id: 'answer', owner: 'yes', admin: 'yes', specialist: 'own', notes: { owner: 1, admin: 1, specialist: 1 } },
  { id: 'bookings', permission: 'bookings', owner: 'yes', admin: 'yes', specialist: 'own', about: 'bookings' },
  { id: 'report', permission: 'noshow', owner: 'yes', admin: 'yes', specialist: 'own', about: 'report' },
  { id: 'clients', permission: 'clients', owner: 'yes', admin: 'yes', specialist: 'own' },
  { id: 'clientsManage', owner: 'yes', admin: 'yes', specialist: 'no', about: 'clientsManage' },
  { id: 'revenue', permission: 'revenue', owner: 'yes', admin: 'no', specialist: 'own', about: 'revenue' },
  { id: 'reviews', owner: 'yes', admin: 'yes', specialist: 'own' },
  { id: 'reviewsReply', permission: 'reviewsReply', owner: 'yes', admin: 'yes', specialist: 'no' },
  { id: 'services', permission: 'services', owner: 'yes', admin: 'yes', specialist: 'no' },
  { id: 'settings', permission: 'settings', owner: 'yes', admin: 'yes', specialist: 'no', about: 'settings' },
  { id: 'shifts', owner: 'yes', admin: 'view', specialist: 'own', notes: { specialist: 3 } },
  { id: 'team', permission: 'team', owner: 'yes', admin: 'view', specialist: 'no', notes: { admin: 4 }, about: 'team' },
]
