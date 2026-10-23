import type { TeamMember } from '@yeral/contract/team'
import { describe, expect, it } from 'vitest'
import { emptyRow, formFrom, rowProblem, sameTeam, teamHint, teamInput, type TeamRow } from './team'

const OWNER = '+99365000001'
const row = (patch: Partial<TeamRow>): TeamRow => ({ ...emptyRow(), ...patch })
const person = (id: string, level: TeamMember['level'], hasApp = true): TeamMember => ({
  id,
  name: id,
  fullName: null,
  specialization: null,
  phone: `+9936500000${id.length}`,
  level,
  status: hasApp ? 'invited' : 'active',
  hasApp,
  bookable: level === 'specialist',
  canAnswerOwn: false,
  joined: false,
  photo: null,
  invite: null,
})

describe('the team step', () => {
  it('reopens with the draft’s people besides the owner, or «I work alone» with nobody', () => {
    expect(formFrom([person('o', 'owner')])).toEqual({ solo: true, rows: [] })
    const form = formFrom([person('o', 'owner'), person('ay', 'specialist', false), person('lei', 'admin')])
    expect(form.solo).toBe(false)
    expect(form.rows.map((r) => [r.name, r.phone, r.level, r.hasApp])).toEqual([
      ['ay', '65000002', 'specialist', false],
      ['lei', '65000003', 'admin', true],
    ])
  })

  it('a row needs a name and a whole mobile number, with the app or without it', () => {
    expect(rowProblem(row({ name: 'Aýna', phone: '6512' }), [], OWNER)).toBe('incomplete')
    expect(rowProblem(row({ phone: '65123456' }), [], OWNER)).toBe('incomplete')
    expect(rowProblem(row({ name: 'Aýna', phone: '12345678' }), [], OWNER)).toBe('notMobile')
    expect(rowProblem(row({ name: 'Aýna', phone: '12345678', hasApp: false }), [], OWNER)).toBe('notMobile')
    expect(rowProblem(row({ name: 'Aýna', phone: '65123456' }), [], OWNER)).toBeNull()
  })

  it('nobody twice, and not the owner’s own number', () => {
    const a = row({ name: 'Aýna', phone: '65123456' })
    const b = row({ name: 'Leýli', phone: '65123456' })
    expect(rowProblem(a, [a, b], OWNER)).toBe('taken')
    expect(rowProblem(row({ name: 'Me', phone: '65000001' }), [], OWNER)).toBe('taken')
  })

  it('waits for someone with «I have a team», and for every filled row to be right; empty rows don’t count', () => {
    expect(teamHint({ solo: true, rows: [] }, OWNER)).toBeNull()
    expect(teamHint({ solo: false, rows: [emptyRow()] }, OWNER)).toBe('addOrSolo')
    expect(teamHint({ solo: false, rows: [row({ name: 'Aýna' })] }, OWNER)).toBe('fixRows')
    expect(teamHint({ solo: false, rows: [row({ name: 'Aýna', phone: '65123456' }), emptyRow()] }, OWNER)).toBeNull()
  })

  it('sends the filled rows as the api takes them, nobody for «I work alone»', () => {
    const form = { solo: false, rows: [row({ name: ' Aýna ', phone: '65123456', level: 'admin', hasApp: false }), emptyRow()] }
    expect(teamInput(form)).toEqual({ members: [{ name: 'Aýna', phone: '+99365123456', level: 'admin', hasApp: true }] })
    expect(teamInput({ ...form, solo: true })).toEqual({ members: [] })
    expect(sameTeam(form, { ...form, rows: [...form.rows, emptyRow()] })).toBe(true)
    expect(sameTeam(form, { solo: true, rows: [] })).toBe(false)
  })
})
