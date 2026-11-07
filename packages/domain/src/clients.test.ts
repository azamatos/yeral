import { describe, expect, it } from 'vitest'
import {
  clientSegments,
  clientStats,
  isOnlineBlocked,
  reachesNoShowLimit,
  segmentsOf,
  TRUSTED_MIN_VISITS,
  TRUSTED_STRIKE_DAYS,
  trustedStanding,
  type ClientVisit,
} from './clients'

const TODAY = '2026-10-14'
const visit = (date: string, price = 80, status: ClientVisit['status'] = 'completed'): ClientVisit => ({ date, price, status })

describe('client stats', () => {
  it('counts completed visits, their sum and average, and no-shows', () => {
    const stats = clientStats([
      visit('2026-09-01', 80),
      visit('2026-10-01', 150),
      visit('2026-10-10', 60, 'noshow'),
      visit('2026-10-20', 80, 'confirmed'),
    ])
    expect(stats).toEqual({ visits: 2, total: 230, avgCheck: 115, firstVisit: '2026-09-01', lastVisit: '2026-10-01', noShows: 1 })
  })

  it('has no average without visits', () => {
    expect(clientStats([]).avgCheck).toBeNull()
  })
})

describe('client segments (filter chips)', () => {
  it('regular: three visits in six months', () => {
    expect(clientSegments([visit('2026-06-01'), visit('2026-08-01'), visit('2026-10-01')], 0, TODAY)).toContain('regular')
    expect(clientSegments([visit('2026-01-01'), visit('2026-08-01'), visit('2026-10-01')], 0, TODAY)).not.toContain('regular')
  })

  it('new: first visit within 30 days', () => {
    expect(clientSegments([visit('2026-09-20')], 0, TODAY)).toEqual(['new'])
  })

  it('lapsed: no visit for 60 days', () => {
    expect(clientSegments([visit('2026-08-15')], 0, TODAY)).toEqual(['lapsed'])
    expect(clientSegments([visit('2026-08-16')], 0, TODAY)).toEqual([])
  })

  it('flagged: has complaints', () => {
    expect(clientSegments([], 1, TODAY)).toEqual(['flagged'])
  })

  it('from the totals the api counts: none before a first visit', () => {
    expect(segmentsOf({ recentVisits: 0, firstVisit: null, lastVisit: null, complaints: 0 }, TODAY)).toEqual([])
    expect(segmentsOf({ recentVisits: 3, firstVisit: '2026-09-20', lastVisit: '2026-10-01', complaints: 2 }, TODAY)).toEqual([
      'regular',
      'new',
      'flagged',
    ])
  })
})

describe('online booking block (book Q-127)', () => {
  it('by hand, or while the no-shows since the last reset reach the limit; 0 turns the count off', () => {
    expect(isOnlineBlocked({ onlineBlocked: false, noShowsSinceReset: 2 }, { blockAfterNoShows: 2 })).toBe(true)
    expect(isOnlineBlocked({ onlineBlocked: false, noShowsSinceReset: 1 }, { blockAfterNoShows: 2 })).toBe(false)
    expect(isOnlineBlocked({ onlineBlocked: false, noShowsSinceReset: 5 }, { blockAfterNoShows: 0 })).toBe(false)
    expect(isOnlineBlocked({ onlineBlocked: true, noShowsSinceReset: 0 }, { blockAfterNoShows: 0 })).toBe(true)
  })

  it('the limit: reached at N, never with 0', () => {
    expect(reachesNoShowLimit(1, { blockAfterNoShows: 1 })).toBe(true)
    expect(reachesNoShowLimit(4, { blockAfterNoShows: 5 })).toBe(false)
    expect(reachesNoShowLimit(9, { blockAfterNoShows: 0 })).toBe(false)
  })
})

describe('trusted client (design v0.7 · D)', () => {
  const facts = (visits: number, visitsSince: number, lastStrike: string | null) => ({ visits, visitsSince, lastStrike })

  it.each([
    ['five visits, no strike', facts(5, 5, null), { state: 'trusted', visits: 5, pausedSince: null }],
    ['four visits, no strike: almost there', facts(4, 4, null), { state: 'almost', visits: 4, pausedSince: null }],
    [
      'a strike within 12 months pauses it, the count starts again',
      facts(9, 2, '2026-09-02'),
      { state: 'paused', visits: 2, pausedSince: '2026-09-02' },
    ],
    ['five visits after the strike bring it back', facts(9, 5, '2026-09-02'), { state: 'trusted', visits: 5, pausedSince: null }],
    ['a strike a year ago is forgotten: every visit counts', facts(6, 1, '2025-10-14'), { state: 'trusted', visits: 6, pausedSince: null }],
    ['a strike one day short of a year still counts', facts(6, 1, '2025-10-15'), { state: 'paused', visits: 1, pausedSince: '2025-10-15' }],
    ['nothing yet', facts(0, 0, null), { state: 'almost', visits: 0, pausedSince: null }],
  ] as const)('%s', (_, f, standing) => {
    expect(trustedStanding(f, TODAY)).toEqual(standing)
  })

  it('the constants the business reads: 5 visits, 12 months', () => {
    expect(TRUSTED_MIN_VISITS).toBe(5)
    expect(TRUSTED_STRIKE_DAYS).toBe(365)
  })
})
