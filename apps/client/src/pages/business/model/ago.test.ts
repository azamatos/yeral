import { epochOf } from '@yeral/domain/time'
import { describe, expect, it } from 'vitest'
import { ago } from './ago'

const now = epochOf('2026-10-25', 600)
const on = (date: string, min = 720) => epochOf(date, min)

describe('how long ago a review was written', () => {
  it('says today and yesterday by the calendar day, not 24 hours', () => {
    expect(ago(on('2026-10-25', 30), now)).toEqual({ unit: 'today', count: 0 })
    expect(ago(on('2026-10-24', 1430), now)).toEqual({ unit: 'yesterday', count: 1 })
  })

  it('counts days, then weeks, months and years, rounded down', () => {
    expect(ago(on('2026-10-23'), now)).toEqual({ unit: 'days', count: 2 })
    expect(ago(on('2026-10-18'), now)).toEqual({ unit: 'weeks', count: 1 })
    expect(ago(on('2026-10-04'), now)).toEqual({ unit: 'weeks', count: 3 })
    expect(ago(on('2026-09-25'), now)).toEqual({ unit: 'months', count: 1 })
    expect(ago(on('2025-10-20'), now)).toEqual({ unit: 'years', count: 1 })
  })

  it('reads a time ahead (a clock a little off) as today', () => {
    expect(ago(now + 60_000, now)).toEqual({ unit: 'today', count: 0 })
  })
})
