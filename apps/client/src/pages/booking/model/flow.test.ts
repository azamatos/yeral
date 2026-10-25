import { describe, expect, it } from 'vitest'
import { bookingSearchSchema, chosenStaff, currentStep, partOfDay, reachedStep, slotsByPart, stepDone } from './flow'

const detail = {
  specialists: [
    { id: 'ayna', serviceIds: ['cut', 'colour'] },
    { id: 'maral', serviceIds: ['mani'] },
  ],
}

const none = { services: [], date: null, time: null }
const cut = { services: ['cut'], date: null, time: null }
const timed = { services: ['cut'], date: '2026-10-25', time: 870 }

describe('the booking address', () => {
  it('keeps what it can read and drops the rest', () => {
    expect(bookingSearchSchema.parse({ services: 'cut', staff: 'any', date: '2026-10-25', time: '870', step: 'time' })).toEqual({
      services: 'cut',
      staff: 'any',
      date: '2026-10-25',
      time: 870,
      step: 'time',
    })
    expect(bookingSearchSchema.parse({ date: '25.10.2026', time: '2880', step: 'pay' })).toEqual({})
  })

  it('holds a start past midnight on its business day', () => {
    expect(bookingSearchSchema.parse({ time: 1470 }).time).toBe(1470)
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
  it('reach the time with a service and the confirmation with a time on its day', () => {
    expect(reachedStep(none)).toBe(0)
    expect(reachedStep(cut)).toBe(2)
    expect(reachedStep({ ...cut, time: 870 })).toBe(2)
    expect(reachedStep(timed)).toBe(3)
  })

  it('hold an asked step back to what is reached', () => {
    expect(currentStep('confirm', none)).toBe('services')
    expect(currentStep('confirm', cut)).toBe('time')
    expect(currentStep('staff', timed)).toBe('staff')
    expect(currentStep(undefined, timed)).toBe('services')
  })

  it('go on once their own choice is made', () => {
    expect(stepDone('services', none)).toBe(false)
    expect(stepDone('staff', cut)).toBe(true)
    expect(stepDone('time', cut)).toBe(false)
    expect(stepDone('time', timed)).toBe(true)
  })
})

describe('the times', () => {
  it('split at 12:00 and 17:00, leaving out empty parts', () => {
    expect([partOfDay(540), partOfDay(720), partOfDay(1019), partOfDay(1020)]).toEqual(['morning', 'afternoon', 'afternoon', 'evening'])
    expect(slotsByPart([{ start: 600 }, { start: 1050 }]).map((g) => g.part)).toEqual(['morning', 'evening'])
  })
})
