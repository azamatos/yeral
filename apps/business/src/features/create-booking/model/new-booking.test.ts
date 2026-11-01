import { epochOf } from '@yeral/domain/time'
import { describe, expect, it } from 'vitest'
import { currentStep, eligibleFor, missingOf, servicesOf, staffOf, totalOf, type MenuService } from './new-booking'

const service = (id: string, staffIds: string[], patch: Partial<MenuService> = {}): MenuService => ({
  id,
  groupId: 'g',
  name: { en: id },
  description: null,
  durationMin: 60,
  priceType: 'fixed',
  priceAmount: 100,
  bufferMin: null,
  online: true,
  staffIds,
  futureBookings: 0,
  ...patch,
})
const cut = service('cut', ['a', 'b'])
const colour = service('colour', ['b'])
const nails = service('nails', ['c'])
const people = ['a', 'b', 'c'].map((staffId) => ({ staffId, name: staffId }))

describe('the new booking', () => {
  it('keeps the services in the order they were picked', () => {
    const menu = { groups: [{ id: 'g', name: {} as never, order: 0, services: [cut, colour] }] } as never
    expect(servicesOf(menu, ['colour', 'cut', 'gone']).map((s) => s.id)).toEqual(['colour', 'cut'])
  })

  it('offers only who does all the services', () => {
    expect(eligibleFor(people, [cut]).map((p) => p.staffId)).toEqual(['a', 'b'])
    expect(eligibleFor(people, [cut, colour]).map((p) => p.staffId)).toEqual(['b'])
    expect(eligibleFor(people, [colour, nails])).toEqual([])
  })

  it('keeps the specialist picked while they can, and falls to the only one who can', () => {
    expect(staffOf('a', people, [])).toBe('a')
    expect(staffOf('a', people, [cut])).toBe('a')
    expect(staffOf('a', people, [cut, colour])).toBe('b')
    expect(staffOf(null, people, [cut])).toBeNull()
    expect(staffOf('a', people, [colour, nails])).toBeNull()
  })

  it('sums the length and the price', () => {
    expect(totalOf([cut, colour])).toEqual({ minutes: 120, price: { type: 'fixed', amount: 200 } })
    expect(totalOf([cut, service('x', [], { priceType: 'from', priceAmount: 50 })]).price).toEqual({ type: 'from', amount: 150 })
    expect(totalOf([service('x', [], { priceType: 'free', priceAmount: 0 })]).price.type).toBe('free')
    expect(totalOf([cut, service('x', [], { priceType: 'free', priceAmount: 40 })]).price).toEqual({ type: 'fixed', amount: 100 })
  })

  it('finds the quarter that holds now', () => {
    expect(currentStep(epochOf('2026-10-14', 680))).toBe(675)
    expect(currentStep(epochOf('2026-10-14', 675))).toBe(675)
  })

  it('says what is still needed', () => {
    expect(missingOf({ hasClient: false, services: 0, staffId: null, timeOk: false })).toEqual(['client', 'service', 'time'])
    expect(missingOf({ hasClient: true, services: 1, staffId: null, timeOk: false })).toEqual(['specialist', 'time'])
    expect(missingOf({ hasClient: true, services: 1, staffId: 'a', timeOk: true })).toEqual([])
  })
})
