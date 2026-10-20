/** The engine's transaction: a time lost to another booking or to the hours comes back with the nearest free times. */
import { describe, expect, it } from 'vitest'
import { testApp } from '../../../test/app'
import { testDatabase } from '../../../test/db'
import { ApiError } from '../../http/errors'
import { OutsideHours } from '../availability/context'
import { inTransaction } from './engine'

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
