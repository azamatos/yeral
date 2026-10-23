import { serviceErrors } from '@yeral/domain/services'
import { describe, expect, it } from 'vitest'
import { CATEGORIES } from './categories'

describe('starter services (F-098)', () => {
  it('fit the menu, so the wizard can create every one as it is offered', () => {
    for (const c of CATEGORIES)
      for (const s of c.starterServices)
        expect(
          serviceErrors({ durationMin: s.durationMin, priceType: s.price.type, priceAmount: s.price.amount, bufferMin: null }),
          `${c.id}/${s.id}`,
        ).toEqual({})
  })

  it('have ids unique in their category, and each group one name', () => {
    for (const c of CATEGORIES) {
      const ids = c.starterServices.map((s) => s.id)
      expect(new Set(ids).size, c.id).toBe(ids.length)
      expect(
        ids.every((id) => /^[a-z0-9]+(-[a-z0-9]+)*$/.test(id)),
        c.id,
      ).toBe(true)
      const names = new Map(c.starterServices.map((s) => [s.group.id, JSON.stringify(s.group.name)]))
      for (const s of c.starterServices) expect(JSON.stringify(s.group.name), `${c.id}/${s.group.id}`).toBe(names.get(s.group.id))
    }
  })
})
