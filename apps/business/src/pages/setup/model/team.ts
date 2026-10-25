import type { SetupTeam } from '@yeral/contract/setup'
import type { TeamMember } from '@yeral/contract/team'
import { MARKET } from '@yeral/domain/market'
import { isMobile, isPhone, nationalDigits, toE164 } from '@yeral/domain/phone'

/** A row of step 6: the name, the national digits as typed, the access level, and whether they use the app. */
export type TeamRow = { key: string; name: string; phone: string; level: 'specialist' | 'admin'; hasApp: boolean }
export type TeamForm = { solo: boolean; rows: TeamRow[] }

/** What's wrong with a row, or nothing: the caption under it and the step's hint say it. */
export type RowProblem = 'notMobile' | 'incomplete' | 'taken' | null

let keys = 0
/** A new, empty row: a specialist with the app (B-Onboarding's `addStaff`). */
export const emptyRow = (): TeamRow => ({ key: `new-${++keys}`, name: '', phone: '', level: 'specialist', hasApp: true })

/** The step as the draft's team leaves it: its people besides the owner, or «I work alone» with nobody. */
export function formFrom(members: TeamMember[]): TeamForm {
  const rows = members
    .filter((m) => m.level !== 'owner' && m.status !== 'removed')
    .map((m) => ({
      key: m.id,
      name: m.name,
      phone: nationalDigits(m.phone ?? ''),
      level: m.level === 'admin' ? ('admin' as const) : ('specialist' as const),
      hasApp: m.level === 'admin' || m.hasApp,
    }))
  return { solo: rows.length === 0, rows }
}

/** A row with nothing typed doesn't count (B-Onboarding: `filled`). */
export const isFilled = (row: TeamRow) => row.name.trim().length > 0 || row.phone.length > 0

/** An administrator always signs in; a specialist without the app never does. */
export const usesApp = (row: TeamRow) => row.level === 'admin' || row.hasApp

/**
 * A row's problem: a complete number that isn't a mobile one (everyone's, with the app or not: it's how they sign in,
 * now or later; B-Onboarding), a missing name or number, the same number twice or the owner's own.
 */
export function rowProblem(row: TeamRow, rows: TeamRow[], ownerPhone: string): RowProblem {
  const complete = row.phone.length === MARKET.phone.length
  if (complete && !isMobile(row.phone)) return 'notMobile'
  if (!row.name.trim() || !complete) return 'incomplete'
  const twice = rows.some((r) => r !== row && isFilled(r) && r.phone === row.phone)
  return twice || row.phone === nationalDigits(ownerPhone) ? 'taken' : null
}

/** Why Continue waits, or nothing: nobody added with «I have a team», or a row to fix (B-Onboarding: `v5`, `h5`). */
export function teamHint(form: TeamForm, ownerPhone: string): 'addOrSolo' | 'fixRows' | null {
  if (form.solo) return null
  const filled = form.rows.filter(isFilled)
  if (!filled.length) return 'addOrSolo'
  return filled.some((r) => rowProblem(r, form.rows, ownerPhone)) ? 'fixRows' : null
}

/** What `PUT …/setup/team` gets: the filled rows, or nobody for «I work alone». */
export function teamInput(form: TeamForm): SetupTeam {
  if (form.solo) return { members: [] }
  return {
    members: form.rows.filter(isFilled).map((r) => ({
      name: r.name.trim(),
      // a stored row without a whole number (none) is sent as it is: the api names it
      phone: isPhone(r.phone) ? toE164(r.phone) : r.phone,
      level: r.level,
      hasApp: usesApp(r),
    })),
  }
}

/** The same team as saved: nothing to send. */
export function sameTeam(form: TeamForm, stored: TeamForm): boolean {
  return JSON.stringify(teamInput(form)) === JSON.stringify(teamInput(stored))
}
