import { describe, expect, it } from 'vitest'
import { teamLookup, whoDoes } from './rows'

type State = 'pending' | 'declined' | 'cancelled' | 'expired'
const person = (id: string, status: 'active' | 'invited' | 'removed', invite: State | null = null) => ({
  id,
  name: id,
  status,
  photo: null,
  invite: invite && { id: `i-${id}`, state: invite, sentAt: 1, expiresAt: 2 },
})

describe('who does a service', () => {
  it('names the people on the team and counts the invited apart', () => {
    const lookup = teamLookup([
      person('aya', 'active'),
      person('maral', 'active'),
      person('gulnar', 'invited', 'pending'),
      person('jeren', 'removed'),
    ])
    expect(whoDoes(['aya', 'gulnar', 'jeren'], lookup)).toEqual({ people: [{ ...person('aya', 'active'), invited: false }], invited: 1 })
    expect(whoDoes([], lookup)).toEqual({ people: [], invited: 0 })
  })

  it('leaves out an invite declined, cancelled or run out, and an id the team no longer has', () => {
    const lookup = teamLookup([person('a', 'invited', 'declined'), person('b', 'invited', 'cancelled'), person('c', 'invited', 'expired')])
    expect(whoDoes(['a', 'b', 'c', 'gone'], lookup)).toEqual({ people: [], invited: 0 })
  })

  it("counts a draft's person whose invite goes out at the finish", () => {
    expect(whoDoes(['d'], teamLookup([person('d', 'invited')]))).toEqual({ people: [], invited: 1 })
  })
})
