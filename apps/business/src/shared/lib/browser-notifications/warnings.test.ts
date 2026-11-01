import { describe, expect, it } from 'vitest'
import { nextWarningIn, warningsDue, type Warnable } from './warnings'

const now = 1_800_000_000_000
const minute = 60_000
const request = (code: string, warnIn: number | null, holdIn = 10, canAnswer = true): Warnable => ({
  code,
  warnAt: warnIn === null ? null : now + warnIn * minute,
  holdUntil: now + holdIn * minute,
  canAnswer,
})

describe('warningsDue', () => {
  it.each<[string, Warnable, boolean]>([
    ['its warning time has come and the hold still runs', request('A1', -1, 4), true],
    ['it was already inside its last five minutes when the page opened', request('A2', -4, 1), true],
    ['its warning time is still ahead', request('A3', 2, 7), false],
    ['it has run out already', request('A4', -6, -1), false],
    ['the answer time was too short for a warning', request('A5', null, 3), false],
    ['this person may not answer it', request('A6', -1, 4, false), false],
  ])('%s → %s', (_, r, due) => {
    expect(warningsDue([r], now, new Set()).map((x) => x.code)).toEqual(due ? [r.code] : [])
  })

  it('gives each warning once: not again for a code already heard, and once for a code listed twice', () => {
    const r = request('B1', -1, 4)
    expect(warningsDue([r, r], now, new Set())).toEqual([r])
    expect(warningsDue([r], now, new Set(['B1']))).toEqual([])
  })
})

describe('nextWarningIn', () => {
  it('waits for the nearest warning still ahead among the ones this person may answer and has not heard', () => {
    const items = [request('C1', 3), request('C2', 1), request('C3', 2, 10, false), request('C4', -1), request('C5', null)]
    expect(nextWarningIn(items, now, new Set())).toBe(1 * minute)
    expect(nextWarningIn(items, now, new Set(['C2']))).toBe(3 * minute)
  })

  it('has nothing to wait for when every warning is past, heard or not this person’s', () => {
    expect(nextWarningIn([request('D1', -1), request('D2', 2, 10, false), request('D3', null)], now, new Set())).toBeNull()
    expect(nextWarningIn([], now, new Set())).toBeNull()
  })
})
