import { epochOf } from '@yeral/domain/time'
import { describe, expect, it } from 'vitest'
import { aheadOf, notesInOrder, reportUntil, type ClientBooking, type ClientNote } from './card'

const booking = (status: ClientBooking['status']) => ({ status }) as ClientBooking
const note = (id: string, alert: boolean) => ({ id, alert }) as ClientNote

describe('aheadOf (book Q-208)', () => {
  it('counts the visits and the requests apart', () => {
    expect(aheadOf([booking('confirmed'), booking('pending'), booking('confirmed')])).toEqual({ bookings: 2, requests: 1 })
    expect(aheadOf([])).toEqual({ bookings: 0, requests: 0 })
  })
})

describe('notesInOrder', () => {
  it('puts the alerts first and keeps each group in order', () => {
    const order = notesInOrder([note('a', false), note('b', true), note('c', false), note('d', true)])
    expect(order.map((n) => n.id)).toEqual(['b', 'd', 'a', 'c'])
  })
})

describe('reportUntil (book Q-207)', () => {
  it('is seven days after the report, in the business day', () => {
    expect(reportUntil(epochOf('2026-10-14', 600))).toBe('2026-10-21')
  })
})
