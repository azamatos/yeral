import type { Menu } from '@yeral/contract/services'
import type { TeamMember } from '@yeral/contract/team'
import { describe, expect, it } from 'vitest'
import { formOf, isDirty, phoneEditable, phoneEditProblem, saveOf, usesAppNow } from './member'

const NOW = Date.UTC(2026, 9, 25, 9)
const DAY = 86_400_000
const member = (patch: Partial<TeamMember>): TeamMember => ({
  id: 'gul',
  name: 'Gülnar',
  fullName: null,
  specialization: 'Stylist',
  phone: '+99365334455',
  level: 'specialist',
  status: 'active',
  hasApp: false,
  bookable: true,
  canAnswerOwn: true,
  joined: false,
  photo: null,
  invite: null,
  ...patch,
})
const menu = {
  groups: [
    {
      id: 'g',
      name: { en: 'Nails' },
      services: [
        { id: 's1', staffIds: ['gul'] },
        { id: 's2', staffIds: [] },
      ],
    },
  ],
} as unknown as Menu
const waiting = { id: 'i', state: 'pending' as const, sentAt: NOW - DAY, expiresAt: NOW + 6 * DAY }

describe('the staff drawer', () => {
  it('opens with the person as listed, their services from the menu, «Uses the app» on while an invite waits', () => {
    const m = member({})
    expect(formOf(m, menu, NOW)).toEqual({
      name: 'Gülnar',
      fullName: '',
      specialization: 'Stylist',
      phone: '65334455',
      level: 'specialist',
      app: false,
      canAnswerOwn: true,
      serviceIds: ['s1'],
    })
    expect(usesAppNow(member({ invite: waiting }), NOW)).toBe(true)
    expect(usesAppNow(member({ invite: { ...waiting, expiresAt: NOW - 1 } }), NOW)).toBe(false)
    expect(usesAppNow(member({ hasApp: true, joined: true }), NOW)).toBe(true)
  })

  it('lets the owner change only the phone of someone without the app who never joined', () => {
    expect(phoneEditable(member({}))).toBe(true)
    expect(phoneEditable(member({ hasApp: true }))).toBe(false)
    expect(phoneEditable(member({ joined: true }))).toBe(false)
    expect(phoneEditable(member({ level: 'owner', hasApp: true }))).toBe(false)
    const people = [
      member({}),
      member({ id: 'maral', phone: '+99365112233' }),
      member({ id: 'ayna', phone: '+99365998877', status: 'removed' }),
    ]
    expect(phoneEditProblem('6511', people[0]!, people)).toBe('incomplete')
    expect(phoneEditProblem('12345678', people[0]!, people)).toBe('notMobile')
    expect(phoneEditProblem('65112233', people[0]!, people)).toBe('onTeam')
    // someone no longer on the team doesn't hold the number, nor the person's own
    expect(phoneEditProblem('65998877', people[0]!, people)).toBeNull()
    expect(phoneEditProblem('65334455', people[0]!, people)).toBeNull()
  })

  it('sends only what changed: the profile and the access in one change, the services apart, an invite to turn the app on', () => {
    const m = member({})
    const was = formOf(m, menu, NOW)
    expect(saveOf(m, was, was, 'en')).toEqual({ update: null, serviceIds: null, invite: false })
    expect(isDirty(was, { ...was, serviceIds: ['s1'] })).toBe(false)
    const changed = {
      ...was,
      name: ' Gülnar Ö. ',
      fullName: 'Gülnar Öwezowa',
      specialization: '',
      phone: '65112299',
      serviceIds: ['s2', 's1'],
    }
    expect(isDirty(was, changed)).toBe(true)
    expect(saveOf(m, was, changed, 'en')).toEqual({
      update: { name: 'Gülnar Ö.', fullName: 'Gülnar Öwezowa', specialization: null, phone: '+99365112299' },
      serviceIds: ['s2', 's1'],
      invite: false,
    })
    expect(saveOf(m, was, { ...was, app: true }, 'en')).toEqual({ update: null, serviceIds: null, invite: true })
    const invited = member({ status: 'invited', hasApp: true, invite: waiting })
    const off = formOf(invited, menu, NOW)
    expect(saveOf(invited, off, { ...off, app: false, canAnswerOwn: false }, 'en').update).toEqual({ canAnswerOwn: false, hasApp: false })
    // the specialization in the app's language; someone with the app keeps their number
    const joined = member({ hasApp: true, joined: true })
    const j = formOf(joined, menu, NOW)
    expect(saveOf(joined, j, { ...j, phone: '65112299', specialization: 'Colourist' }, 'en').update).toEqual({
      specialization: { en: 'Colourist' },
    })
  })
})
