import { describe, expect, it } from 'vitest'
import { drawerSteps, offersOf } from './drawer'

const sent = { event: 'sent' as const, at: 1 }
const confirmed = { event: 'confirmed' as const, at: 2 }
const base = { timeline: [sent], status: 'pending' as const, reschedule: null, offerTakenBy: null, cancelledBy: null }

describe("the drawer's history", () => {
  it('adds the wait and the visit while a request is ahead', () => {
    expect(drawerSteps(base).map((s) => [s.kind, s.tone])).toEqual([
      ['event', 'accent'],
      ['waiting', 'current'],
      ['visit', 'todo'],
    ])
  })

  it('marks the move still waiting as now, before the visit', () => {
    const steps = drawerSteps({
      ...base,
      status: 'confirmed',
      timeline: [sent, confirmed, { event: 'reschedule_requested', at: 3 }],
      reschedule: { date: '2026-10-28', start: 600, end: 660, holdUntil: null },
    })
    expect(steps.map((s) => s.tone)).toEqual(['accent', 'accent', 'current', 'todo'])
  })

  it('ends a declined request with the booking an offered time became', () => {
    const steps = drawerSteps({
      ...base,
      status: 'cancelled',
      cancelledBy: 'business',
      timeline: [sent, { event: 'declined', at: 3 }],
      offerTakenBy: 'YR-48231',
    })
    expect(steps.map((s) => s.tone)).toEqual(['accent', 'slate', 'accent'])
    expect(steps.at(-1)).toEqual({ kind: 'took', code: 'YR-48231', request: false, tone: 'accent' })
  })

  it('says a no-show and a completed visit in their tones', () => {
    expect(drawerSteps({ ...base, status: 'noshow', timeline: [sent, confirmed, { event: 'noshow', at: 4 }] }).at(-1)?.tone).toBe('danger')
    expect(drawerSteps({ ...base, status: 'completed', timeline: [sent, confirmed, { event: 'completed', at: 4 }] }).at(-1)?.tone).toBe(
      'success',
    )
  })
})

describe('the offered times', () => {
  const time = { date: '2026-10-28', start: 600, end: 660, staff: null, state: 'free' as const }
  const none = { decline: null, cancelOffers: [], expiredAlternatives: [] }

  it("takes a decline's, the business's cancel's or an expiry's", () => {
    expect(offersOf({ ...none, decline: { reason: 'slot_busy', text: null, alternatives: [time] } })?.source).toBe('decline')
    expect(offersOf({ ...none, cancelOffers: [time] })?.source).toBe('cancel')
    expect(offersOf({ ...none, expiredAlternatives: [time] })?.source).toBe('expired')
  })

  it('has none once they are gone', () => {
    expect(offersOf({ ...none, decline: { reason: 'slot_busy', text: null, alternatives: [] } })).toBeNull()
    expect(offersOf(none)).toBeNull()
  })
})
