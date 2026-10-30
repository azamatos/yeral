import { ApiError } from '@yeral/sdk'
import { describe, expect, it } from 'vitest'
import {
  bookingSearchSchema,
  chosenStaff,
  currentMoveStep,
  currentStep,
  isOwnTime,
  moveRefusal,
  namedSpecialist,
  notDoneBy,
  partOfDay,
  reachedStep,
  servicesOf,
  slotsByPart,
  stepDone,
  wasOf,
} from './flow'

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

  it('stays named in the address while a picked service is not theirs', () => {
    const ayna = namedSpecialist(detail, 'ayna')
    expect(ayna?.id).toBe('ayna')
    expect(namedSpecialist(detail, 'any')).toBeNull()
    expect(namedSpecialist(detail, 'nobody')).toBeNull()
    expect(notDoneBy(detail.specialists[0]!, ['cut', 'mani', 'colour'])).toEqual(['mani'])
  })

  it('lists only their services, without groups left empty', () => {
    const groups = [
      { id: 'hair', services: [{ id: 'cut' }, { id: 'colour' }] },
      { id: 'nails', services: [{ id: 'mani' }] },
    ]
    expect(servicesOf(groups, { serviceIds: ['colour'] })).toEqual([{ id: 'hair', services: [{ id: 'colour' }] }])
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

describe('move mode', () => {
  it('starts on the specialist, and holds the confirmation back until a new time is chosen', () => {
    expect(currentMoveStep(undefined, false)).toBe('staff')
    expect(currentMoveStep('services', true)).toBe('staff')
    expect(currentMoveStep('confirm', false)).toBe('time')
    expect(currentMoveStep('confirm', true)).toBe('confirm')
  })

  it('keeps the move and its sent page in the address', () => {
    expect(bookingSearchSchema.parse({ move: 'YR-48190', moved: 'asked', was: '2026-10-26@870' })).toEqual({
      move: 'YR-48190',
      moved: 'asked',
      was: '2026-10-26@870',
    })
    expect(bookingSearchSchema.parse({ moved: 'yes', was: 'yesterday' })).toEqual({})
    expect(wasOf('2026-10-26@870')).toEqual({ date: '2026-10-26', start: 870 })
    expect(wasOf(undefined)).toBeNull()
  })

  it('leaves the own time out only with its own specialist, or anyone', () => {
    const move = { date: '2026-10-26', start: 870, current: 'ayna' }
    expect(isOwnTime(move, 'ayna', '2026-10-26', 870)).toBe(true)
    expect(isOwnTime(move, 'any', '2026-10-26', 870)).toBe(true)
    expect(isOwnTime(move, 'maral', '2026-10-26', 870)).toBe(false)
    expect(isOwnTime(move, 'ayna', '2026-10-26', 900)).toBe(false)
  })

  it('reads the api’s refusal: can’t move online, or the chosen specialist no longer does the services', () => {
    expect(moveRefusal(new ApiError(409, 'not_bookable'), 'ayna')).toBe('not_bookable')
    expect(moveRefusal(new ApiError(404, 'not_found', { staffId: 'ayna' }), 'ayna')).toBe('staff_gone')
    // another specialist's, or the booking's own, not found: not this rule
    expect(moveRefusal(new ApiError(404, 'not_found', { staffId: 'maral' }), 'ayna')).toBeNull()
    expect(moveRefusal(new ApiError(404, 'not_found'), 'ayna')).toBeNull()
    expect(moveRefusal(new ApiError(404, 'not_found', { staffId: 'any' }), 'any')).toBeNull()
    expect(moveRefusal(new ApiError(409, 'slot_taken'), 'ayna')).toBeNull()
    expect(moveRefusal(new TypeError('offline'), 'ayna')).toBeNull()
  })
})
