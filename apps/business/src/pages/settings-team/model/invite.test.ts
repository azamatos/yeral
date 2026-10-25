import type { TeamMember } from '@yeral/contract/team'
import { describe, expect, it } from 'vitest'
import { emptyInvite, inviteInput, phoneProblem, servicesDone, usesApp, whoDone, type InviteForm } from './invite'

const NOW = Date.UTC(2026, 9, 25, 9)
const DAY = 86_400_000
const form = (patch: Partial<InviteForm>): InviteForm => ({ ...emptyInvite, ...patch })
const member = (phone: string, patch: Partial<TeamMember>): TeamMember => ({
  id: phone,
  name: 'Aýna',
  fullName: null,
  specialization: null,
  phone: `+993${phone}`,
  level: 'specialist',
  status: 'active',
  hasApp: true,
  bookable: true,
  canAnswerOwn: false,
  joined: true,
  photo: null,
  invite: null,
  ...patch,
})
const invite = (state: 'pending' | 'expired' | 'declined' | 'cancelled', expiresAt = NOW + 3 * DAY) => ({
  id: 'i1',
  state,
  sentAt: NOW - DAY,
  expiresAt,
})

describe('«Add a team member»', () => {
  it('waits for a whole number, then takes mobile numbers only', () => {
    expect(phoneProblem('6512', [], NOW)).toBeNull()
    expect(phoneProblem('12345678', [], NOW)).toBe('notMobile')
    expect(phoneProblem('65123456', [], NOW)).toBeNull()
  })

  it('says why a number on the team, or with an invite, can’t be added again', () => {
    expect(phoneProblem('65123456', [member('65123456', {})], NOW)).toBe('onTeam')
    // a specialist without the app is on the team too
    expect(phoneProblem('65123456', [member('65123456', { hasApp: false, joined: false })], NOW)).toBe('onTeam')
    expect(phoneProblem('65123456', [member('65123456', { status: 'invited', joined: false, invite: invite('pending') })], NOW)).toBe(
      'openInvite',
    )
    // an invite past its end reads as ended even while the list still says pending
    const ended = member('65123456', { status: 'invited', joined: false, invite: invite('pending', NOW - 1) })
    expect(phoneProblem('65123456', [ended], NOW)).toBe('earlierInvite')
    expect(phoneProblem('65123456', [member('65123456', { status: 'invited', joined: false, invite: invite('declined') })], NOW)).toBe(
      'earlierInvite',
    )
  })

  it('sends someone removed to Reactivate unless they never joined with the app', () => {
    expect(phoneProblem('65123456', [member('65123456', { status: 'removed' })], NOW)).toBe('removed')
    expect(phoneProblem('65123456', [member('65123456', { status: 'removed', hasApp: false, joined: false })], NOW)).toBe('removed')
    expect(phoneProblem('65123456', [member('65123456', { status: 'removed', joined: false })], NOW)).toBeNull()
  })

  it('needs a name and a clear number for step 1, and a specialist’s services for step 2', () => {
    expect(whoDone(form({ phone: '65123456' }), null)).toBe(false)
    expect(whoDone(form({ phone: '65123456', name: 'Gülnar' }), 'onTeam')).toBe(false)
    expect(whoDone(form({ phone: '651234', name: 'Gülnar' }), null)).toBe(false)
    expect(whoDone(form({ phone: '65123456', name: 'Gülnar' }), null)).toBe(true)
    expect(servicesDone(form({}), true)).toBe(false)
    expect(servicesDone(form({ serviceIds: ['s1'] }), true)).toBe(true)
    expect(servicesDone(form({ level: 'admin' }), true)).toBe(true)
    expect(servicesDone(form({}), false)).toBe(true)
  })

  it('sends the number in E.164, the trimmed name, and the specialization in the app’s language', () => {
    expect(usesApp(form({ level: 'admin', hasApp: false }))).toBe(true)
    expect(usesApp(form({ hasApp: false }))).toBe(false)
    expect(inviteInput(form({ phone: '65123456', name: ' Gülnar ', specialization: ' stylist ', serviceIds: ['s1'] }), 'en')).toEqual({
      phone: '+99365123456',
      level: 'specialist',
      name: 'Gülnar',
      specialization: { en: 'stylist' },
      serviceIds: ['s1'],
    })
    expect(inviteInput(form({ phone: '65123456', name: 'Gülnar' }), 'en').specialization).toBeUndefined()
  })
})
