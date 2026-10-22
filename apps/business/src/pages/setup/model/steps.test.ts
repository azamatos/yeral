import { describe, expect, it } from 'vitest'
import { isWizardStep, nextStep, stepFor, stepIndex } from './steps'

describe('the setup wizard steps', () => {
  it('starts with the phone, then the draft steps', () => {
    expect(stepIndex('phone')).toBe(0)
    expect(stepIndex('business')).toBe(1)
    expect(stepIndex('done')).toBe(7)
    expect(isWizardStep('hours')).toBe(true)
    expect(isWizardStep('billing')).toBe(false)
  })

  it('moves on one step at a time', () => {
    expect(nextStep('business')).toBe('address')
    expect(nextStep('rules')).toBe('done')
    expect(nextStep('done')).toBeNull()
  })
})

describe('stepFor', () => {
  it('opens the business step without a draft, whatever was asked', () => {
    expect(stepFor('phone', null)).toBe('business')
    expect(stepFor('business', null)).toBe('business')
    expect(stepFor('hours', null)).toBe('business')
  })

  it('skips the phone step for someone signed in: the draft reopens at its saved step', () => {
    expect(stepFor('phone', 'hours')).toBe('hours')
  })

  it('opens any step up to the saved one, never a later one', () => {
    expect(stepFor('business', 'hours')).toBe('business')
    expect(stepFor('hours', 'hours')).toBe('hours')
    expect(stepFor('team', 'hours')).toBe('hours')
  })
})
