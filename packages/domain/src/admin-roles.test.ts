import { describe, expect, it } from 'vitest'
import { ADMIN_ROLES, managesTeam, teamActionRefusal } from './admin-roles'

const SUPER = { id: 's', role: 'superadmin' } as const
const ADMIN = { id: 'a', role: 'admin' } as const
const OTHER = { id: 'b', role: 'admin' } as const

describe('the Ýeral team’s roles (book Q-011, owner 04.11.2026)', () => {
  it('two roles; only the superadmin changes the team', () => {
    expect(ADMIN_ROLES).toEqual(['superadmin', 'admin'])
    expect(managesTeam('superadmin')).toBe(true)
    expect(managesTeam('admin')).toBe(false)
  })

  it.each([
    ['the superadmin on an admin', SUPER, ADMIN, null],
    ['the superadmin on themselves', SUPER, SUPER, 'superadmin_protected'],
    ['an admin on the superadmin', ADMIN, SUPER, 'superadmin_protected'],
    ['an admin on themselves', ADMIN, ADMIN, 'forbidden'],
    ['an admin on another admin', ADMIN, OTHER, 'superadmin_only'],
  ] as const)('%s', (_, by, target, refusal) => {
    expect(teamActionRefusal(by, target)).toBe(refusal)
  })
})
