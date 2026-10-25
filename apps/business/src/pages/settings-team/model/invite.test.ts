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
  ended: null,
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
  it('waits for a whole number, then takes mobile numbers only, a pasted country code or trunk prefix too', () => {
    expect(phoneProblem('6512', true, [], NOW)).toBeNull()
    expect(phoneProblem('12345678', true, [], NOW)).toBe('notMobile')
    expect(phoneProblem('12345678', false, [], NOW)).toBe('notMobile')
    // 8 digits that aren't a number of this market: a pasted «+993 65…» kept as 99365123, or one that starts with 0
    expect(phoneProblem('99365123', true, [], NOW)).toBe('notMobile')
    expect(phoneProblem('01234567', true, [], NOW)).toBe('notMobile')
    expect(whoDone(form({ phone: '99365123', name: 'Gülnar' }), 'notMobile')).toBe(false)
    expect(phoneProblem('65123456', true, [], NOW)).toBeNull()
  })

  it('says why a number on the team, or with an invite, can’t be added again', () => {
    expect(phoneProblem('65123456', true, [member('65123456', {})], NOW)).toBe('onTeam')
    // a specialist without the app is on the team too
    expect(phoneProblem('65123456', true, [member('65123456', { hasApp: false, joined: false })], NOW)).toBe('onTeam')
    const open = member('65123456', { status: 'invited', joined: false, invite: invite('pending') })
    expect(phoneProblem('65123456', true, [open], NOW)).toBe('openInvite')
    // an invite past its end reads as ended even while the list still says pending
    const ended = member('65123456', { status: 'invited', joined: false, invite: invite('pending', NOW - 1) })
    expect(phoneProblem('65123456', true, [ended], NOW)).toBe('earlierInvite')
    const declined = member('65123456', { status: 'invited', joined: false, invite: invite('declined') })
    expect(phoneProblem('65123456', true, [declined], NOW)).toBe('earlierInvite')
  })

  it('invites someone no longer on the team again with the app, and sends them to Reactivate without it', () => {
    const gone = member('65123456', { status: 'removed' })
    expect(phoneProblem('65123456', true, [gone], NOW)).toBeNull()
    expect(phoneProblem('65123456', false, [gone], NOW)).toBe('removed')
  })

  it('needs a name and a clear mobile number for step 1, and a specialist’s services for step 2', () => {
    expect(whoDone(form({ phone: '65123456' }), null)).toBe(false)
    expect(whoDone(form({ phone: '65123456', name: 'Gülnar' }), 'onTeam')).toBe(false)
    expect(whoDone(form({ phone: '651234', name: 'Gülnar' }), null)).toBe(false)
    expect(whoDone(form({ phone: '65123456', name: 'Gülnar' }), null)).toBe(true)
    expect(servicesDone(form({}), true)).toBe(false)
    expect(servicesDone(form({ serviceIds: ['s1'] }), true)).toBe(true)
    expect(servicesDone(form({ level: 'admin' }), true)).toBe(true)
    expect(servicesDone(form({}), false)).toBe(true)
  })

  it('sends the number in E.164, the trimmed names, and the specialization in the app’s language', () => {
    expect(usesApp(form({ level: 'admin', hasApp: false }))).toBe(true)
    expect(usesApp(form({ hasApp: false }))).toBe(false)
    const input = inviteInput(
      form({ phone: '65123456', name: ' Gülnar ', fullName: ' Gülnar Öwezowa ', specialization: ' stylist ', serviceIds: ['s1'] }),
      'en',
    )
    expect(input).toEqual({
      phone: '+99365123456',
      level: 'specialist',
      name: 'Gülnar',
      fullName: 'Gülnar Öwezowa',
      specialization: { en: 'stylist' },
      serviceIds: ['s1'],
    })
    const bare = inviteInput(form({ phone: '65123456', name: 'Gülnar' }), 'en')
    expect([bare.fullName, bare.specialization]).toEqual([undefined, undefined])
  })
})
