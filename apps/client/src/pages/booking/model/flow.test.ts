import { describe, expect, it } from 'vitest'
import { bookingSearchSchema, chosenStaff, currentStep, partOfDay, reachedStep, slotsByPart, stepDone } from './flow'

const detail = {
  specialists: [
    { id: 'ayna', serviceIds: ['cut', 'colour'] },
    { id: 'maral', serviceIds: ['mani'] },
  ],
}

describe('the booking address', () => {
  it('keeps what it can read and drops the rest', () => {
    expect(bookingSearchSchema.parse({ services: 'cut', staff: 'any', date: '2026-10-25', time: '14:30', step: 'time' })).toEqual({
      services: 'cut',
      staff: 'any',
      date: '2026-10-25',
      time: '14:30',
      step: 'time',
    })
    expect(bookingSearchSchema.parse({ date: '25.10.2026', time: '25:00', step: 'pay' })).toEqual({})
  })
})

describe('the specialist', () => {
  it('stays while they do every picked service, else it is anyone', () => {
    expect(chosenStaff(detail, ['cut', 'colour'], 'ayna')).toBe('ayna')
    expect(chosenStaff(detail, ['cut', 'mani'], 'ayna')).toBe('any')
    expect(chosenStaff(detail, ['cut'], 'nobody')).toBe('any')
    expect(chosenStaff(detail, ['cut'], undefined)).toBe('any')
  })
})

describe('the steps', () => {
  it('reach the time with a service and the confirmation with a time', () => {
    expect(reachedStep({ services: [], time: null })).toBe(0)
    expect(reachedStep({ services: ['cut'], time: null })).toBe(2)
    expect(reachedStep({ services: ['cut'], time: 870 })).toBe(3)
  })

  it('hold an asked step back to what is reached', () => {
    expect(currentStep('confirm', { services: [], time: null })).toBe('services')
    expect(currentStep('confirm', { services: ['cut'], time: null })).toBe('time')
    expect(currentStep('staff', { services: ['cut'], time: 870 })).toBe('staff')
    expect(currentStep(undefined, { services: ['cut'], time: 870 })).toBe('services')
  })

  it('go on once their own choice is made', () => {
    expect(stepDone('services', { services: [], time: null })).toBe(false)
    expect(stepDone('staff', { services: ['cut'], time: null })).toBe(true)
    expect(stepDone('time', { services: ['cut'], time: null })).toBe(false)
    expect(stepDone('time', { services: ['cut'], time: 600 })).toBe(true)
  })
})

describe('the times by part of day', () => {
  it('splits at 12:00 and 17:00 and leaves out empty parts', () => {
    expect([partOfDay(540), partOfDay(720), partOfDay(1019), partOfDay(1020)]).toEqual(['morning', 'afternoon', 'afternoon', 'evening'])
    expect(slotsByPart([{ start: 600 }, { start: 1050 }]).map((g) => g.part)).toEqual(['morning', 'evening'])
  })
})
