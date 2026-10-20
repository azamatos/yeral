import { describe, expect, it } from 'vitest'
import {
  answersRequests,
  can,
  canAnswerRequest,
  canManageTeam,
  canOn,
  LEVELS,
  PERMISSION_TABLE,
  PERMISSIONS,
  scopeOf,
  type Actor,
} from './permissions'

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
    expect(canOn(ayna, 'bookings', ['ayna'])).toBe(true)
    expect(canOn(ayna, 'clients', ['maral'])).toBe(false)
    expect(canOn(ayna, 'clients', ['maral', 'ayna'])).toBe(true)
    expect(canOn(ayna, 'revenue', ['ayna'])).toBe(true)
    for (const p of ['reviewsReply', 'services', 'settings', 'team'] as const) expect(can(ayna, p)).toBe(false)
  })

  it('a booking shared with another specialist: both see it, the owner or an administrator changes it', () => {
    const shared = ['ayna', 'maral']
    expect(canOn(ayna, 'calendar', shared)).toBe(true)
    expect(canOn(ayna, 'bookings', shared)).toBe(false)
    expect(canOn(ayna, 'noshow', shared)).toBe(false)
    expect(canOn(admin, 'bookings', shared)).toBe(true)
    expect(canOn(ayna, 'bookings', [])).toBe(false)
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

  it('a request shared with another specialist is answered by the desk, as its booking would be changed', () => {
    const shared = { staffIds: ['ayna', 'maral'], forPhoneOnlyStaff: false }
    for (const setting of ['each', 'both'] as const) expect(canAnswerRequest(ayna, setting, shared)).toBe(false)
    expect(canAnswerRequest(admin, 'both', shared)).toBe(true)
    expect(canAnswerRequest(owner, 'each', shared)).toBe(true)
  })

  it('requests for a specialist without the app go to the owner and administrators', () => {
    for (const setting of ['desk', 'each', 'both'] as const) {
      expect(canAnswerRequest(admin, setting, phoneOnly)).toBe(true)
      expect(canAnswerRequest(ayna, setting, phoneOnly)).toBe(false)
    }
  })
})

describe('who will answer requests, for the invite card (book B-08)', () => {
  const at = (answerers: 'desk' | 'each' | 'both', more: { instant?: boolean; phoneOnlyStaff?: boolean } = {}) => ({
    answerers,
    instant: more.instant ?? false,
    phoneOnlyStaff: more.phoneOnlyStaff ?? false,
  })
  const admin = { level: 'admin' as const, canAnswerOwn: true }
  const specialist = { level: 'specialist' as const, canAnswerOwn: true }
  it('an administrator: where the desk answers, or for specialists without the app', () => {
    expect([answersRequests(admin, at('desk')), answersRequests(admin, at('both')), answersRequests(admin, at('each'))]).toEqual([
      true,
      true,
      false,
    ])
    expect(answersRequests(admin, at('each', { phoneOnlyStaff: true }))).toBe(true)
  })
  it('a specialist: their own where each answers, unless the owner took it away', () => {
    expect([
      answersRequests(specialist, at('desk')),
      answersRequests(specialist, at('each')),
      answersRequests(specialist, at('both')),
    ]).toEqual([false, true, true])
    expect(answersRequests({ ...specialist, canAnswerOwn: false }, at('both'))).toBe(false)
  })
  it('nobody where bookings confirm at once', () => {
    expect(answersRequests(admin, at('desk', { instant: true }))).toBe(false)
    expect(answersRequests(specialist, at('both', { instant: true }))).toBe(false)
  })
})
