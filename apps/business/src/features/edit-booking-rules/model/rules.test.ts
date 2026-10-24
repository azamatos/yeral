import { DEFAULT_RULES } from '@yeral/domain/rules'
import { describe, expect, it } from 'vitest'
import { choicesWith } from '@/shared/lib'
import { BUFFER_CHOICES, bufferIsOther, bufferOf, bufferProblem, CANCEL_CHOICES, formFrom, hasTeam, rulesUpdate, savedForm } from './rules'

describe('the booking rules form', () => {
  it('starts from the rules the business has, all but online booking (Business profile pauses it)', () => {
    expect(formFrom(DEFAULT_RULES)).toEqual({
      confirmMode: 'manual',
      holdMinutes: 30,
      requestAnswerers: 'both',
      leadMinutes: 60,
      windowDays: 30,
      bufferMinutes: 10,
      slotStep: 15,
      cancelWindowMinutes: 120,
      askCancelReason: true,
      blockAfterNoShows: 2,
      bufferOther: null,
    })
  })

  it('saves only what changed, and nothing when nothing did', () => {
    const stored = formFrom(DEFAULT_RULES)
    expect(rulesUpdate(stored, stored)).toBeNull()
    expect(rulesUpdate({ ...stored, confirmMode: 'instant', cancelWindowMinutes: null }, stored)).toEqual({
      confirmMode: 'instant',
      cancelWindowMinutes: null,
    })
    expect(
      rulesUpdate({ ...stored, leadMinutes: 0, windowDays: 90, slotStep: 30, askCancelReason: false, blockAfterNoShows: 0 }, stored),
    ).toEqual({ leadMinutes: 0, windowDays: 90, slotStep: 30, askCancelReason: false, blockAfterNoShows: 0 })
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

  it('takes a buffer typed in «Other…» when it is a whole 1–120, and blocks the save otherwise', () => {
    const stored = formFrom(DEFAULT_RULES)
    const other = (text: string) => ({ ...stored, bufferOther: text })
    expect(bufferOf(other('45'))).toBe(45)
    expect(rulesUpdate(other(' 45 '), stored)).toEqual({ bufferMinutes: 45 })
    // the same as the preset it already has: nothing to send
    expect(rulesUpdate(other('10'), stored)).toBeNull()
    for (const bad of ['', '0', '121', '7.5', '-5', 'ten']) {
      expect(bufferProblem(other(bad)), bad).toBe(true)
      // what can't save stays as stored
      expect(rulesUpdate({ ...other(bad), slotStep: 30 }, stored), bad).toEqual({ slotStep: 30 })
    }
    expect(bufferProblem(stored)).toBe(false)
  })

  it('shows «Other…» for a typed buffer and for a stored one the presets lack', () => {
    const stored = formFrom(DEFAULT_RULES)
    expect(bufferIsOther(stored)).toBe(false)
    expect(bufferIsOther({ ...stored, bufferOther: '10' })).toBe(true)
    expect(bufferIsOther(formFrom({ ...DEFAULT_RULES, bufferMinutes: 45 }))).toBe(true)
  })

  it('after a save holds what the business has: the typed buffer a number, a hidden hold as it was', () => {
    const stored = formFrom(DEFAULT_RULES)
    const saved = savedForm({ ...stored, bufferOther: '15', confirmMode: 'instant', holdMinutes: 1440 }, stored)
    expect(saved).toEqual({ ...stored, bufferMinutes: 15, confirmMode: 'instant' })
    expect(rulesUpdate(saved, saved)).toBeNull()
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
    // a draft's team step: invited at the finish, no invite yet
    expect(hasTeam([owner, { ...person, level: 'specialist', status: 'invited', joined: false, invite: null }])).toBe(true)
  })
})
