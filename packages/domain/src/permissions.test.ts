import { describe, expect, it } from 'vitest'
import { can, canActOn, canManageRoles, isValidGrant, ROLE_TEMPLATES, seesBooking, type Actor } from './permissions'

const owner: Actor = { role: ROLE_TEMPLATES.owner, staffId: 'mays' }
const admin: Actor = { role: ROLE_TEMPLATES.admin, staffId: 'selbi' }
const ayna: Actor = { role: ROLE_TEMPLATES.specialist, staffId: 'ayna' }
const ownBooking = { staffIds: ['ayna'] }
const maralBooking = { staffIds: ['maral'] }

describe('roles (business spec §1)', () => {
  it('the owner can do everything, including roles', () => {
    expect(can(owner, 'revenue')).toBe(true)
    expect(can(owner, 'settings')).toBe(true)
    expect(canManageRoles(owner)).toBe(true)
  })

  it('an admin sees the whole calendar but no revenue, settings or roles', () => {
    expect(seesBooking(admin, maralBooking)).toBe(true)
    expect(can(admin, 'confirm')).toBe(true)
    expect(can(admin, 'invite')).toBe(true)
    expect(can(admin, 'revenue')).toBe(false)
    expect(can(admin, 'settings')).toBe(false)
    expect(canManageRoles(admin)).toBe(false)
  })

  it('a specialist sees and acts on their own bookings; others are "Bes"', () => {
    expect(seesBooking(ayna, ownBooking)).toBe(true)
    expect(seesBooking(ayna, maralBooking)).toBe(false)
    expect(canActOn(ayna, 'confirm', ownBooking)).toBe(true)
    expect(canActOn(ayna, 'confirm', maralBooking)).toBe(false)
    expect(canActOn(ayna, 'clients', ownBooking)).toBe(false)
  })

  it('a specialist role without a staff row sees nothing', () => {
    expect(seesBooking({ role: ROLE_TEMPLATES.specialist, staffId: null }, ownBooking)).toBe(false)
  })

  it('edited roles stay inside the permission list and never become the owner', () => {
    expect(isValidGrant({ system: false, visibility: 'own', permissions: ['confirm', 'revenue'] })).toBe(true)
    expect(isValidGrant({ system: true, visibility: 'all', permissions: [] })).toBe(false)
  })
})
