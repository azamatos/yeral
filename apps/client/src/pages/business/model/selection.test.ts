import { describe, expect, it } from 'vitest'
import { parseServiceIds, pickedServices, selectionTotal, serviceIdsParam, toggleService } from './selection'

const service = (id: string, durationMin: number, price: { type: 'fixed' | 'from' | 'free' | 'hidden'; amount: number }) => ({
  id,
  name: id,
  description: null,
  durationMin,
  price,
  staffIds: [],
})

const detail = {
  serviceGroups: [
    {
      id: 'g1',
      name: 'Hair',
      services: [service('cut', 60, { type: 'fixed', amount: 80 }), service('bride', 120, { type: 'hidden', amount: 400 })],
    },
    {
      id: 'g2',
      name: 'Nails',
      services: [service('mani', 60, { type: 'fixed', amount: 70 }), service('colour', 120, { type: 'from', amount: 250 })],
    },
  ],
}

describe('the picked services in the address', () => {
  it('reads a comma list, once each, without empty parts', () => {
    expect(parseServiceIds(undefined)).toEqual([])
    expect(parseServiceIds('')).toEqual([])
    expect(parseServiceIds('cut,mani,,cut, ')).toEqual(['cut', 'mani'])
  })

  it('writes nothing for no pick', () => {
    expect(serviceIdsParam([])).toBeUndefined()
    expect(serviceIdsParam(['cut', 'mani'])).toBe('cut,mani')
  })

  it('toggles a service on and off, keeping the order picked', () => {
    expect(toggleService(['cut'], 'mani')).toEqual(['cut', 'mani'])
    expect(toggleService(['cut', 'mani'], 'cut')).toEqual(['mani'])
  })

  it('keeps only services the page has, in the order picked', () => {
    expect(pickedServices(detail, ['mani', 'gone', 'cut']).map((s) => s.id)).toEqual(['mani', 'cut'])
  })
})

describe('the summary total', () => {
  it('adds the minutes and the prices', () => {
    expect(selectionTotal(pickedServices(detail, ['cut', 'mani']))).toEqual({ minutes: 120, price: { type: 'fixed', amount: 150 } })
  })

  it('is «from» with a «from» price or one kept for the place', () => {
    expect(selectionTotal(pickedServices(detail, ['cut', 'colour'])).price).toEqual({ type: 'from', amount: 330 })
    expect(selectionTotal(pickedServices(detail, ['bride', 'mani'])).price).toEqual({ type: 'from', amount: 70 })
  })

  it('stays at the place when only such a price is picked', () => {
    expect(selectionTotal(pickedServices(detail, ['bride']))).toEqual({ minutes: 120, price: { type: 'hidden', amount: 0 } })
  })
})
