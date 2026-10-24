/** The engine's transaction: a time lost to another booking or to the hours comes back with the nearest free times. */
import { epochOf } from '@yeral/domain/time'
import { describe, expect, it } from 'vitest'
import { testApp } from '../../../test/app'
import { testDatabase } from '../../../test/db'
import { ApiError } from '../../http/errors'
import { OutsideHours } from '../availability/context'
import { affectedDetails, inTransaction } from './engine'
import type { BookingRow, ItemRow } from './repo'

describe('affectedDetails', () => {
  const now = epochOf('2026-11-02', 600)
  const booking = (id: string, start: number, status: 'pending' | 'confirmed', holdUntil: number | null = null) =>
    ({
      id,
      code: `1000${id}`,
      date: '2026-11-03',
      start,
      end: start + 60,
      status,
      holdUntil: holdUntil === null ? null : new Date(holdUntil),
      cancelledBy: null,
      complaintType: null,
      rescheduleOf: null,
      clientName: 'Leýli',
    }) as BookingRow
  const item = (bookingId: string, service: string, staffId: string, staffName: string) =>
    ({
      bookingId,
      serviceId: `svc-${service}`,
      serviceName: { en: service, ru: `${service} (ru)` },
      staffId,
      staffName,
      start: 600,
      end: 660,
    }) as ItemRow

  it('splits bookings and waiting requests, pairs each service with who does it, in the reader’s language', () => {
    const held = epochOf('2026-11-02', 640)
    const rows = [booking('1', 600, 'confirmed'), booking('2', 720, 'pending', held), booking('3', 840, 'pending')]
    const items = [
      item('1', 'Haircut', 's-jeren', 'Jeren'),
      item('1', 'Colouring', 's-ayna', 'Aýna'),
      item('2', 'Manicure', 's-maral', 'Maral'),
      item('3', 'Manicure', 's-maral', 'Maral'),
    ]
    const details = affectedDetails(rows, items, { lang: 'ru', now })
    expect(details).toMatchObject({ count: 3, counts: { bookings: 1, requests: 2 } })
    expect(details.bookings[0]).toMatchObject({
      status: 'confirmed',
      holdUntil: null,
      items: [
        { service: 'Haircut (ru)', staff: 'Jeren' },
        { service: 'Colouring (ru)', staff: 'Aýna' },
      ],
      staff: ['Jeren', 'Aýna'],
    })
    expect(details.bookings[1]).toMatchObject({ status: 'pending', holdUntil: held })
    // a request without a hold time runs out at its start
    expect(details.bookings[2]).toMatchObject({ status: 'pending', holdUntil: epochOf('2026-11-03', 840) })
  })
})

describe('inTransaction', () => {
  it('a time the hours no longer hold is slot_taken with the nearest free times; other refusals pass as they are', async () => {
    const { db } = await testDatabase()
    const t = testApp(db)
    const nearest = [{ date: '2026-10-16', start: 600, end: 660 }]
    const times = () => Promise.resolve(nearest)
    await expect(inTransaction(t.deps, () => Promise.reject(new OutsideHours()), times)).rejects.toMatchObject({
      code: 'slot_taken',
      details: { alternatives: nearest },
    })
    // a slot_taken that says no other times, on purpose, keeps its answer
    await expect(
      inTransaction(t.deps, () => Promise.reject(new ApiError('slot_taken', { alternatives: [] })), times),
    ).rejects.toMatchObject({ details: { alternatives: [] } })
    await expect(inTransaction(t.deps, () => Promise.reject(new ApiError('not_found')), times)).rejects.toMatchObject({
      code: 'not_found',
    })
  })
})
