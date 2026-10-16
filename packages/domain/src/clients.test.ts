import { describe, expect, it } from 'vitest'
import { clientSegments, clientStats, isOnlineBlocked, type ClientVisit } from './clients'

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
})

describe('online booking block', () => {
  it('blocks after N no-shows, or by hand; 0 turns the rule off', () => {
    expect(isOnlineBlocked({ onlineBlocked: false, noShows: 2 }, { blockAfterNoShows: 2 })).toBe(true)
    expect(isOnlineBlocked({ onlineBlocked: false, noShows: 1 }, { blockAfterNoShows: 2 })).toBe(false)
    expect(isOnlineBlocked({ onlineBlocked: false, noShows: 5 }, { blockAfterNoShows: 0 })).toBe(false)
    expect(isOnlineBlocked({ onlineBlocked: true, noShows: 0 }, { blockAfterNoShows: 0 })).toBe(true)
  })
})
