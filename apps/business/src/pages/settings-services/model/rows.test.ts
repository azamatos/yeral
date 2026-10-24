import { describe, expect, it } from 'vitest'
import { whoDoes } from './rows'

const person = (id: string, status: 'active' | 'invited' | 'removed') => ({ id, name: id, status, photo: null })

describe('who does a service', () => {
  it('names the people on the team and counts the invited apart', () => {
    const team = [person('aya', 'active'), person('maral', 'active'), person('gulnar', 'invited'), person('jeren', 'removed')]
    expect(whoDoes(['aya', 'gulnar', 'jeren'], team)).toEqual({ people: [person('aya', 'active')], invited: 1 })
    expect(whoDoes([], team)).toEqual({ people: [], invited: 0 })
  })

  it('leaves out an id the team no longer has', () => {
    expect(whoDoes(['gone'], [person('aya', 'active')])).toEqual({ people: [], invited: 0 })
  })
})
