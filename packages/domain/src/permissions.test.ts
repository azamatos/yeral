import { describe, expect, it } from 'vitest'
import { can, canAnswerRequest, canManageTeam, canOn, LEVELS, PERMISSION_TABLE, PERMISSIONS, scopeOf, type Actor } from './permissions'

const owner: Actor = { level: 'owner', staffId: 'mays', canAnswerOwn: true }
const admin: Actor = { level: 'admin', staffId: 'selbi', canAnswerOwn: true }
const ayna: Actor = { level: 'specialist', staffId: 'ayna', canAnswerOwn: true }
const quietAyna: Actor = { ...ayna, canAnswerOwn: false }
const aynas = { staffIds: ['ayna'], forPhoneOnlyStaff: false }
const marals = { staffIds: ['maral'], forPhoneOnlyStaff: false }
const phoneOnly = { staffIds: ['lale'], forPhoneOnlyStaff: true }

describe('three fixed levels (book chapter 3)', () => {
  it('the owner can do everything', () => {
    for (const p of PERMISSIONS) expect(['all', 'manage']).toContain(scopeOf(owner, p))
    expect(canManageTeam(owner)).toBe(true)
  })

  it('an administrator runs the front desk: no money, sees the team without changing it', () => {
    expect(canOn(admin, 'calendar', ['maral'])).toBe(true)
    expect(canOn(admin, 'clients', ['maral'])).toBe(true)
    expect(can(admin, 'reviewsReply')).toBe(true)
    expect(can(admin, 'services')).toBe(true)
    expect(can(admin, 'settings')).toBe(true)
    expect(can(admin, 'revenue')).toBe(false)
    expect(scopeOf(admin, 'team')).toBe('view')
    expect(canManageTeam(admin)).toBe(false)
  })

  it('a specialist sees and acts on their own column, clients and earnings only', () => {
    expect(canOn(ayna, 'calendar', ['ayna'])).toBe(true)
    expect(canOn(ayna, 'calendar', ['maral'])).toBe(false)
    expect(canOn(ayna, 'bookings', ['ayna', 'maral'])).toBe(true)
    expect(canOn(ayna, 'clients', ['maral'])).toBe(false)
    expect(canOn(ayna, 'revenue', ['ayna'])).toBe(true)
    for (const p of ['reviewsReply', 'services', 'settings', 'team'] as const) expect(can(ayna, p)).toBe(false)
  })

  it('every level has a value for every row, and only the team row says view or manage', () => {
    for (const level of LEVELS) {
      expect(Object.keys(PERMISSION_TABLE[level]).sort()).toEqual([...PERMISSIONS].sort())
      for (const p of PERMISSIONS) {
        const scope = PERMISSION_TABLE[level][p]
        if (p === 'team') expect(['none', 'view', 'manage']).toContain(scope)
        else expect(['none', 'own', 'all']).toContain(scope)
      }
    }
  })
})

describe('who answers requests (book chapter 3)', () => {
  it('the owner always answers', () => {
    for (const setting of ['desk', 'each', 'both'] as const) expect(canAnswerRequest(owner, setting, marals)).toBe(true)
  })

  it('"Administrator we eýesi": the front desk answers, specialists only see their requests', () => {
    expect(canAnswerRequest(admin, 'desk', marals)).toBe(true)
    expect(canAnswerRequest(ayna, 'desk', aynas)).toBe(false)
  })

  it('"Her hünärmen özi": each specialist answers their own, administrators watch', () => {
    expect(canAnswerRequest(ayna, 'each', aynas)).toBe(true)
    expect(canAnswerRequest(ayna, 'each', marals)).toBe(false)
    expect(canAnswerRequest(admin, 'each', marals)).toBe(false)
  })

  it('"Ikisi hem" (the default): whoever is first', () => {
    expect(canAnswerRequest(admin, 'both', marals)).toBe(true)
    expect(canAnswerRequest(ayna, 'both', aynas)).toBe(true)
    expect(canAnswerRequest(ayna, 'both', marals)).toBe(false)
  })

  it('the owner can take the right to answer one’s own requests away', () => {
    expect(canAnswerRequest(quietAyna, 'each', aynas)).toBe(false)
    expect(canAnswerRequest(quietAyna, 'both', aynas)).toBe(false)
  })

  it('requests for a specialist without the app go to the owner and administrators', () => {
    for (const setting of ['desk', 'each', 'both'] as const) {
      expect(canAnswerRequest(admin, setting, phoneOnly)).toBe(true)
      expect(canAnswerRequest(ayna, setting, phoneOnly)).toBe(false)
    }
  })
})
