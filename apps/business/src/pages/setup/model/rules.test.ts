import { DEFAULT_RULES } from '@yeral/domain/rules'
import { describe, expect, it } from 'vitest'
import { BUFFER_CHOICES, CANCEL_CHOICES, choicesWith, formFrom, hasTeam, rulesUpdate } from './rules'

describe('the booking rules step', () => {
  it('starts from the rules the draft has: I confirm, 30 min, up to 2 h before, a 10 min buffer', () => {
    expect(formFrom(DEFAULT_RULES)).toEqual({
      confirmMode: 'manual',
      holdMinutes: 30,
      requestAnswerers: 'both',
      cancelWindowMinutes: 120,
      bufferMinutes: 10,
    })
  })

  it('saves only what changed, and nothing when nothing did', () => {
    const stored = formFrom(DEFAULT_RULES)
    expect(rulesUpdate(stored, stored)).toBeNull()
    expect(rulesUpdate({ ...stored, confirmMode: 'instant', cancelWindowMinutes: null }, stored)).toEqual({
      confirmMode: 'instant',
      cancelWindowMinutes: null,
    })
  })

  it('keeps a value Settings set that the step does not offer', () => {
    expect(choicesWith(BUFFER_CHOICES, 10)).toEqual([0, 5, 10, 15, 20, 30])
    expect(choicesWith(BUFFER_CHOICES, 45)).toEqual([0, 5, 10, 15, 20, 30, 45])
    // any time (null) stays first
    expect(choicesWith(CANCEL_CHOICES, null)[0]).toBeNull()
  })

  it('does not send the hold or who answers once instant confirmation hides them', () => {
    const stored = formFrom(DEFAULT_RULES)
    expect(rulesUpdate({ ...stored, holdMinutes: 1440, requestAnswerers: 'each', confirmMode: 'instant' }, stored)).toEqual({
      confirmMode: 'instant',
    })
  })

  it('asks who answers requests once someone besides the owner signs in', () => {
    const person = { status: 'active', hasApp: true, joined: true, invite: null } as const
    const owner = { ...person, level: 'owner' } as const
    const invite = (state: 'pending' | 'declined') => ({ id: 'i1', state, sentAt: 1, expiresAt: 2 })
    expect(hasTeam([owner])).toBe(false)
    expect(hasTeam([owner, { ...person, level: 'specialist', hasApp: false }])).toBe(false)
    expect(hasTeam([owner, { ...person, level: 'specialist', status: 'removed' }])).toBe(false)
    expect(hasTeam([owner, { ...person, level: 'specialist', status: 'invited', joined: false, invite: invite('declined') }])).toBe(false)
    expect(hasTeam([owner, { ...person, level: 'specialist', status: 'invited', joined: false, invite: invite('pending') }])).toBe(true)
    expect(hasTeam([owner, { ...person, level: 'admin' }])).toBe(true)
  })
})
