import { describe, expect, it } from 'vitest'
import { daySummary, priceTotal } from './pricing'
import { DEFAULT_RULES, rulesErrors } from './rules'

describe('priceTotal', () => {
  it('adds fixed prices', () => {
    expect(
      priceTotal([
        { type: 'fixed', amount: 80 },
        { type: 'fixed', amount: 60 },
      ]),
    ).toEqual({ type: 'fixed', amount: 140 })
  })

  it('becomes a "from" total when any service is "from"', () => {
    expect(
      priceTotal([
        { type: 'fixed', amount: 80 },
        { type: 'from', amount: 250 },
      ]),
    ).toEqual({ type: 'from', amount: 330 })
  })

  it('free services add nothing; all free stays free, all hidden stays hidden', () => {
    expect(
      priceTotal([
        { type: 'free', amount: 0 },
        { type: 'fixed', amount: 50 },
      ]),
    ).toEqual({ type: 'fixed', amount: 50 })
    expect(priceTotal([{ type: 'free', amount: 0 }])).toEqual({ type: 'free', amount: 0 })
    expect(priceTotal([{ type: 'hidden', amount: 0 }])).toEqual({ type: 'hidden', amount: 0 })
  })

  it('never adds a hidden price into a shown total: the rest becomes a "from" total, or the total stays hidden', () => {
    expect(
      priceTotal([
        { type: 'fixed', amount: 40 },
        { type: 'hidden', amount: 100 },
      ]),
    ).toEqual({ type: 'from', amount: 40 })
    expect(
      priceTotal([
        { type: 'free', amount: 0 },
        { type: 'hidden', amount: 0 },
      ]),
    ).toEqual({ type: 'hidden', amount: 0 })
    expect(priceTotal([{ type: 'hidden', amount: 120 }])).toEqual({ type: 'hidden', amount: 0 })
  })
})

describe('daySummary (calendar header)', () => {
  it('counts every booking but cancelled ones; planned revenue leaves out no-shows', () => {
    const day = daySummary([
      { status: 'confirmed', price: 80 },
      { status: 'pending', price: 150 },
      { status: 'completed', price: 60 },
      { status: 'noshow', price: 90 },
      { status: 'cancelled', price: 200 },
    ])
    expect(day).toEqual({ count: 4, requests: 1, plannedRevenue: 290 })
  })
})

describe('booking rules', () => {
  it('the defaults are valid', () => {
    expect(rulesErrors(DEFAULT_RULES)).toEqual({})
  })

  it('accepts only the offered options, and a custom buffer up to 120', () => {
    expect(rulesErrors({ ...DEFAULT_RULES, holdMinutes: 45, bufferMinutes: 37 })).toEqual({ holdMinutes: 'invalid' })
    expect(rulesErrors({ ...DEFAULT_RULES, bufferMinutes: 121, cancelWindowMinutes: null })).toEqual({ bufferMinutes: 'invalid' })
  })
})
