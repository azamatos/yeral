import { describe, expect, it } from 'vitest'
import { addMonths, ANY_TIME, dateOf, isAnyTime, pickDate, whenAddress, whenOf } from './when'

const TODAY = '2026-11-07'

describe('whenAddress', () => {
  it.each([
    [ANY_TIME, {}],
    [{ day: 'today' } as const, { day: 'today' }],
    [{ day: 'tomorrow', tod: 'evening' } as const, { day: 'tomorrow', tod: 'evening' }],
    [{ day: 'week' } as const, { day: 'week' }],
    [{ day: { date: '2026-11-08' } }, { day: 'tomorrow' }],
    [{ day: { date: '2026-11-20' }, tod: 'morning' } as const, { date: '2026-11-20', tod: 'morning' }],
  ])('%j reads as %j', (when, address) => {
    expect(whenAddress(when, TODAY)).toEqual(expect.objectContaining(address))
    expect(whenAddress(when, TODAY).date).toBe((address as { date?: string }).date)
  })

  it('knows nothing chosen by value, not by identity', () => {
    expect(isAnyTime({ day: 'any' })).toBe(true)
    expect(isAnyTime({ day: 'any', tod: 'morning' })).toBe(false)
    expect(isAnyTime({ day: 'today' })).toBe(false)
  })

  it('round-trips through the address', () => {
    const when = { day: { date: '2026-11-20' }, tod: 'afternoon' } as const
    expect(whenOf(whenAddress(when, TODAY))).toEqual(when)
    expect(whenOf({})).toEqual(ANY_TIME)
  })
})

describe('the calendar', () => {
  it('shows the quick choice’s day and lights the chips for a day picked', () => {
    expect(dateOf({ day: 'tomorrow' }, TODAY)).toBe('2026-11-08')
    expect(dateOf(ANY_TIME, TODAY)).toBeNull()
    expect(pickDate(ANY_TIME, TODAY, TODAY)).toEqual({ day: 'today' })
    expect(pickDate({ day: 'week', tod: 'evening' }, '2026-11-21', TODAY)).toEqual({ day: { date: '2026-11-21' }, tod: 'evening' })
  })

  it('turns the months over the year', () => {
    expect(addMonths('2026-11', 1)).toBe('2026-12')
    expect(addMonths('2026-11', 2)).toBe('2027-01')
    expect(addMonths('2026-01', -1)).toBe('2025-12')
  })
})
