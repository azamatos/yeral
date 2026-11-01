import { epochOf } from '@yeral/domain/time'
import { describe, expect, it } from 'vitest'
import { canMoveBooking } from './can-move'

const now = epochOf('2026-10-14', 690)
const booking = { status: 'confirmed', date: '2026-10-14', start: 720, move: null } as const

describe('canMoveBooking', () => {
  it('takes a confirmed booking ahead, from this minute on', () => {
    expect(canMoveBooking(booking, now)).toBe(true)
    expect(canMoveBooking({ ...booking, start: 690 }, now)).toBe(true)
    expect(canMoveBooking({ ...booking, date: '2026-10-15', start: 540 }, now)).toBe(true)
  })

  it('refuses one that has started', () => {
    expect(canMoveBooking({ ...booking, start: 689 }, now)).toBe(false)
    expect(canMoveBooking({ ...booking, date: '2026-10-13', start: 900 }, now)).toBe(false)
  })

  it('refuses a request, and one whose client asked to move it', () => {
    expect(canMoveBooking({ ...booking, status: 'pending' }, now)).toBe(false)
    const move = { code: 'YR-49001', date: '2026-10-15', start: 600, end: 660, holdUntil: null }
    expect(canMoveBooking({ ...booking, move }, now)).toBe(false)
  })
})
